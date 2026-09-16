const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('环境变量未配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupAnnouncements() {
  try {
    
    // 检查表是否存在
    const { data: existingData, error: checkError } = await supabase
      .from('announcements')
      .select('id')
      .limit(1)

    if (checkError && checkError.code === 'PGRST116') {
      
      // 由于无法直接创建表，我们先尝试插入数据
      // 如果表不存在，会报错，然后需要手动创建
      return
    }


    // 检查是否有数据
    const { data: countData, error: countError } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('检查数据失败:', countError)
      return
    }

    if (countData && countData.length > 0) {
      return
    }

    // 插入示例数据
    const { error: insertError } = await supabase
      .from('announcements')
      .insert([
        {
          title: '系统维护通知',
          content: '计划于本周日凌晨2:00-4:00进行系统维护，期间可能影响作业提交。',
          type: 'maintenance',
          priority: 10,
          is_pinned: true,
          created_by: 'admin'
        },
        {
          title: '新功能上线',
          content: '作业历史查询功能已上线，支持查看历史作业详情和日志。',
          type: 'success',
          priority: 5,
          is_pinned: false,
          created_by: 'admin'
        },
        {
          title: 'VNC功能优化',
          content: 'VNC远程桌面功能已优化，支持动态IP解析，提升连接稳定性。',
          type: 'info',
          priority: 3,
          is_pinned: false,
          created_by: 'admin'
        }
      ])

    if (insertError) {
      console.error('插入示例数据失败:', insertError)
      return
    }


  } catch (error) {
    console.error('设置失败:', error)
  }
}

setupAnnouncements() 