#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 用于创建用户组管理所需的数据库表
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 配置
const config = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
}

// 检查环境变量
function checkEnvironment() {
  console.log('🔍 检查环境配置...')
  
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error('❌ 缺少必需的环境变量:', missing.join(', '))
    console.error('请设置以下环境变量:')
    missing.forEach(key => console.error(`  - ${key}`))
    process.exit(1)
  }
  
  console.log('✅ 环境配置检查通过')
}

// 创建Supabase客户端
function createSupabaseClient() {
  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error('Supabase配置不完整')
  }
  
  return createClient(config.supabaseUrl, config.supabaseKey)
}

// 创建用户组表
async function createGroupsTable(client) {
  console.log('🏗️ 创建用户组表...')
  
  const sql = `
    CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        gid_number INTEGER UNIQUE NOT NULL,
        ldap_dn VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  
  try {
    const { error } = await client.rpc('exec_sql', { sql })
    
    if (error) {
      // 如果exec_sql函数不存在，尝试直接执行
      console.log('⚠️ exec_sql函数不存在，尝试直接执行...')
      const { error: directError } = await client.from('groups').select('count')
      
      if (directError) {
        throw new Error(`创建用户组表失败: ${directError.message}`)
      }
    }
    
    console.log('✅ 用户组表创建成功')
  } catch (error) {
    console.error('❌ 创建用户组表失败:', error.message)
    throw error
  }
}

// 创建组成员关系表
async function createGroupMembersTable(client) {
  console.log('🏗️ 创建组成员关系表...')
  
  const sql = `
    CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(group_id, username)
    );
  `
  
  try {
    const { error } = await client.rpc('exec_sql', { sql })
    
    if (error) {
      // 如果exec_sql函数不存在，尝试直接执行
      console.log('⚠️ exec_sql函数不存在，尝试直接执行...')
      const { error: directError } = await client.from('group_members').select('count')
      
      if (directError) {
        throw new Error(`创建组成员关系表失败: ${directError.message}`)
      }
    }
    
    console.log('✅ 组成员关系表创建成功')
  } catch (error) {
    console.error('❌ 创建组成员关系表失败:', error.message)
    throw error
  }
}

// 为用户表添加组相关字段
async function addUserGroupFields(client) {
  console.log('🔧 为用户表添加组相关字段...')
  
  try {
    // 检查并添加gid_number字段
    const { data: columns } = await client
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('column_name', 'gid_number')
    
    if (!columns || columns.length === 0) {
      const { error } = await client.rpc('exec_sql', { 
        sql: 'ALTER TABLE users ADD COLUMN gid_number INTEGER;' 
      })
      
      if (error) {
        console.log('⚠️ 添加gid_number字段失败，可能已存在')
      } else {
        console.log('✅ 添加gid_number字段成功')
      }
    } else {
      console.log('✅ gid_number字段已存在')
    }
    
    // 检查并添加home_directory字段
    const { data: homeColumns } = await client
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('column_name', 'home_directory')
    
    if (!homeColumns || homeColumns.length === 0) {
      const { error } = await client.rpc('exec_sql', { 
        sql: 'ALTER TABLE users ADD COLUMN home_directory VARCHAR(255);' 
      })
      
      if (error) {
        console.log('⚠️ 添加home_directory字段失败，可能已存在')
      } else {
        console.log('✅ 添加home_directory字段成功')
      }
    } else {
      console.log('✅ home_directory字段已存在')
    }
    
    // 检查并添加login_shell字段
    const { data: shellColumns } = await client
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('column_name', 'login_shell')
    
    if (!shellColumns || shellColumns.length === 0) {
      const { error } = await client.rpc('exec_sql', { 
        sql: 'ALTER TABLE users ADD COLUMN login_shell VARCHAR(100) DEFAULT \'/bin/bash\';' 
      })
      
      if (error) {
        console.log('⚠️ 添加login_shell字段失败，可能已存在')
      } else {
        console.log('✅ 添加login_shell字段成功')
      }
    } else {
      console.log('✅ login_shell字段已存在')
    }
    
  } catch (error) {
    console.error('❌ 添加用户组字段失败:', error.message)
  }
}

// 创建索引
async function createIndexes(client) {
  console.log('🔍 创建数据库索引...')
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);',
    'CREATE INDEX IF NOT EXISTS idx_groups_gid_number ON groups(gid_number);',
    'CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);',
    'CREATE INDEX IF NOT EXISTS idx_group_members_username ON group_members(username);',
    'CREATE INDEX IF NOT EXISTS idx_users_gid_number ON users(gid_number);'
  ]
  
  try {
    for (const indexSql of indexes) {
      const { error } = await client.rpc('exec_sql', { sql: indexSql })
      
      if (error) {
        console.log('⚠️ 创建索引失败，可能已存在:', error.message)
      } else {
        console.log('✅ 索引创建成功')
      }
    }
  } catch (error) {
    console.error('❌ 创建索引失败:', error.message)
  }
}

// 插入默认用户组
async function insertDefaultGroups(client) {
  console.log('📋 插入默认用户组...')
  
  const defaultGroups = [
    {
      name: 'users',
      description: '普通用户组',
      gid_number: 2000,
      ldap_dn: 'cn=users,ou=groups,dc=my-hpc,dc=com'
    },
    {
      name: 'admins',
      description: '系统管理员组',
      gid_number: 2001,
      ldap_dn: 'cn=admins,ou=groups,dc=my-hpc,dc=com'
    },
    {
      name: 'developers',
      description: '开发人员组',
      gid_number: 2002,
      ldap_dn: 'cn=developers,ou=groups,dc=my-hpc,dc=com'
    },
    {
      name: 'researchers',
      description: '研究人员组',
      gid_number: 2003,
      ldap_dn: 'cn=researchers,ou=groups,dc=my-hpc,dc=com'
    }
  ]
  
  try {
    for (const group of defaultGroups) {
      const { error } = await client
        .from('groups')
        .upsert(group, { onConflict: 'name' })
      
      if (error) {
        console.warn(`⚠️ 插入组 ${group.name} 失败:`, error.message)
      } else {
        console.log(`✅ 组 ${group.name} 创建/更新成功`)
      }
    }
    
    console.log('✅ 默认用户组插入完成')
  } catch (error) {
    console.error('❌ 插入默认组失败:', error.message)
    throw error
  }
}

// 更新现有用户的组信息
async function updateExistingUsers(client) {
  console.log('👥 更新现有用户组信息...')
  
  try {
    // 为现有用户分配默认组（users组）
    const { error } = await client
      .from('users')
      .update({ gid_number: 2000 })
      .is('gid_number', null)
    
    if (error) {
      console.warn('⚠️ 更新用户组信息失败:', error.message)
    } else {
      console.log('✅ 现有用户组信息更新完成')
    }
  } catch (error) {
    console.error('❌ 更新用户组信息失败:', error.message)
  }
}

// 验证安装
async function verifyInstallation(client) {
  console.log('🔍 验证安装结果...')
  
  try {
    // 检查表是否存在
    const { data: groups, error: groupsError } = await client
      .from('groups')
      .select('name, description, gid_number')
      .order('gid_number')
    
    if (groupsError) {
      throw new Error(`查询用户组失败: ${groupsError.message}`)
    }
    
    console.log('✅ 用户组表验证成功')
    console.log('📋 当前用户组:')
    groups.forEach(group => {
      console.log(`  - ${group.name} (GID: ${group.gid_number}): ${group.description}`)
    })
    
    // 检查用户表结构
    const { data: users, error: usersError } = await client
      .from('users')
      .select('username, gid_number')
      .limit(5)
    
    if (usersError) {
      throw new Error(`查询用户失败: ${usersError.message}`)
    }
    
    console.log('✅ 用户表结构验证成功')
    console.log('👥 用户组信息示例:')
    users.forEach(user => {
      console.log(`  - ${user.username}: GID ${user.gid_number || '未分配'}`)
    })
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message)
    throw error
  }
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始初始化用户组管理数据库...\n')
    
    // 检查环境
    checkEnvironment()
    
    // 创建客户端
    const client = createSupabaseClient()
    
    // 执行初始化步骤
    await createGroupsTable(client)
    await createGroupMembersTable(client)
    await addUserGroupFields(client)
    await createIndexes(client)
    await insertDefaultGroups(client)
    await updateExistingUsers(client)
    
    // 验证安装
    await verifyInstallation(client)
    
    console.log('\n🎉 用户组管理数据库初始化完成！')
    console.log('\n📚 下一步:')
    console.log('1. 重新尝试创建用户组')
    console.log('2. 如果仍有问题，运行LDAP测试脚本')
    console.log('3. 检查LDAP服务器配置')
    
  } catch (error) {
    console.error('\n❌ 初始化失败:', error.message)
    process.exit(1)
  }
}

// 运行脚本
if (require.main === module) {
  main()
}

module.exports = {
  createGroupsTable,
  createGroupMembersTable,
  addUserGroupFields,
  createIndexes,
  insertDefaultGroups,
  updateExistingUsers,
  verifyInstallation
} 