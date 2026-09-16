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

// PATCH: 重命名文件或目录
export async function PATCH(request: NextRequest) {
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
    const { username, oldPath, newName } = body
    
    if (!username || !oldPath || !newName) {
      return NextResponse.json({ error: '用户名、原路径和新名称不能为空' }, { status: 400 })
    }
    
    // 验证新名称不包含路径分隔符
    if (newName.includes('/') || newName.includes('\\')) {
      return NextResponse.json({ error: '文件名不能包含路径分隔符' }, { status: 400 })
    }
    
    // 验证新名称不为空或仅为空格
    if (!newName.trim()) {
      return NextResponse.json({ error: '文件名不能为空' }, { status: 400 })
    }
    
    const homeDir = await getUserHomeDir(username)
    const fullOldPath = path.resolve(homeDir, oldPath)
    const newPath = path.join(path.dirname(fullOldPath), newName)
    
    // 安全检查
    if (!fullOldPath.startsWith(homeDir) || !newPath.startsWith(homeDir)) {
      return NextResponse.json({ error: '路径超出允许范围' }, { status: 403 })
    }
    
    // 检查原文件是否存在
    try {
      await fs.access(fullOldPath)
    } catch {
      return NextResponse.json({ error: '原文件不存在' }, { status: 404 })
    }
    
    // 检查新文件名是否已存在
    try {
      await fs.access(newPath)
      return NextResponse.json({ error: '目标文件名已存在' }, { status: 409 })
    } catch {
      // 目标文件不存在，可以继续
    }
    
    // 检查文件操作权限 - 这里需要删除权限（重命名相当于删除原文件）
    const permissionRequest = {
      userId: userInfo.id,
      username: userInfo.username,
      operationType: 'file_delete' as const, // 重命名需要删除权限
      filePath: oldPath,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }
    
    const permissionResult = await checkFilePermission(permissionRequest)
    
    // 记录操作日志
    await logFileOperation(permissionRequest, permissionResult)
    
    if (!permissionResult.hasPermission) {
      return NextResponse.json({ 
        error: `重命名权限不足: ${permissionResult.reason}` 
      }, { status: 403 })
    }
    
    // 执行重命名
    await fs.rename(fullOldPath, newPath)
    
    // 获取重命名后的文件信息
    const stats = await fs.stat(newPath)
    const fileInfo = {
      name: newName,
      path: path.relative(homeDir, newPath),
      size: stats.isDirectory() ? null : stats.size,
      isDirectory: stats.isDirectory(),
      modified: stats.mtime,
      permissions: stats.mode.toString(8),
      owner: stats.uid,
      group: stats.gid
    }
    
    return NextResponse.json({ 
      message: '重命名成功',
      file: fileInfo
    })
  } catch (error) {
    console.error('重命名文件失败:', error)
    return NextResponse.json({ 
      error: '重命名文件失败: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 })
  }
}