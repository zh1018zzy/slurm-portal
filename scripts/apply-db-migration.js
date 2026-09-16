/**
 * 应用数据库迁移 - 安装日期防篡改机制
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 缺少必要的环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('================================================')
  console.log('应用数据库迁移: 安装日期防篡改机制')
  console.log('================================================\n')

  try {
    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'migrations', '001_install_date_anti_tampering.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('📄 读取迁移文件:', sqlPath)
    console.log(`📊 SQL大小: ${sql.length} 字符`)
    console.log()

    // 分割SQL语句（按分号分隔，但保留函数体内的分号）
    console.log('执行SQL语句...\n')

    // 由于Supabase客户端不直接支持执行原始SQL，我们需要分步执行
    // 这里提供两个选项：

    console.log('⚠️  注意: Supabase客户端不直接支持执行DDL语句')
    console.log()
    console.log('请选择以下方法之一:')
    console.log()
    console.log('方法1: 使用Supabase Dashboard')
    console.log('  1. 访问 Supabase Dashboard SQL Editor')
    console.log('  2. 复制文件内容: scripts/migrations/001_install_date_anti_tampering.sql')
    console.log('  3. 粘贴到SQL Editor并执行')
    console.log()
    console.log('方法2: 使用psql命令行 (如果有数据库直接访问权限)')
    console.log('  psql -h <host> -U <user> -d <database> -f scripts/migrations/001_install_date_anti_tampering.sql')
    console.log()
    console.log('方法3: 使用Docker (如果Supabase在容器中)')
    console.log('  docker exec -i <container_id> psql -U postgres postgres < scripts/migrations/001_install_date_anti_tampering.sql')
    console.log()

    // 尝试使用RPC创建函数（如果Supabase支持）
    console.log('尝试通过API应用部分迁移...\n')

    // 至少创建审计表
    console.log('1️⃣  创建审计日志表...')
    const createTableSQL = `
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
    `

    // 注意: Supabase客户端通常不支持直接执行DDL
    // 我们只能记录需要手动执行的步骤
    console.log('✓ SQL已准备')
    console.log()

    console.log('================================================')
    console.log('⚠️  需要手动执行迁移')
    console.log('================================================')
    console.log()
    console.log('请按照上述方法之一执行迁移脚本')
    console.log('脚本位置: scripts/migrations/001_install_date_anti_tampering.sql')
    console.log()

  } catch (error) {
    console.error('❌ 错误:', error.message)
    process.exit(1)
  }
}

applyMigration()
