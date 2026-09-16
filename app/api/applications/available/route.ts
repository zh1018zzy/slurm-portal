import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BUILTIN_VNC_APPS } from '@/lib/builtin-vnc-apps'
import { checkApplicationCenterEnabled } from '../route'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// GET /api/applications/available - 用户可用应用（包括内置VNC应用）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const roleIds = (searchParams.get('roleIds') || '').split(',').filter(Boolean)
  const departmentIds = (searchParams.get('departmentIds') || '').split(',').filter(Boolean)

  try {
    // 检查应用中心是否启用
    const isEnabled = await checkApplicationCenterEnabled()

    let dbApps: any[] = []

    // 只有在应用中心启用时才查询 Supabase 中的应用中心应用
    if (isEnabled) {
      // 先查 is_published = true
      let query = supabase.from('applications').select('*').eq('is_published', true)

      // 只做简单过滤，复杂权限建议后端再细化
      // visible_to_all
      query = query.or(
        [
          'visible_to_all.eq.true',
          userId ? `user_ids.cs.{${userId}}` : '',
          roleIds.length ? `role_ids.cs.{${roleIds.join(',')}}` : '',
          departmentIds.length ? `department_ids.cs.{${departmentIds.join(',')}}` : ''
        ].filter(Boolean).join(',')
      )
      query = query.order('created_at', { ascending: false })

      const { data: resultApps, error } = await query
      if (error) {
        console.error('数据库查询错误:', error)
        // 如果数据库查询失败，仍然返回内置应用
      } else if (resultApps) {
        dbApps = resultApps
      }
    }

    // 合并内置VNC应用和（可选的）数据库应用
    const allApps = [...BUILTIN_VNC_APPS, ...dbApps]

    return NextResponse.json({ success: true, apps: allApps })
  } catch (error) {
    console.error('获取应用列表失败:', error)
    // 发生错误或应用中心被禁用时至少返回内置VNC应用
    return NextResponse.json({ success: true, apps: BUILTIN_VNC_APPS })
  }
}
