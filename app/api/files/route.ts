import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

import { verifyJwt } from '@/lib/jwt'
import { checkFilePermission, logFileOperation } from '@/lib/file-permission-checker'
import { getCache, setCache, clearCacheForPath } from '@/lib/file-cache-manager'

const execAsync = promisify(exec)

// 强制动态渲染，因为使用了 request.headers
export const dynamic = 'force-dynamic'

// 获取用户家目录
async function getUserHomeDir(username: string): Promise<string> {
  const { UserHomeManager } = await import('@/lib/user-home-manager')
  return UserHomeManager.getUserHome(username)
}

// 优化的软链接解析 - 限制深度和缓存
const symlinkCache = new Map<string, string>()
async function resolveSymlinkRecursive(p: string, maxDepth = 3): Promise<string> {
  // 检查缓存
  if (symlinkCache.has(p)) {
    return symlinkCache.get(p)!
  }
  
  let current = p
  let depth = 0
  while (depth < maxDepth) {
    try {
      const stats = await fs.lstat(current)
      if (!stats.isSymbolicLink()) break
      const linkTarget = await fs.readlink(current)
      current = path.isAbsolute(linkTarget)
        ? linkTarget
        : path.resolve(path.dirname(current), linkTarget)
      depth++
    } catch (e) {
      console.error('[files] resolveSymlinkRecursive error:', e, 'at', current)
      break
    }
  }
  
  // 缓存结果
  symlinkCache.set(p, current)
  return current
}

// 优化的文件信息获取 - 减少软链接解析
async function getFileInfo(filePath: string, skipSymlinkResolve = false) {
  try {
    const stats = await fs.lstat(filePath)
    const isSymlink = stats.isSymbolicLink()
    
    // 如果是软链接且不需要解析，直接返回基本信息
    if (isSymlink && skipSymlinkResolve) {
      return {
        name: path.basename(filePath),
        path: filePath,
        size: null,
        isDirectory: false,
        isSymlink,
        modified: stats.mtime,
        permissions: stats.mode.toString(8),
        owner: stats.uid,
        group: stats.gid
      }
    }
    
    let realPath = filePath
    if (isSymlink) {
      realPath = await resolveSymlinkRecursive(filePath)
      try {
        const realStats = await fs.stat(realPath)
        return {
          name: path.basename(filePath),
          path: filePath,
          realPath,
          size: realStats.isDirectory() ? null : realStats.size,
          isDirectory: realStats.isDirectory(),
          isSymlink,
          modified: realStats.mtime,
          permissions: realStats.mode.toString(8),
          owner: realStats.uid,
          group: realStats.gid
        }
      } catch (e) {
        console.error('[files] getFileInfo symlink target error:', e, 'for', realPath)
        return {
          name: path.basename(filePath),
          path: filePath,
          realPath,
          size: null,
          isDirectory: false,
          isSymlink,
          modified: stats.mtime,
          permissions: stats.mode.toString(8),
          owner: stats.uid,
          group: stats.gid,
          error: '软链接目标不存在'
        }
      }
    }
    
    // 普通文件/目录
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.isDirectory() ? null : stats.size,
      isDirectory: stats.isDirectory(),
      isSymlink: false,
      modified: stats.mtime,
      permissions: stats.mode.toString(8),
      owner: stats.uid,
      group: stats.gid
    }
  } catch (error) {
    console.error('[files] getFileInfo error:', error, 'for', filePath)
    return null
  }
}

