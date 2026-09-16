/**
 * 临时脚本：修改安装日期以测试试用期过期功能
 * 使用方法：node scripts/set-expired-trial.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 未找到 SUPABASE_URL 或 SUPABASE_KEY 环境变量')
  console.log('\n请确保 .env.local 文件包含:')
  console.log('  SUPABASE_URL=...')
  console.log('  SUPABASE_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setExpiredTrial() {
  try {
    console.log('========================================')
    console.log('设置试用期为过期状态')
    console.log('========================================\n')

    // 1. 查看当前安装记录
    console.log('1️⃣  查询当前安装记录...')
    const { data: currentInstall, error: queryError } = await supabase
      .from('system_installation')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        console.log('⚠️  未找到安装记录')
      } else {
        throw queryError
      }
    } else {
      console.log('✓ 当前安装记录:')
      console.log(`  - 安装ID: ${currentInstall.install_id}`)
      console.log(`  - 安装日期: ${currentInstall.install_date}`)
      const installDate = new Date(currentInstall.install_date)
      const daysSinceInstall = Math.floor((Date.now() - installDate.getTime()) / (1000 * 3600 * 24))
      const remainingDays = 90 - daysSinceInstall
      console.log(`  - 已安装天数: ${daysSinceInstall}`)
      console.log(`  - 剩余天数: ${remainingDays}`)
      console.log(`  - 状态: ${remainingDays > 0 ? '✅ 有效' : '❌ 已过期'}`)
      console.log()
    }

    // 2. 计算91天前的日期
    const expiredDate = new Date()
    expiredDate.setDate(expiredDate.getDate() - 91) // 91天前，确保超过90天试用期
    const expiredDateISO = expiredDate.toISOString()

    console.log('2️⃣  计算过期日期...')
    console.log(`  - 当前日期: ${new Date().toISOString()}`)
    console.log(`  - 91天前: ${expiredDateISO}`)
    console.log()

    // 3. 更新数据库
    console.log('3️⃣  更新数据库中的安装日期...')
    const { data: updated, error: updateError } = await supabase
      .from('system_installation')
      .update({
        install_date: expiredDateISO,
        updated_at: new Date().toISOString()
      })
      .eq('is_active', true)
      .select()

    if (updateError) {
      throw updateError
    }

    console.log(`✓ 成功更新 ${updated?.length || 0} 条记录`)
    console.log()

    // 4. 验证更新结果
    console.log('4️⃣  验证更新后的状态...')
    const { data: verifyInstall, error: verifyError } = await supabase
      .from('system_installation')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (verifyError) {
      throw verifyError
    }

    console.log('✓ 更新后的安装记录:')
    console.log(`  - 安装ID: ${verifyInstall.install_id}`)
    console.log(`  - 新安装日期: ${verifyInstall.install_date}`)
    const newInstallDate = new Date(verifyInstall.install_date)
    const newDaysSinceInstall = Math.floor((Date.now() - newInstallDate.getTime()) / (1000 * 3600 * 24))
    const newRemainingDays = 90 - newDaysSinceInstall
    console.log(`  - 已安装天数: ${newDaysSinceInstall}`)
    console.log(`  - 剩余天数: ${newRemainingDays}`)
    console.log(`  - 状态: ${newRemainingDays > 0 ? '✅ 有效' : '❌ 已过期'}`)
    console.log()

    // 5. 测试许可证API
    console.log('5️⃣  测试许可证状态API...')
    try {
      const response = await fetch('http://localhost:3000/api/license/status')
      if (response.ok) {
        const licenseStatus = await response.json()
        console.log('✓ 许可证状态:')
        console.log(`  - 有效性: ${licenseStatus.valid ? '✅ 有效' : '❌ 无效'}`)
        console.log(`  - 状态: ${licenseStatus.status}`)
        console.log(`  - 类型: ${licenseStatus.type}`)
        console.log(`  - 剩余天数: ${licenseStatus.remainingDays}`)
        console.log(`  - 试用期过期: ${licenseStatus.isTrialExpired ? '是' : '否'}`)
        console.log(`  - 消息: ${licenseStatus.message}`)
      } else {
        console.log(`⚠️  API请求失败: ${response.status}`)
      }
    } catch (apiError) {
      console.log('⚠️  无法连接到API (可能服务未运行):', apiError.message)
    }

    console.log()
    console.log('========================================')
    console.log('✅ 试用期已设置为过期状态')
    console.log('========================================')
    console.log()
    console.log('📋 现在可以测试:')
    console.log('  1. 访问登录页面，应该看到红色过期横幅')
    console.log('  2. 尝试登录，应该被拒绝并显示过期提示')
    console.log('  3. 超级管理员仍可登录')
    console.log()
    console.log('🔄 恢复测试:')
    console.log('  运行: node scripts/restore-trial.js')
    console.log()

  } catch (error) {
    console.error('❌ 错误:', error.message)
    if (error.details) {
      console.error('详情:', error.details)
    }
    process.exit(1)
  }
}

setExpiredTrial()
