import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { 
  getUserFilePermissions, 
  updateUserFilePermission, 
  deleteUserFilePermission,
  getUserFilePermissionsByUsername
} from '@/lib/file-permission-checker'

// 强制动态渲染，因为使用了 request.headers
export const dynamic = 'force-dynamic'

// GET: 获取用户文件权限列表
export async function GET(request: NextRequest) {
  try {
    // 验证用户权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo) {
      return NextResponse.json({ error: '无效的token' }, { status: 401 })
    }
    
    // 暂时跳过管理员权限验证
    // if (!userInfo.isAdmin) {
    //   return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    // }
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const username = searchParams.get('username')
    
    if (!userId && !username) {
      return NextResponse.json({ error: '用户ID或用户名不能为空' }, { status: 400 })
    }
    
    let permissions
    if (userId) {
      // 通过用户ID查询
      permissions = await getUserFilePermissions(userId)
    } else {
      // 通过用户名查询
      permissions = await getUserFilePermissionsByUsername(username!)
    }
    
    return NextResponse.json({
      success: true,
      permissions
    })
  } catch (error) {
    console.error('获取用户文件权限失败:', error)
    return NextResponse.json({ error: '获取用户文件权限失败' }, { status: 500 })
  }
}

// POST: 创建或更新用户文件权限
export async function POST(request: NextRequest) {
  try {
    // 验证用户权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo) {
      return NextResponse.json({ error: '无效的token' }, { status: 401 })
    }
    
    // 暂时跳过管理员权限验证
    // if (!userInfo.isAdmin) {
    //   return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    // }
    
    const body = await request.json()
    const { userId, permissionType, updates } = body
    
    if (!userId || !permissionType) {
      return NextResponse.json({ error: '用户ID和权限类型不能为空' }, { status: 400 })
    }
    
    const success = await updateUserFilePermission(userId, permissionType, updates)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '权限更新成功'
      })
    } else {
      return NextResponse.json({ error: '权限更新失败' }, { status: 500 })
    }
  } catch (error) {
    console.error('更新用户文件权限失败:', error)
    return NextResponse.json({ error: '更新用户文件权限失败' }, { status: 500 })
  }
}

// DELETE: 删除用户文件权限
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo) {
      return NextResponse.json({ error: '无效的token' }, { status: 401 })
    }
    
    // 暂时跳过管理员权限验证
    // if (!userInfo.isAdmin) {
    //   return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    // }
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const permissionType = searchParams.get('permissionType')
    
    if (!userId || !permissionType) {
      return NextResponse.json({ error: '用户ID和权限类型不能为空' }, { status: 400 })
    }
    
    const success = await deleteUserFilePermission(userId, permissionType)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '权限删除成功'
      })
    } else {
      return NextResponse.json({ error: '权限删除失败' }, { status: 500 })
    }
  } catch (error) {
    console.error('删除用户文件权限失败:', error)
    return NextResponse.json({ error: '删除用户文件权限失败' }, { status: 500 })
  }
} 