// 优化的目录内容获取
async function getDirectoryContentsWithFallback(dirPath: string, username?: string, options?: { showHidden?: boolean; filter?: string }): Promise<{ files: any[], realDir: string, error?: string }> {
  try {
    
    // 检查缓存
    const cached = getCache(dirPath, username, options)
    if (cached) {
      return cached
    }
    
    // 递归解析软链接
    let realDir = await resolveSymlinkRecursive(dirPath)
    let entries: any[] = []
    try {
      entries = await fs.readdir(realDir, { withFileTypes: true })
    } catch (e) {
      console.error('[files] readdir error:', e, 'for', realDir)
      entries = []
    }
    
    // 如果目录为空且 dirPath 形如 my-jobs/job_123，尝试数据库兜底
    if (entries.length === 0 && username && /my-jobs\/job_(\d+)$/.test(dirPath)) {
      const jobId = dirPath.match(/my-jobs\/job_(\d+)$/)?.[1]
      if (jobId) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabaseUrl = process.env.SUPABASE_URL || ''
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
          const supabase = createClient(supabaseUrl, supabaseKey)
          const { data: dbJobs, error: dbError } = await supabase
            .from('jobs')
            .select('script')
            .eq('job_id', jobId)
            .eq('user_id', username)
            .limit(1)
          if (dbError) {
            console.error('[files][fallback] 查询数据库失败:', dbError)
          }
          if (dbJobs && dbJobs.length > 0) {
            const scriptPath = dbJobs[0].script
            if (scriptPath && scriptPath.startsWith('/home/')) {
              // 从脚本路径提取作业目录，支持多种脚本文件名
              let realJobDir;
              if (scriptPath.endsWith('/job.sh')) {
                realJobDir = scriptPath.replace(/\/job\.sh$/, '');
              } else if (scriptPath.endsWith('/vnc_job.sh')) {
                realJobDir = scriptPath.replace(/\/vnc_job\.sh$/, '');
              } else {
                // 通用处理：取脚本文件的父目录
                realJobDir = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
              }
              try {
                realDir = realJobDir
                entries = await fs.readdir(realDir, { withFileTypes: true })
              } catch (e2) {
                console.error('[files][fallback] 真实目录兜底失败:', e2, realDir)
                return { files: [], realDir, error: '真实目录兜底失败: ' + (e2 instanceof Error ? e2.message : String(e2)) }
              }
            }
          }
        } catch (e3) {
          console.error('[files][fallback] 数据库兜底异常:', e3)
        }
      }
    }
    
    // 优化：并行获取文件信息，但限制并发数
    const files = []
    const batchSize = 10 // 限制并发数
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      const batchPromises = batch.map(async (entry) => {
        const fullPath = path.join(realDir, entry.name)
        // 对于软链接，先不解析，提高性能
        const fileInfo = await getFileInfo(fullPath, true)
        return fileInfo
      })
      
      const batchResults = await Promise.all(batchPromises)
      files.push(...batchResults.filter(Boolean))
    }
    
    // 按类型和名称排序：目录在前，文件在后
    const sortedFiles = files.sort((a, b) => {
      if (!a || !b) return 0
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
    
    // 应用过滤条件
    let filteredFiles = sortedFiles.filter(file => file !== null)
    
    // 过滤隐藏文件
    if (!options?.showHidden) {
      filteredFiles = filteredFiles.filter(file => !file!.name.startsWith('.'))
    }
    
    // 应用自定义过滤条件
    if (options?.filter) {
      const filterLower = options.filter.toLowerCase()
      filteredFiles = filteredFiles.filter(file => 
        file!.name.toLowerCase().includes(filterLower)
      )
    }
    
    const result = { files: filteredFiles, realDir }
    
    // 缓存结果
    setCache(dirPath, result, username, options)
    
    return result
  } catch (error) {
    console.error('[files] getDirectoryContents error:', error, 'for', dirPath)
    return { files: [], realDir: dirPath, error: error instanceof Error ? error.message : String(error) }
  }
}

