import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

import { verifyJwt } from '@/lib/jwt'
import { checkFilePermission, logFileOperation } from '@/lib/file-permission-checker'

// 强制动态渲染，因为使用了 request.headers
export const dynamic = 'force-dynamic'

// 获取用户家目录
async function getUserHomeDir(username: string): Promise<string> {
  const { UserHomeManager } = await import('@/lib/user-home-manager')
  return UserHomeManager.getUserHome(username)
}

// 递归复制文件/目录
async function copyRecursive(src: string, dest: string): Promise<void> {
  const stats = await fs.stat(src)
  
  if (stats.isDirectory()) {
    // 创建目标目录
    await fs.mkdir(dest, { recursive: true })
    
    // 复制目录内容
    const entries = await fs.readdir(src)
    for (const entry of entries) {
      const srcPath = path.join(src, entry)
      const destPath = path.join(dest, entry)
      await copyRecursive(srcPath, destPath)
    }
  } else {
    // 复制文件
    await fs.copyFile(src, dest)
  }
}

// 递归移动文件/目录
async function moveRecursive(src: string, dest: string): Promise<void> {
  try {
    // 尝试直接重命名（最高效）
    await fs.rename(src, dest)
  } catch (error) {
    // 如果重命名失败（可能跨文件系统），则复制后删除
    await copyRecursive(src, dest)
    await fs.rm(src, { recursive: true, force: true })
  }
}

// POST: 复制文件或目录
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const operation = searchParams.get('operation') // 'copy' 或 'move'
  
  if (!operation || !['copy', 'move'].includes(operation)) {
    return NextResponse.json({ error: '操作类型无效，必须是 copy 或 move' }, { status: 400 })
  }
  
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
    const { username, sourcePath, destPath, newName } = body
    
    if (!username || !sourcePath || !destPath) {
      return NextResponse.json({ error: '用户名、源路径和目标路径不能为空' }, { status: 400 })
    }
    
    const homeDir = await getUserHomeDir(username)
    const fullSourcePath = path.resolve(homeDir, sourcePath)
    const destDir = path.resolve(homeDir, destPath)
    
    // 确定最终目标路径
    const fileName = newName || path.basename(fullSourcePath)
    const fullDestPath = path.join(destDir, fileName)
    
    // 安全检查
    if (!fullSourcePath.startsWith(homeDir) || !destDir.startsWith(homeDir) || !fullDestPath.startsWith(homeDir)) {
      return NextResponse.json({ error: '路径超出允许范围' }, { status: 403 })
    }
    
    // 检查源文件是否存在
    try {
      await fs.access(fullSourcePath)
    } catch {
      return NextResponse.json({ error: '源文件不存在' }, { status: 404 })
    }
    
    // 检查目标目录是否存在
    try {
      const destStats = await fs.stat(destDir)
      if (!destStats.isDirectory()) {
        return NextResponse.json({ error: '目标路径不是目录' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: '目标目录不存在' }, { status: 404 })
    }
    
    // 检查目标文件是否已存在
    try {
      await fs.access(fullDestPath)
      return NextResponse.json({ error: '目标位置已存在同名文件' }, { status: 409 })
    } catch {
      // 目标文件不存在，可以继续
    }
    
    // 检查是否尝试将目录移动到自身子目录中
    if (operation === 'move' && fullDestPath.startsWith(fullSourcePath + path.sep)) {
      return NextResponse.json({ error: '不能将目录移动到自身的子目录中' }, { status: 400 })
    }
    
    // 检查权限
    const sourcePermissionRequest = {
      userId: userInfo.id,
      username: userInfo.username,
      operationType: operation === 'move' ? 'file_delete' as const : 'file_download' as const,
      filePath: sourcePath,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }
    
    const destPermissionRequest = {
      userId: userInfo.id,
      username: userInfo.username,
      operationType: 'file_upload' as const,
      filePath: destPath,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }
    
    // 检查源文件权限
    const sourcePermissionResult = await checkFilePermission(sourcePermissionRequest)
    await logFileOperation(sourcePermissionRequest, sourcePermissionResult)
    
    if (!sourcePermissionResult.hasPermission) {
      return NextResponse.json({ 
        error: `源文件权限不足: ${sourcePermissionResult.reason}` 
      }, { status: 403 })
    }
    
    // 检查目标目录权限
    const destPermissionResult = await checkFilePermission(destPermissionRequest)
    await logFileOperation(destPermissionRequest, destPermissionResult)
    
    if (!destPermissionResult.hasPermission) {
      return NextResponse.json({ 
        error: `目标目录权限不足: ${destPermissionResult.reason}` 
      }, { status: 403 })
    }
    
    // 执行操作
    if (operation === 'copy') {
      await copyRecursive(fullSourcePath, fullDestPath)
    } else if (operation === 'move') {
      await moveRecursive(fullSourcePath, fullDestPath)
    }
    
    // 获取操作后的文件信息
    const stats = await fs.stat(fullDestPath)
    const fileInfo = {
      name: fileName,
      path: path.relative(homeDir, fullDestPath),
      size: stats.isDirectory() ? null : stats.size,
      isDirectory: stats.isDirectory(),
      modified: stats.mtime,
      permissions: stats.mode.toString(8),
      owner: stats.uid,
      group: stats.gid
    }
    
    return NextResponse.json({ 
      message: `${operation === 'copy' ? '复制' : '移动'}成功`,
      file: fileInfo,
      operation
    })
  } catch (error) {
    console.error(`${operation}文件失败:`, error)
    return NextResponse.json({ 
      error: `${operation === 'copy' ? '复制' : '移动'}文件失败: ` + (error instanceof Error ? error.message : String(error))
    }, { status: 500 })
  }
}