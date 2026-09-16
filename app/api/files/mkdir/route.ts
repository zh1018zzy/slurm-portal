import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

import { verifyJwt } from '@/lib/jwt'
import { checkFilePermission, logFileOperation } from '@/lib/file-permission-checker'
import { clearCacheForPath } from '@/lib/file-cache-manager'

// 强制动态渲染，因为使用了 request.headers
export const dynamic = 'force-dynamic'

// 获取用户家目录
async function getUserHomeDir(username: string): Promise<string> {
  const { UserHomeManager } = await import('@/lib/user-home-manager')
  return UserHomeManager.getUserHome(username)
}

// POST: 创建新目录
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
    
    const body = await request.json()
    const { username, parentPath, dirName } = body
    
    if (!username || !dirName) {
      return NextResponse.json({ error: '用户名和目录名不能为空' }, { status: 400 })
    }
    
    // 验证目录名不包含路径分隔符
    if (dirName.includes('/') || dirName.includes('\\')) {
      return NextResponse.json({ error: '目录名不能包含路径分隔符' }, { status: 400 })
    }
    
    // 验证目录名不为空或仅为空格
    if (!dirName.trim()) {
      return NextResponse.json({ error: '目录名不能为空' }, { status: 400 })
    }
    
    // 验证目录名不以点开头（除非用户明确想创建隐藏目录）
    if (dirName.startsWith('.') && dirName !== '.' && dirName !== '..') {
      // 允许创建隐藏目录，但给出警告
      console.warn(`用户 ${username} 创建隐藏目录: ${dirName}`)
    }
    
    const homeDir = await getUserHomeDir(username)
    const parentFullPath = parentPath ? path.resolve(homeDir, parentPath) : homeDir
    const newDirPath = path.join(parentFullPath, dirName)
    
    // 安全检查
    if (!parentFullPath.startsWith(homeDir) || !newDirPath.startsWith(homeDir)) {
      return NextResponse.json({ error: '路径超出允许范围' }, { status: 403 })
    }
    
    // 检查父目录是否存在
    try {
      const parentStats = await fs.stat(parentFullPath)
      if (!parentStats.isDirectory()) {
        return NextResponse.json({ error: '父路径不是目录' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: '父目录不存在' }, { status: 404 })
    }
    
    // 检查目标目录是否已存在
    try {
      await fs.access(newDirPath)
      return NextResponse.json({ error: '目录已存在' }, { status: 409 })
    } catch {
      // 目录不存在，可以继续创建
    }
    
    // 检查文件上传权限（创建目录相当于上传操作）
    const permissionRequest = {
      userId: userInfo.id,
      username: userInfo.username,
      operationType: 'file_upload' as const,
      filePath: parentPath || '',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }
    
    const permissionResult = await checkFilePermission(permissionRequest)
    
    // 记录操作日志
    await logFileOperation(permissionRequest, permissionResult)
    
    if (!permissionResult.hasPermission) {
      return NextResponse.json({ 
        error: `创建目录权限不足: ${permissionResult.reason}` 
      }, { status: 403 })
    }
    
    // 创建目录
    await fs.mkdir(newDirPath, { recursive: false })
    
    // 清除父目录的缓存，使文件列表立即更新
    clearCacheForPath(parentFullPath, username)
    
    // 获取创建的目录信息
    const stats = await fs.stat(newDirPath)
    const dirInfo = {
      name: dirName,
      path: path.relative(homeDir, newDirPath),
      size: null,
      isDirectory: true,
      modified: stats.mtime,
      permissions: stats.mode.toString(8),
      owner: stats.uid,
      group: stats.gid
    }
    
    return NextResponse.json({ 
      message: '目录创建成功',
      directory: dirInfo
    })
  } catch (error) {
    console.error('创建目录失败:', error)
    return NextResponse.json({ 
      error: '创建目录失败: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 })
  }
}