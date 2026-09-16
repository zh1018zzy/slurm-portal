const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseProtection() {
  console.log('========================================')
  console.log('检查数据库防篡改机制')
  console.log('========================================\n')

  try {
    // 1. 查看当前安装记录
    console.log('1️⃣  查询当前安装记录...')
    const { data: current, error: queryError } = await supabase
      .from('system_installation')
      .select('*')
      .eq('is_active', true)
      .single()

    if (queryError) {
      console.log('❌ 查询失败:', queryError.message)
      return
    }

    console.log('✓ 当前记录:')
    console.log(`  - install_id: ${current.install_id}`)
    console.log(`  - install_date: ${current.install_date}`)
    console.log(`  - hardware_fingerprint: ${current.hardware_fingerprint?.substring(0, 16)}...`)
    console.log(`  - is_active: ${current.is_active}`)
    console.log()

    const originalDate = current.install_date

    // 2. 尝试直接修改install_date
    console.log('2️⃣  尝试直接修改install_date为1天前...')
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { data: updated, error: updateError } = await supabase
      .from('system_installation')
      .update({
        install_date: oneDayAgo.toISOString()
      })
      .eq('install_id', current.install_id)
      .select()

    if (updateError) {
      console.log('❌ 更新失败:', updateError.message)
      console.log('错误代码:', updateError.code)
      console.log('错误详情:', JSON.stringify(updateError.details, null, 2))
      console.log('\n✅ 这是好事！可能的防篡改机制:')
      console.log('  - 数据库有RLS (Row Level Security) 策略阻止修改')
      console.log('  - 表有触发器阻止关键字段修改')
      console.log('  - 权限配置限制了更新操作')
      console.log('  - 字段有约束或校验规则')
    } else {
      console.log('⚠️  更新成功 - 数据库缺少防篡改保护!')
      console.log('新install_date:', updated[0]?.install_date)
      console.log('\n🔴 安全隐患: 用户可以直接修改数据库来延长试用期!')

      // 恢复原始数据
      console.log('\n3️⃣  恢复原始数据...')
      await supabase
        .from('system_installation')
        .update({ install_date: originalDate })
        .eq('install_id', current.install_id)
      console.log('✓ 已恢复')
    }

    console.log()

    // 4. 检查审计日志表
    console.log('4️⃣  检查是否有审计日志表...')
    const { data: auditLog, error: auditError } = await supabase
      .from('system_installation_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (auditError) {
      if (auditError.code === '42P01') {
        console.log('⚠️  未找到审计日志表 (system_installation_audit)')
        console.log('建议: 创建审计日志表来跟踪所有修改')
      } else {
        console.log('查询审计日志失败:', auditError.message)
      }
    } else {
      console.log('✓ 找到审计日志，最近5条记录:')
      auditLog.forEach((log, i) => {
        console.log(`  ${i+1}. ${log.action} - ${log.created_at}`)
      })
    }

    console.log()

    // 5. 检查RLS策略
    console.log('5️⃣  尝试查询RLS策略...')
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies', { table_name: 'system_installation' })
      .select()

    if (policyError) {
      console.log('⚠️  无法查询RLS策略 (需要数据库管理员权限)')
    } else {
      console.log('✓ RLS策略:')
      console.log(JSON.stringify(policies, null, 2))
    }

  } catch (error) {
    console.error('❌ 检查过程出错:', error.message)
  }

  console.log('\n========================================')
  console.log('检查完成')
  console.log('========================================')
}

checkDatabaseProtection()
