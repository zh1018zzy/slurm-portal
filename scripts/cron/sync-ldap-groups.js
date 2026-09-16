#!/usr/bin/env node

/**
 * LDAP用户组同步脚本
 * 用于将LDAP中的用户组同步到数据库
 */

const { createClient } = require('@supabase/supabase-js')
const ldap = require('ldapjs')

// 配置
const config = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',
  ldapUrl: process.env.LDAP_URL || 'ldap://localhost:389',
  ldapBaseDN: process.env.LDAP_BASE_DN || 'dc=my-hpc,dc=com',
  ldapBindDN: process.env.LDAP_BIND_DN || 'cn=admin,dc=my-hpc,dc=com',
  ldapBindPassword: process.env.LDAP_BIND_PASSWORD || 'admin',
  ldapGroupsOU: process.env.LDAP_GROUPS_OU || 'ou=groups'
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

// 从LDAP获取所有用户组
async function getLdapGroups() {
  console.log('🔍 从LDAP获取用户组...')
  
  return new Promise((resolve) => {
    const client = ldap.createClient({ url: config.ldapUrl })
    
    client.bind(config.ldapBindDN, config.ldapBindPassword, (err) => {
      if (err) {
        console.error('❌ LDAP绑定失败:', err.message)
        client.unbind()
        resolve([])
        return
      }
      
      console.log('✅ LDAP绑定成功')
      
      const searchDN = `${config.ldapGroupsOU},${config.ldapBaseDN}`
      const searchOptions = {
        scope: 'sub',
        filter: '(objectClass=groupOfNames)',
        attributes: ['cn', 'description', 'member']
      }
      
      console.log('🔍 搜索DN:', searchDN)
      console.log('🔍 搜索过滤器:', searchOptions.filter)
      
      const groups = []
      
      client.search(searchDN, searchOptions, (err, res) => {
        if (err) {
          console.error('❌ LDAP搜索失败:', err.message)
          client.unbind()
          resolve([])
          return
        }
        
        res.on('searchEntry', (entry) => {
          const group = {
            cn: entry.object.cn,
            description: entry.object.description,
            member: Array.isArray(entry.object.member) ? entry.object.member : 
                   entry.object.member ? [entry.object.member] : [],
            dn: entry.objectName
          }
          groups.push(group)
          console.log(`  📋 找到组: ${group.cn} (成员数: ${group.member.length})`)
        })
        
        res.on('end', () => {
          console.log(`✅ 从LDAP获取到 ${groups.length} 个用户组`)
          client.unbind()
          resolve(groups)
        })
        
        res.on('error', (err) => {
          console.error('❌ LDAP搜索错误:', err.message)
          client.unbind()
          resolve([])
        })
      })
    })
  })
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 获取下一个可用的GID号
async function getNextGidNumber(client) {
  const { data: existingGroups } = await client
    .from('groups')
    .select('gid_number')
    .not('gid_number', 'is', null)
    .order('gid_number', { ascending: false })
    .limit(1)
    
  let nextGidNumber = 2000
  if (existingGroups && existingGroups.length > 0 && existingGroups[0].gid_number) {
    nextGidNumber = existingGroups[0].gid_number + 1
  }
  return nextGidNumber
}

// 同步用户组到数据库
async function syncGroupsToDatabase(client, ldapGroups) {
  console.log('🔄 开始同步用户组到数据库...')
  
  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    details: []
  }
  
  for (const ldapGroup of ldapGroups) {
    try {
      console.log(`\n📝 处理组: ${ldapGroup.cn}`)
      
      // 检查组是否已存在
      const { data: existingGroup } = await client
        .from('groups')
        .select('id, gid_number')
        .eq('name', ldapGroup.cn)
        .single()
      
      if (existingGroup) {
        console.log(`  🔄 更新现有组: ${ldapGroup.cn}`)
        
        // 更新现有组
        const { error } = await client
          .from('groups')
          .update({
            description: ldapGroup.description || '',
            ldap_dn: ldapGroup.dn,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingGroup.id)
        
        if (error) {
          results.errors++
          results.details.push(`更新组 ${ldapGroup.cn} 失败: ${error.message}`)
          console.error(`  ❌ 更新失败: ${error.message}`)
        } else {
          results.updated++
          results.details.push(`更新组 ${ldapGroup.cn} 成功`)
          console.log(`  ✅ 更新成功`)
        }
      } else {
        console.log(`  ➕ 创建新组: ${ldapGroup.cn}`)
        
        // 创建新组
        const gidNumber = await getNextGidNumber(client)
        const { error } = await client.from('groups').insert([
          {
            id: generateUUID(),
            name: ldapGroup.cn,
            description: ldapGroup.description || '',
            gid_number: gidNumber,
            ldap_dn: ldapGroup.dn,
            created_at: new Date().toISOString()
          }
        ])
        
        if (error) {
          results.errors++
          results.details.push(`创建组 ${ldapGroup.cn} 失败: ${error.message}`)
          console.error(`  ❌ 创建失败: ${error.message}`)
        } else {
          results.created++
          results.details.push(`创建组 ${ldapGroup.cn} 成功 (GID: ${gidNumber})`)
          console.log(`  ✅ 创建成功 (GID: ${gidNumber})`)
        }
      }
      
    } catch (error) {
      results.errors++
      results.details.push(`处理组 ${ldapGroup.cn} 时出错: ${error.message}`)
      console.error(`  ❌ 处理出错: ${error.message}`)
    }
  }
  
  return results
}

// 验证同步结果
async function verifySyncResults(client) {
  console.log('\n🔍 验证同步结果...')
  
  try {
    // 检查数据库中的用户组
    const { data: dbGroups, error: dbError } = await client
      .from('groups')
      .select('name, description, gid_number, ldap_dn')
      .order('name')
    
    if (dbError) {
      throw new Error(`查询数据库用户组失败: ${dbError.message}`)
    }
    
    console.log('✅ 数据库验证成功')
    console.log('📋 当前用户组:')
    dbGroups.forEach(group => {
      console.log(`  - ${group.name} (GID: ${group.gid_number}): ${group.description || '无描述'}`)
    })
    
    return dbGroups.length
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message)
    throw error
  }
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始LDAP用户组同步...\n')
    
    // 检查环境
    checkEnvironment()
    
    // 创建客户端
    const client = createSupabaseClient()
    
    // 获取LDAP用户组
    const ldapGroups = await getLdapGroups()
    
    if (ldapGroups.length === 0) {
      console.log('⚠️ 未从LDAP获取到任何用户组')
      console.log('请检查:')
      console.log('1. LDAP服务器是否正常运行')
      console.log('2. LDAP配置是否正确')
      console.log('3. groups OU是否存在')
      console.log('4. 是否有足够的权限')
      process.exit(1)
    }
    
    // 同步到数据库
    const syncResults = await syncGroupsToDatabase(client, ldapGroups)
    
    // 验证结果
    const totalGroups = await verifySyncResults(client)
    
    // 显示总结
    console.log('\n📊 同步总结:')
    console.log(`  📋 LDAP组数量: ${ldapGroups.length}`)
    console.log(`  📊 数据库组数量: ${totalGroups}`)
    console.log(`  ➕ 新创建: ${syncResults.created}`)
    console.log(`  🔄 已更新: ${syncResults.updated}`)
    console.log(`  ❌ 错误: ${syncResults.errors}`)
    
    if (syncResults.errors > 0) {
      console.log('\n⚠️ 同步过程中出现错误:')
      syncResults.details.forEach(detail => {
        console.log(`  - ${detail}`)
      })
    }
    
    if (syncResults.errors === 0) {
      console.log('\n🎉 同步完成！所有用户组已成功同步到数据库')
    } else {
      console.log('\n⚠️ 同步完成，但存在一些错误，请检查上述错误信息')
    }
    
  } catch (error) {
    console.error('\n❌ 同步失败:', error.message)
    process.exit(1)
  }
}

// 运行脚本
if (require.main === module) {
  main()
}

module.exports = {
  getLdapGroups,
  syncGroupsToDatabase,
  verifySyncResults
} 