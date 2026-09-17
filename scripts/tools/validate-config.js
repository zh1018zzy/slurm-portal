#!/usr/bin/env node

/**
 * 环境变量配置验证脚本
 */

// 必需的环境变量
const requiredEnvVars = {
  'SUPABASE_URL': { default: 'http://localhost:8000', desc: 'Supabase项目URL' },
  'SUPABASE_SERVICE_ROLE_KEY': { default: '', desc: 'Supabase服务角色密钥' },
}

// 可选的环境变量（带默认值）
const OPTIONAL_CONFIG = {
  'NEXT_PUBLIC_APP_URL': { default: 'http://localhost:3000', desc: '应用服务器URL' },
  'NEXT_PUBLIC_WEBSHELL_SERVER': { default: 'http://localhost:3001', desc: 'WebShell服务器地址' },
  'VNC_NODE': { default: '(sinfo graphics / localhost)', desc: '图形节点主机名（可自动发现）' },
  'NOVNC_GATEWAY': { default: '(解析 VNC_NODE)', desc: '浏览器访问 noVNC 的主机（可选）' },
  'NOVNC_PORT': { default: '6080', desc: 'noVNC网关端口' },
  'DEFAULT_VNC_NODE_IP': { default: '(兼容 VNC_NODE)', desc: '兼容旧变量，等同 VNC_NODE' },
  'JWT_SECRET': { default: 'your-secret-key', desc: 'JWT密钥' }
}

function validateConfig() {
  console.log('🔍 验证环境变量配置...\n')
  
  let missing = []
  let configured = []
  
  // 检查必需配置
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      missing.push({ key, desc: config.desc, default: config.default, type: 'required' })
    } else {
      configured.push({ key, value: process.env[key], desc: config.desc, type: 'required' })
    }
  }
  
  // 检查可选配置
  for (const [key, config] of Object.entries(OPTIONAL_CONFIG)) {
    if (!process.env[key]) {
      missing.push({ key, desc: config.desc, default: config.default, type: 'optional' })
    } else {
      configured.push({ key, value: process.env[key], desc: config.desc, type: 'optional' })
    }
  }
  
  // 输出结果
  console.log('✅ 已配置的环境变量:')
  configured.forEach(({ key, value, desc, type }) => {
    const displayValue = key.includes('PASSWORD') || key.includes('SECRET') || key.includes('KEY') 
      ? '***' 
      : value
    console.log(`  ${key}: ${displayValue} (${desc})`)
  })
  console.log('')
  
  if (missing.length > 0) {
    console.log('ℹ️  未设置（可选）或缺少的环境变量:')
    missing.forEach(({ key, desc, default: defaultValue, type }) => {
      const typeLabel = type === 'required' ? '必需' : '可选'
      console.log(`  ${key}: ${desc} [${typeLabel}]`)
      if (defaultValue) {
        console.log(`    默认值: ${defaultValue}`)
      }
    })
    console.log('')
  }
  
  const isValid = missing.filter(m => m.type === 'required').length === 0
  console.log(`🎯 验证结果: ${isValid ? 'PASS' : 'FAIL'}`)
  
  return isValid
}

if (require.main === module) {
  const isValid = validateConfig()
  process.exit(isValid ? 0 : 1)
}

module.exports = { validateConfig }
