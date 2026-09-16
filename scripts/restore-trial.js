/**
 * 临时脚本：恢复试用期到正常状态
 * 使用方法：node scripts/restore-trial.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 未找到 SUPABASE_URL 或 SUPABASE_KEY 环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function restoreTrial() {
  try {
    console.log('========================================')
    console.log('恢复试用期到正常状态')
    console.log('========================================\n')

    // 计算10天前的日期（剩余80天试用期）
    const installDate = new Date()
    installDate.setDate(installDate.getDate() - 10)
    const installDateISO = installDate.toISOString()

    console.log('1️⃣  计算新的安装日期...')
    console.log(`  - 当前日期: ${new Date().toISOString()}`)
    console.log(`  - 新安装日期 (10天前): ${installDateISO}`)
    console.log(`  - 剩余试用天数: 80天`)
    console.log()

    // 更新数据库
    console.log('2️⃣  更新数据库...')
    const { data: updated, error: updateError } = await supabase
      .from('system_installation')
      .update({
        install_date: installDateISO,
        updated_at: new Date().toISOString()
      })
      .eq('is_active', true)
      .select()

    if (updateError) {
      throw updateError
    }

    console.log(`✓ 成功更新 ${updated?.length || 0} 条记录`)
    console.log()

    // 验证
    console.log('3️⃣  验证更新结果...')
    const { data: verifyInstall } = await supabase
      .from('system_installation')
      .select('*')
      .eq('is_active', true)
      .single()

    if (verifyInstall) {
      const newInstallDate = new Date(verifyInstall.install_date)
      const daysSinceInstall = Math.floor((Date.now() - newInstallDate.getTime()) / (1000 * 3600 * 24))
      const remainingDays = 90 - daysSinceInstall

      console.log('✓ 当前状态:')
      console.log(`  - 已安装天数: ${daysSinceInstall}`)
      console.log(`  - 剩余天数: ${remainingDays}`)
      console.log(`  - 状态: ${remainingDays > 0 ? '✅ 有效' : '❌ 已过期'}`)
    }

    console.log()
    console.log('========================================')
    console.log('✅ 试用期已恢复到正常状态')
    console.log('========================================')

  } catch (error) {
    console.error('❌ 错误:', error.message)
    process.exit(1)
  }
}

restoreTrial()
