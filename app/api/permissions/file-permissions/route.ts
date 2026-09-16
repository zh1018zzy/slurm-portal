import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { getUserFilePermissionsByUsername } from '@/lib/file-permission-checker'

// 强制动态渲染，因为使用了 request.headers
export const dynamic = 'force-dynamic'

// GET: 获取当前用户的文件权限列表
export async function GET(request: NextRequest) {
  // 构建时保护 - 返回默认响应
  if (process.env.NODE_ENV === 'production' && !request.headers.get('authorization')) {
    return NextResponse.json({ 
      success: false, 
      error: '构建时无法访问此API',
      permissions: []
    })
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
      return NextResponse.json({ error: '无效的token' }, { status: 401 })
    }
    
    // 通过用户名获取当前用户的权限
    const permissions = await getUserFilePermissionsByUsername(userInfo.username)
    
    return NextResponse.json({
      success: true,
      permissions
    })
  } catch (error) {
    console.error('获取用户文件权限失败:', error)
    return NextResponse.json({ error: '获取用户文件权限失败' }, { status: 500 })
  }
} 