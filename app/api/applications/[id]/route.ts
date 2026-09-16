import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// GET /api/applications/[id] - 获取单个应用详情
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    
    if (!data) {
      return NextResponse.json({ success: false, message: '应用不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, application: data })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}

// PUT /api/applications/[id] - 更新应用
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const {
      name, description, version, fields, script_template,
      icon, category, tags, status, form_version,
      role_ids, department_ids, visible_to_all, user_ids
    } = body
    
    if (!name || !fields || !script_template) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('applications')
      .update({
        name, description, version, fields, script_template,
        icon, category, tags, status, form_version,
        role_ids: role_ids ?? [], department_ids: department_ids ?? [], 
        visible_to_all: visible_to_all ?? false, user_ids: user_ids ?? [],
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, application: data })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}

// DELETE /api/applications/[id] - 删除应用
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', params.id)
    
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, message: '应用已删除' })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
