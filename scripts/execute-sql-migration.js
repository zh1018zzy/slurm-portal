/**
 * 通过HTTP直接执行SQL - 安装日期防篡改机制
 * 使用Supabase REST API或PostgREST
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

async function executeSQLDirect() {
  console.log('================================================')
  console.log('执行SQL迁移 - 安装日期防篡改机制')
  console.log('================================================\n')

  // 读取SQL文件
  const sqlPath = path.join(__dirname, 'migrations', '001_install_date_anti_tampering.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('📄 迁移文件:', sqlPath)
  console.log(`📊 SQL大小: ${sql.length} 字符\n`)

  // 分步执行SQL（因为一次性执行可能失败）
  const steps = [
    {
      name: '创建审计日志表',
      sql: `
        CREATE TABLE IF NOT EXISTS system_installation_audit (
          id BIGSERIAL PRIMARY KEY,
          install_id UUID NOT NULL,
          action VARCHAR(50) NOT NULL,
          old_install_date TIMESTAMPTZ,
          new_install_date TIMESTAMPTZ,
          changed_by VARCHAR(255),
          changed_at TIMESTAMPTZ DEFAULT NOW(),
          client_info JSONB,
          is_suspicious BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_installation_audit_install_id ON system_installation_audit(install_id);
        CREATE INDEX IF NOT EXISTS idx_installation_audit_created_at ON system_installation_audit(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_installation_audit_suspicious ON system_installation_audit(is_suspicious) WHERE is_suspicious = TRUE;
      `
    },
    {
      name: '创建触发器函数',
      sql: fs.readFileSync(sqlPath, 'utf8').match(/CREATE OR REPLACE FUNCTION check_installation_date_tampering\(\)[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/)[0]
    },
    {
      name: '创建触发器',
      sql: `
        DROP TRIGGER IF EXISTS prevent_installation_date_tampering ON system_installation;
        CREATE TRIGGER prevent_installation_date_tampering
          BEFORE UPDATE ON system_installation
          FOR EACH ROW
          EXECUTE FUNCTION check_installation_date_tampering();
      `
    }
  ]

  console.log('================================================')
  console.log('迁移说明')
  console.log('================================================\n')
  console.log('由于Supabase API限制，无法通过程序直接执行DDL语句。\n')
  console.log('请按以下步骤手动执行:\n')
  console.log('方法1: Supabase Dashboard')
  console.log('  1. 登录 Supabase Dashboard')
  console.log('  2. 进入 SQL Editor')
  console.log('  3. 新建查询')
  console.log('  4. 复制以下文件内容并执行:')
  console.log(`     ${sqlPath}`)
  console.log()
  console.log('方法2: 直接数据库连接')
  console.log('  如果有直接数据库访问权限，运行:')
  console.log(`  psql "postgresql://postgres:password@${supabaseUrl.replace('http://', '').replace('https://', '').split(':')[0]}:5432/postgres" -f ${sqlPath}`)
  console.log()
  console.log('方法3: 使用提供的脚本')
  console.log('  ./scripts/deploy-anti-tampering.sh')
  console.log()
  console.log('================================================')
  console.log('迁移内容预览')
  console.log('================================================\n')
  console.log(sql.substring(0, 500) + '...\n')
  console.log(`(完整内容请查看: ${sqlPath})`)
  console.log()
}

executeSQLDirect()