// GET: 获取文件列表或文件内容
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const currentPath = searchParams.get('path') || ''
    const filePath = searchParams.get('file')
    const showHidden = searchParams.get('showHidden') === 'true' // 新增：是否显示隐藏文件
    const filter = searchParams.get('filter') || '' // 新增：文件过滤条件
    
    if (!username) {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 })
    }
    

    const homeDir = await getUserHomeDir(username)
    // 文件内容预览
    if (filePath) {
      // 支持绝对路径和 homeDir 下的相对路径
      const fullFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(homeDir, filePath)
      if (!fullFilePath.startsWith(homeDir)) {
        return NextResponse.json({ error: '访问路径超出允许范围' }, { status: 403 })
      }
      
      // 检查文件预览权限
      const permissionRequest = {
        userId: userInfo.id,
        username: userInfo.username,
        operationType: 'file_preview' as const,
        filePath: filePath,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
      
      const permissionResult = await checkFilePermission(permissionRequest)
      
      // 记录操作日志
      await logFileOperation(permissionRequest, permissionResult)
      
      if (!permissionResult.hasPermission) {
        return NextResponse.json({ 
          error: `预览权限不足: ${permissionResult.reason}` 
        }, { status: 403 })
      }
      
      try {
        const stat = await fs.stat(fullFilePath)
        if (stat.isDirectory()) {
          return NextResponse.json({ error: '不能预览目录' }, { status: 400 })
        }
        

        
        // 只支持文本文件预览，二进制文件返回提示
        const ext = path.extname(fullFilePath).toLowerCase()
        const textExts = ['.txt', '.log', '.out', '.err', '.sh', '.md', '.json', '.csv', '.yaml', '.yml']
        if (!textExts.includes(ext)) {
          return NextResponse.json({ error: '暂不支持预览该类型文件' }, { status: 415 })
        }
        const content = await fs.readFile(fullFilePath, 'utf-8')
        

        
        return NextResponse.json({ content })
      } catch (e) {
        return NextResponse.json({ error: '无法读取文件内容: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 })
      }
    }
    // 目录列表
    const fullPath = currentPath ? path.resolve(homeDir, currentPath) : homeDir
    if (!fullPath.startsWith(homeDir)) {
      return NextResponse.json({ error: '访问路径超出允许范围' }, { status: 403 })
    }
    const { files, realDir, error } = await getDirectoryContentsWithFallback(fullPath, username, { showHidden, filter })
    

    
    return NextResponse.json({
      currentPath: currentPath,
      homePath: homeDir,
      files,
      realDir,
      error
    })
  } catch (error) {
    console.error('获取文件列表或内容失败:', error)
    return NextResponse.json({ error: '获取文件列表或内容失败: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
}

// POST: 上传文件
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 })
    }
    
    // 检查用户ID是否存在
    if (!userInfo.id) {
      return NextResponse.json({ error: '用户信息不完整，请重新登录' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const username = formData.get('username') as string
    const uploadPath = formData.get('path') as string || ''
    
    if (!file || !username) {
      return NextResponse.json({ error: '文件或用户名不能为空' }, { status: 400 })
    }
    
    // 检查文件上传权限
    const permissionRequest = {
      userId: userInfo.id,
      username: userInfo.username,
      operationType: 'file_upload' as const,
      filePath: uploadPath,
      fileSize: file.size,
      fileType: file.name.split('.').pop()?.toLowerCase(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }
    
    const permissionResult = await checkFilePermission(permissionRequest)
    
    // 记录操作日志
    await logFileOperation(permissionRequest, permissionResult)
    
    if (!permissionResult.hasPermission) {
      return NextResponse.json({ 
        error: `上传权限不足: ${permissionResult.reason}`,
        quotaUsed: permissionResult.quotaUsed,
        quotaRemaining: permissionResult.quotaRemaining
      }, { status: 403 })
    }
    
    const homeDir = await getUserHomeDir(username)
    const targetDir = uploadPath ? path.resolve(homeDir, uploadPath) : homeDir
    
    // 安全检查
    if (!targetDir.startsWith(homeDir)) {
      return NextResponse.json({ error: '上传路径超出允许范围' }, { status: 403 })
    }
    
    // 确保目标目录存在
    await fs.mkdir(targetDir, { recursive: true })
    
    const filePath = path.join(targetDir, file.name)
    const bytes = await file.arrayBuffer()
    
    await fs.writeFile(filePath, new Uint8Array(bytes))
    
    // 清除该目录的缓存，使文件列表立即更新
    clearCacheForPath(targetDir, username)
    
    return NextResponse.json({ 
      message: '文件上传成功',
      file: await getFileInfo(filePath)
    })
  } catch (error) {
    console.error('文件上传失败:', error)
    return NextResponse.json({ error: '文件上传失败' }, { status: 500 })
  }
}

// DELETE: 删除文件或目录
export async function DELETE(request: NextRequest) {
  // 声明变量在try块外部以便在catch中访问
  let username: string | null = null
  let filePath: string | null = null
  
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 })
    }
    
    // 检查用户ID是否存在
    if (!userInfo.id) {
      return NextResponse.json({ error: '用户信息不完整，请重新登录' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    username = searchParams.get('username')
    filePath = searchParams.get('path')
    
    if (!username || !filePath) {
      return NextResponse.json({ error: '用户名和文件路径不能为空' }, { status: 400 })
    }
    
    // 检查文件删除权限
    const permissionRequest = {
      userId: userInfo.id,
      username: userInfo.username,
      operationType: 'file_delete' as const,
      filePath: filePath,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }
    
    const permissionResult = await checkFilePermission(permissionRequest)
    
    // 记录操作日志
    await logFileOperation(permissionRequest, permissionResult)
    
    if (!permissionResult.hasPermission) {
      return NextResponse.json({ 
        error: `删除权限不足: ${permissionResult.reason}` 
      }, { status: 403 })
    }
    
    const homeDir = await getUserHomeDir(username)
    const fullPath = path.resolve(homeDir, filePath)
    
    // 安全检查
    if (!fullPath.startsWith(homeDir)) {
      return NextResponse.json({ error: '删除路径超出允许范围' }, { status: 403 })
    }
    
    const stats = await fs.stat(fullPath)
    
    if (stats.isDirectory()) {
      await fs.rmdir(fullPath, { recursive: true })
    } else {
      await fs.unlink(fullPath)
    }
    
    // 清除父目录的缓存，使文件列表立即更新
    const parentDir = path.dirname(fullPath)
    clearCacheForPath(parentDir, username)
    
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除文件失败:', error)
    console.error('删除文件详细信息:', {
      username,
      filePath,
      homeDir: username ? await getUserHomeDir(username) : null,
      fullPath: username && filePath ? path.resolve(await getUserHomeDir(username), filePath) : null,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: '删除文件失败' }, { status: 500 })
  }
}