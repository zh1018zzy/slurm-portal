#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// 配置
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupProblemGroups() {
  try {
    console.log('🧹 开始清理有问题的用户组...\n')
    
    // 1. 查找有问题的组
    console.log('📋 1. 查找有问题的组:')
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .order('name')
    
    if (groupsError) {
      console.error('❌ 查询groups表失败:', groupsError.message)
      return
    }
    
    const problemGroups = groups.filter(group => 
      group.name.includes('_ldap') || 
      !group.ldap_dn || 
      group.ldap_dn === '{}' ||
      group.ldap_dn === 'undefined'
    )
    
    if (problemGroups.length > 0) {
      console.log(`⚠️ 发现 ${problemGroups.length} 个有问题的组:`)
      problemGroups.forEach((group, index) => {
        console.log(`   [${index + 1}] ${group.name}`)
        console.log(`       ID: ${group.id}`)
        console.log(`       GID: ${group.gid_number}`)
        console.log(`       LDAP DN: ${JSON.stringify(group.ldap_dn)}`)
        console.log(`       创建时间: ${group.created_at}`)
        console.log('')
      })
      
      // 2. 询问是否删除
      console.log('💡 建议删除这些有问题的组，然后重新同步LDAP')
      console.log('   这些组通常是同步失败时创建的重复组')
      
      // 3. 删除有问题的组
      console.log('\n📋 2. 删除有问题的组:')
      for (const group of problemGroups) {
        console.log(`🗑️ 删除组: ${group.name} (ID: ${group.id})`)
        
        // 先删除组成员关系
        const { error: membersError } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', group.id)
        
        if (membersError) {
          console.log(`   ⚠️ 删除组成员关系失败: ${membersError.message}`)
        } else {
          console.log(`   ✅ 删除组成员关系成功`)
        }
        
        // 删除组
        const { error: deleteError } = await supabase
          .from('groups')
          .delete()
          .eq('id', group.id)
        
        if (deleteError) {
          console.error(`   ❌ 删除组失败: ${deleteError.message}`)
        } else {
          console.log(`   ✅ 删除组成功`)
        }
      }
      
      // 4. 验证清理结果
      console.log('\n📋 3. 验证清理结果:')
      const { data: remainingGroups, error: remainingError } = await supabase
        .from('groups')
        .select('*')
        .order('name')
      
      if (remainingError) {
        console.error('❌ 查询剩余组失败:', remainingError.message)
        return
      }
      
      console.log(`✅ 清理后剩余 ${remainingGroups.length} 个组:`)
      remainingGroups.forEach((group, index) => {
        console.log(`   [${index + 1}] ${group.name}`)
        console.log(`       ID: ${group.id}`)
        console.log(`       GID: ${group.gid_number}`)
        console.log(`       LDAP DN: ${group.ldap_dn}`)
        console.log('')
      })
      
    } else {
      console.log('✅ 没有发现有问题的组')
    }
    
    // 5. 建议下一步操作
    console.log('\n📋 4. 建议下一步操作:')
    console.log('   1. 运行同步API，重新同步LDAP组信息')
    console.log('   2. 验证所有组都有正确的LDAP DN')
    console.log('   3. 测试用户组管理功能')
    
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error.message)
    console.error('错误堆栈:', error.stack)
  }
}

// 主函数
async function main() {
  try {
    await cleanupProblemGroups()
    console.log('\n🎯 清理完成！')
  } catch (error) {
    console.error('❌ 主函数错误:', error.message)
  }
}

if (require.main === module) {
  main()
} 