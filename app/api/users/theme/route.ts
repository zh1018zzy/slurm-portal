import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtDecode } from 'jwt-decode'
export const dynamic = 'force-dynamic'


const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface JWTPayload {
  username: string
  role?: string
  [key: string]: any
}

// GET /api/users/theme - 获取用户主题偏好
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
    }

    const decoded = jwtDecode<JWTPayload>(token)
    const username = decoded.username

    const { data: user, error } = await supabase
      .from('users')
      .select('theme_preference')
      .eq('username', username)
      .single()

    if (error) {
      console.error('获取用户主题偏好失败:', error)
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 解析主题偏好，如果为空则返回默认值
    let themePreference
    try {
      themePreference = user.theme_preference 
        ? JSON.parse(user.theme_preference)
        : { mode: 'light', auto: true }
    } catch (parseError) {
      // 如果解析失败，返回默认值
      themePreference = { mode: 'light', auto: true }
    }

    return NextResponse.json({ 
      theme_preference: JSON.stringify(themePreference),
      username 
    })

  } catch (error) {
    console.error('获取主题偏好API错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// POST /api/users/theme - 保存用户主题偏好
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
    }

    const decoded = jwtDecode<JWTPayload>(token)
    const username = decoded.username

    const body = await req.json()
    const { theme_preference } = body

    // 验证主题偏好格式
    if (!theme_preference) {
      return NextResponse.json({ error: '主题偏好不能为空' }, { status: 400 })
    }

    // 如果传入的是对象，需要转为JSON字符串
    const themePreferenceStr = typeof theme_preference === 'string' 
      ? theme_preference 
      : JSON.stringify(theme_preference)

    // 验证JSON格式
    try {
      const parsed = JSON.parse(themePreferenceStr)
      if (!parsed.mode || typeof parsed.auto !== 'boolean') {
        return NextResponse.json({ 
          error: '主题偏好格式错误，必须包含mode和auto字段' 
        }, { status: 400 })
      }
    } catch (parseError) {
      return NextResponse.json({ 
        error: '主题偏好必须是有效的JSON格式' 
      }, { status: 400 })
    }

    // 更新用户主题偏好
    const { error } = await supabase
      .from('users')
      .update({ 
        theme_preference: themePreferenceStr,
        updated_at: new Date().toISOString()
      })
      .eq('username', username)

    if (error) {
      console.error('保存用户主题偏好失败:', error)
      return NextResponse.json({ error: '保存失败' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: '主题偏好保存成功',
      theme_preference: JSON.parse(themePreferenceStr)
    })

  } catch (error) {
    console.error('保存主题偏好API错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// PUT /api/users/theme - 更新用户主题偏好（同POST）
export async function PUT(req: NextRequest) {
  return POST(req)
}