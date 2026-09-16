import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/admin-config'
import { isAdmin } from '@/lib/permission-middleware'
export const dynamic = 'force-dynamic'


// GET: 获取管理员token（仅限已登录的管理员）
export async function GET(request: NextRequest) {
  try {
    // 校验请求者必须是已登录的管理员，防止匿名获取管理员凭据
    if (!isAdmin(request)) {
      return NextResponse.json({ error: '无权限获取管理员token' }, { status: 401 })
    }

    const token = getAdminToken()

    return NextResponse.json({
      success: true,
      token,
      expiresIn: '7d'
    })
  } catch (error) {
    console.error('获取管理员token失败:', error)
    return NextResponse.json({ error: '获取管理员token失败' }, { status: 500 })
  }
}
