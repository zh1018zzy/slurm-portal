#!/usr/bin/env node

/**
 * 设置WebShell权限脚本
 * 为现有用户设置默认的WebShell权限
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  console.error('请确保 .env.local 文件中包含:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupWebShellPermissions() {

  try {
    // 1. 检查webshell_access字段是否存在
    const { data: columns, error: columnError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'webshell_access'
      `
    })

    if (columnError) {
    } else if (!columns || columns.length === 0) {
      const { error: addError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE users ADD COLUMN webshell_access BOOLEAN DEFAULT false'
      })
      
      if (addError) {
        console.error('❌ 添加字段失败:', addError.message)
        return
      }
    } else {
    }

    // 2. 为管理员用户启用WebShell权限
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, username, role')
      .eq('role', 'admin')

    if (adminError) {
      console.error('❌ 查询管理员用户失败:', adminError.message)
      return
    }

    if (adminUsers && adminUsers.length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ webshell_access: true })
        .eq('role', 'admin')

      if (updateError) {
        console.error('❌ 更新管理员权限失败:', updateError.message)
        return
      }

      adminUsers.forEach(user => {
      })
    } else {
    }

    // 3. 显示当前权限状态
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('username, role, webshell_access')
      .order('username')

    if (allError) {
      console.error('❌ 查询用户列表失败:', allError.message)
      return
    }

    if (allUsers) {
      const enabledCount = allUsers.filter(u => u.webshell_access).length
      const totalCount = allUsers.length
      
      
      allUsers.forEach(user => {
        const status = user.webshell_access ? '✅ 已启用' : '❌ 未启用'
      })
    }


  } catch (error) {
    console.error('❌ 设置WebShell权限失败:', error.message)
    process.exit(1)
  }
}

// 运行脚本
if (require.main === module) {
  setupWebShellPermissions().then(() => {
    process.exit(0)
  }).catch(error => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })
}

module.exports = { setupWebShellPermissions } 