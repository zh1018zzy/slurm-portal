#!/usr/bin/env node

/**
 * 国际化配置验证脚本
 * 验证 i18n 配置是否正确
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const MESSAGES_DIR = path.join(ROOT_DIR, 'messages');
const APP_DIR = path.join(ROOT_DIR, 'app');

let errors = [];
let warnings = [];
let success = [];

console.log('🔍 开始验证国际化配置...\n');

// 1. 检查翻译文件是否存在
console.log('1️⃣ 检查翻译文件...');
const requiredLocales = ['zh', 'en'];
requiredLocales.forEach(locale => {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  if (fs.existsSync(filePath)) {
    success.push(`✅ 翻译文件存在: ${locale}.json`);
  } else {
    errors.push(`❌ 缺少翻译文件: ${locale}.json`);
  }
});

// 2. 验证翻译文件格式
console.log('\n2️⃣ 验证翻译文件格式...');
const translations = {};
requiredLocales.forEach(locale => {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      translations[locale] = JSON.parse(content);
      success.push(`✅ ${locale}.json 格式正确`);
    }
  } catch (error) {
    errors.push(`❌ ${locale}.json 格式错误: ${error.message}`);
  }
});

// 3. 检查翻译键一致性
console.log('\n3️⃣ 检查翻译键一致性...');
if (translations.zh && translations.en) {
  const zhKeys = getAllKeys(translations.zh);
  const enKeys = getAllKeys(translations.en);
  
  const missingInEn = zhKeys.filter(key => !enKeys.includes(key));
  const missingInZh = enKeys.filter(key => !zhKeys.includes(key));
  
  if (missingInEn.length > 0) {
    warnings.push(`⚠️  英文翻译缺少 ${missingInEn.length} 个键: ${missingInEn.slice(0, 3).join(', ')}...`);
  }
  
  if (missingInZh.length > 0) {
    warnings.push(`⚠️  中文翻译缺少 ${missingInZh.length} 个键: ${missingInZh.slice(0, 3).join(', ')}...`);
  }
  
  if (missingInEn.length === 0 && missingInZh.length === 0) {
    success.push('✅ 翻译键完全一致');
  }
}

// 4. 检查必需的配置文件
console.log('\n4️⃣ 检查配置文件...');
const requiredFiles = [
  'i18n.ts',
  'middleware.ts',
  'next.config.mjs',
  'app/[locale]/layout.tsx',
  'components/LanguageSwitcher.tsx',
  'lib/i18n-utils.ts'
];

requiredFiles.forEach(file => {
  const filePath = path.join(ROOT_DIR, file);
  if (fs.existsSync(filePath)) {
    success.push(`✅ 配置文件存在: ${file}`);
  } else {
    errors.push(`❌ 缺少配置文件: ${file}`);
  }
});

// 5. 检查 [locale] 目录结构
console.log('\n5️⃣ 检查目录结构...');
const localeDir = path.join(APP_DIR, '[locale]');
if (fs.existsSync(localeDir)) {
  success.push('✅ [locale] 目录存在');
  
  // 检查是否有页面文件
  const hasPageFile = fs.existsSync(path.join(localeDir, 'page.tsx'));
  const hasLayoutFile = fs.existsSync(path.join(localeDir, 'layout.tsx'));
  
  if (hasPageFile) {
    success.push('✅ [locale]/page.tsx 存在');
  } else {
    warnings.push('⚠️  [locale]/page.tsx 不存在');
  }
  
  if (hasLayoutFile) {
    success.push('✅ [locale]/layout.tsx 存在');
  } else {
    errors.push('❌ [locale]/layout.tsx 不存在');
  }
} else {
  errors.push('❌ [locale] 目录不存在');
}

// 6. 检查 next-intl 依赖
console.log('\n6️⃣ 检查依赖...');
const packageJsonPath = path.join(ROOT_DIR, 'package.json');
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.dependencies && packageJson.dependencies['next-intl']) {
    success.push(`✅ next-intl 已安装: ${packageJson.dependencies['next-intl']}`);
  } else {
    errors.push('❌ next-intl 未安装');
  }
} catch (error) {
  errors.push(`❌ 无法读取 package.json: ${error.message}`);
}

// 打印结果
console.log('\n' + '='.repeat(60));
console.log('验证结果:');
console.log('='.repeat(60) + '\n');

if (success.length > 0) {
  console.log('✅ 成功 (' + success.length + ' 项):');
  success.forEach(msg => console.log('  ' + msg));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  警告 (' + warnings.length + ' 项):');
  warnings.forEach(msg => console.log('  ' + msg));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ 错误 (' + errors.length + ' 项):');
  errors.forEach(msg => console.log('  ' + msg));
  console.log('');
}

console.log('='.repeat(60));

if (errors.length === 0) {
  console.log('\n🎉 国际化配置验证通过！\n');
  console.log('下一步:');
  console.log('  1. 运行 npm run dev 启动开发服务器');
  console.log('  2. 访问 http://localhost:3000/zh/ 查看中文版本');
  console.log('  3. 访问 http://localhost:3000/en/ 查看英文版本');
  console.log('  4. 访问 http://localhost:3000/zh/i18n-example 查看示例页面\n');
  process.exit(0);
} else {
  console.log('\n❌ 验证失败，请修复上述错误后重试。\n');
  process.exit(1);
}

// 辅助函数：获取所有键（包括嵌套）
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

