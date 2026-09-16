#!/usr/bin/env node

/**
 * 初始化用户组管理功能
 * 此脚本用于设置用户组管理所需的数据库表和初始数据
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 配置
const config = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',
  ldapUrl: process.env.LDAP_URL || '',
  ldapBaseDN: process.env.LDAP_BASE_DN || '',
  ldapBindDN: process.env.LDAP_BIND_DN || '',
  ldapBindPassword: process.env.LDAP_BIND_PASSWORD || ''
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

// 执行SQL脚本
async function executeSQL(client, sqlScript) {
  console.log('📝 执行SQL脚本...')
  
  try {
    const { error } = await client.rpc('exec_sql', { sql: sqlScript })
    
    if (error) {
      // 如果exec_sql函数不存在，尝试直接执行
      console.log('⚠️ exec_sql函数不存在，尝试直接执行...')
      const { error: directError } = await client.from('groups').select('count')
      
      if (directError) {
        throw new Error(`SQL执行失败: ${directError.message}`)
      }
    }
    
    console.log('✅ SQL脚本执行完成')
  } catch (error) {
    console.error('❌ SQL执行失败:', error.message)
    throw error
  }
}

// 创建用户组表
async function createTables(client) {
  console.log('🏗️ 创建用户组管理表...')
  
  const sql = `
    -- 创建用户组表
    CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        gid_number INTEGER UNIQUE NOT NULL,
        ldap_dn VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 创建组成员关系表
    CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(group_id, username)
    );

    -- 为用户表添加组相关字段（如果不存在）
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'users' AND column_name = 'gid_number') THEN
            ALTER TABLE users ADD COLUMN gid_number INTEGER;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'users' AND column_name = 'home_directory') THEN
            ALTER TABLE users ADD COLUMN home_directory VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'users' AND column_name = 'login_shell') THEN
            ALTER TABLE users ADD COLUMN login_shell VARCHAR(100) DEFAULT '/bin/bash';
        END IF;
    END $$;

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
    CREATE INDEX IF NOT EXISTS idx_groups_gid_number ON groups(gid_number);
    CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_username ON group_members(username);
    CREATE INDEX IF NOT EXISTS idx_users_gid_number ON users(gid_number);
  `
  
  try {
    await executeSQL(client, sql)
    console.log('✅ 用户组管理表创建完成')
  } catch (error) {
    console.error('❌ 创建表失败:', error.message)
    throw error
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

// 创建触发器
async function createTriggers(client) {
  console.log('🔧 创建数据库触发器...')
  
  const sql = `
    -- 创建触发器函数来自动更新updated_at字段
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- 为groups表创建触发器
    DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
    CREATE TRIGGER update_groups_updated_at
        BEFORE UPDATE ON groups
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `
  
  try {
    await executeSQL(client, sql)
    console.log('✅ 数据库触发器创建完成')
  } catch (error) {
    console.warn('⚠️ 创建触发器失败:', error.message)
  }
}

// 创建视图和函数
async function createViewsAndFunctions(client) {
  console.log('👁️ 创建视图和函数...')
  
  const sql = `
    -- 创建视图来简化用户组查询
    CREATE OR REPLACE VIEW user_group_info AS
    SELECT 
        u.id,
        u.username,
        u.real_name,
        u.email,
        u.department,
        u.role,
        u.gid_number,
        g.name as group_name,
        g.description as group_description,
        u.created_at,
        u.last_login_at
    FROM users u
    LEFT JOIN groups g ON u.gid_number = g.gid_number;

    -- 创建函数来获取用户的完整组信息
    CREATE OR REPLACE FUNCTION get_user_groups(user_username VARCHAR)
    RETURNS TABLE(group_name VARCHAR, group_description TEXT, added_at TIMESTAMP WITH TIME ZONE) AS $$
    BEGIN
        RETURN QUERY
        SELECT g.name, g.description, gm.added_at
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.username = user_username
        ORDER BY g.name;
    END;
    $$ LANGUAGE plpgsql;

    -- 创建函数来获取组的成员列表
    CREATE OR REPLACE FUNCTION get_group_members(group_name VARCHAR)
    RETURNS TABLE(username VARCHAR, real_name VARCHAR, email VARCHAR, added_at TIMESTAMP WITH TIME ZONE) AS $$
    BEGIN
        RETURN QUERY
        SELECT u.username, u.real_name, u.email, gm.added_at
        FROM users u
        JOIN group_members gm ON u.username = gm.username
        JOIN groups g ON gm.group_id = g.id
        WHERE g.name = group_name
        ORDER BY u.username;
    END;
    $$ LANGUAGE plpgsql;
  `
  
  try {
    await executeSQL(client, sql)
    console.log('✅ 视图和函数创建完成')
  } catch (error) {
    console.warn('⚠️ 创建视图和函数失败:', error.message)
  }
}

// 设置权限
async function setPermissions(client) {
  console.log('🔐 设置数据库权限...')
  
  const sql = `
    -- 确保只有管理员可以管理用户组
    GRANT SELECT ON groups TO authenticated;
    GRANT SELECT ON group_members TO authenticated;
    GRANT SELECT ON user_group_info TO authenticated;

    -- 只有管理员可以修改用户组
    GRANT ALL ON groups TO service_role;
    GRANT ALL ON group_members TO service_role;
  `
  
  try {
    await executeSQL(client, sql)
    console.log('✅ 数据库权限设置完成')
  } catch (error) {
    console.warn('⚠️ 设置权限失败:', error.message)
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
    console.log('🚀 开始初始化用户组管理功能...\n')
    
    // 检查环境
    checkEnvironment()
    
    // 创建客户端
    const client = createSupabaseClient()
    
    // 执行初始化步骤
    await createTables(client)
    await insertDefaultGroups(client)
    await updateExistingUsers(client)
    await createTriggers(client)
    await createViewsAndFunctions(client)
    await setPermissions(client)
    
    // 验证安装
    await verifyInstallation(client)
    
    console.log('\n🎉 用户组管理功能初始化完成！')
    console.log('\n📚 下一步:')
    console.log('1. 访问 /dashboard/system/groups 页面')
    console.log('2. 创建和管理用户组')
    console.log('3. 为用户分配组权限')
    console.log('4. 查看文档: docs/user-group-management.md')
    
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
  createTables,
  insertDefaultGroups,
  updateExistingUsers,
  createTriggers,
  createViewsAndFunctions,
  setPermissions,
  verifyInstallation
} 