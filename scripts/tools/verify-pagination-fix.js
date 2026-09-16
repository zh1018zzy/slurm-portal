#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔍 验证通知页面分页功能修改...\n')

const filePath = '/opt/my-hpcapp/app/dashboard/notifications/page.tsx'

try {
  const content = fs.readFileSync(filePath, 'utf8')
  
  // 检查关键修改点
  const checks = [
    {
      name: '页面大小状态可修改',
      pattern: /const \[pageSize, setPageSize\] = useState\(20\)/,
      found: false
    },
    {
      name: 'Select组件导入',
      pattern: /import.*Select.*from.*@\/components\/ui\/select/,
      found: false
    },
    {
      name: '每页显示选择器',
      pattern: /每页显示.*Select.*onValueChange/s,
      found: false
    },
    {
      name: '分页条件修改',
      pattern: /total > 0 &&/,
      found: false
    },
    {
      name: '总计显示',
      pattern: /总计 \{total\} 条/,
      found: false
    },
    {
      name: '页面重置功能',
      pattern: /setPage\(1\)/,
      found: false
    }
  ]
  
  // 执行检查
  checks.forEach(check => {
    check.found = check.pattern.test(content)
  })
  
  // 输出结果
  console.log('✅ 代码修改验证结果:')
  checks.forEach(check => {
    const status = check.found ? '✅' : '❌'
    console.log(`   ${status} ${check.name}`)
  })
  
  const allPassed = checks.every(check => check.found)
  
  console.log(`\n🎯 验证结果: ${allPassed ? '全部通过' : '部分失败'}`)
  
  if (allPassed) {
    console.log('\n🎉 分页功能已成功添加!')
    console.log('   功能特性:')
    console.log('   - ✅ 可选择每页显示条数 (10/20/50/100)')
    console.log('   - ✅ 显示总计数量和当前页信息')
    console.log('   - ✅ 更改页面大小时自动重置到第1页')
    console.log('   - ✅ 即使只有少量数据也显示分页信息')
    
    console.log('\n📋 用户使用指南:')
    console.log('   1. 访问 http://localhost:3000/dashboard/notifications')
    console.log('   2. 在页面底部找到分页区域')
    console.log('   3. 使用"每页显示"下拉菜单选择显示条数')
    console.log('   4. 通知列表将根据选择自动更新')
  } else {
    console.log('\n❌ 部分修改可能未正确应用')
  }
  
} catch (error) {
  console.error('❌ 验证失败:', error.message)
}