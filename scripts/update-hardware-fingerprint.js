/**
 * 更新数据库中的硬件指纹
 * 用于首次部署或硬件变更后同步
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const os = require('os')
const { execSync } = require('child_process')

const supabaseUrl = process.env.SUPABASE_URL || 'http://192.168.1.10:8000'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

const supabase = createClient(supabaseUrl, supabaseKey)

// 生成与 hardware-fingerprint.ts 一致的指纹
async function generateFingerprint() {
  try {
    // 收集硬件信息
    const cpuId = getCPUId()
    const motherboardId = getMotherboardId()
    const macAddresses = getMacAddresses()
    const diskSerials = getDiskSerials()
    const systemUUID = getSystemUUID()

    // 组合生成指纹
    const components = [
      cpuId,
      motherboardId,
      macAddresses.join(','),
      diskSerials.slice(0, 3).join(','),
      systemUUID || ''
    ]

    const fingerprint = components.join('|')
    return crypto.createHash('sha256').update(fingerprint).digest('hex')

  } catch (error) {
    console.error('生成指纹失败:', error)
    throw error
  }
}

function getCPUId() {
  try {
    const coreCount = execSync('cat /proc/cpuinfo | grep "processor" | wc -l').toString().trim()
    const cpuModel = execSync('cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2').toString().trim()
    return crypto.createHash('md5').update(`${cpuModel}-${coreCount}`).digest('hex')
  } catch {
    return crypto.createHash('md5').update(os.arch() + os.cpus().length).digest('hex')
  }
}

function getMotherboardId() {
  try {
    const serial = execSync('sudo dmidecode -s baseboard-serial-number 2>/dev/null || echo "unknown"').toString().trim()
    if (serial && serial !== 'unknown' && serial !== 'Not Specified') {
      return crypto.createHash('md5').update(serial).digest('hex')
    }
    const manufacturer = execSync('sudo dmidecode -s baseboard-manufacturer 2>/dev/null || echo "unknown"').toString().trim()
    const product = execSync('sudo dmidecode -s baseboard-product-name 2>/dev/null || echo "unknown"').toString().trim()
    return crypto.createHash('md5').update(`${manufacturer}-${product}`).digest('hex')
  } catch {
    return crypto.createHash('md5').update(os.hostname()).digest('hex')
  }
}

function getMacAddresses() {
  const networkInterfaces = os.networkInterfaces()
  const macAddresses = []

  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    if (interfaces) {
      for (const iface of interfaces) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          macAddresses.push(iface.mac.toLowerCase())
        }
      }
    }
  }

  return Array.from(new Set(macAddresses)).sort()
}

function getDiskSerials() {
  try {
    const output = execSync('lsblk -o NAME,SERIAL -n 2>/dev/null | grep -v loop | grep -v sr | awk \'{if($2!="" && $2!="N/A") print $2}\'').toString()
    const serials = output.trim().split('\n').filter(s => s.length > 0)
    return Array.from(new Set(serials)).sort()
  } catch {
    return []
  }
}

function getSystemUUID() {
  try {
    const uuid = execSync('sudo dmidecode -s system-uuid 2>/dev/null || echo "unknown"').toString().trim()
    if (uuid && uuid !== 'unknown' && uuid !== 'Not Specified') {
      return uuid.toLowerCase()
    }
    const machineId = execSync('cat /etc/machine-id 2>/dev/null || echo "unknown"').toString().trim()
    if (machineId && machineId !== 'unknown') {
      return machineId
    }
  } catch {}

  const systemInfo = `${os.hostname()}-${os.platform()}-${os.arch()}`
  return crypto.createHash('md5').update(systemInfo).digest('hex')
}

async function updateHardwareFingerprint() {
  console.log('=== 更新数据库硬件指纹 ===\n')

  // 1. 生成当前硬件指纹
  const currentFingerprint = await generateFingerprint()
  console.log('当前硬件指纹:', currentFingerprint.substring(0, 32) + '...')

  // 2. 查询现有记录
  const { data: existing, error: queryError } = await supabase
    .from('system_installation')
    .select('*')
    .eq('is_active', true)
    .single()

  if (queryError) {
    if (queryError.code === 'PGRST116') {
      console.log('\n数据库无安装记录，需要先同步')
      console.log('请运行: node scripts/test-db-connection.js')
      return
    }
    console.error('查询失败:', queryError)
    return
  }

  console.log('\n数据库现有记录:')
  console.log('  安装ID:', existing.install_id)
  console.log('  安装日期:', existing.install_date)
  console.log('  旧指纹:', existing.hardware_fingerprint.substring(0, 32) + '...')

  if (existing.hardware_fingerprint === currentFingerprint) {
    console.log('\n✓ 硬件指纹已是最新，无需更新')
    return
  }

  // 3. 更新硬件指纹
  console.log('\n正在更新硬件指纹...')

  const { error: updateError } = await supabase
    .from('system_installation')
    .update({
      hardware_fingerprint: currentFingerprint,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id)

  if (updateError) {
    console.error('更新失败:', updateError)
    return
  }

  console.log('\n✓ 硬件指纹更新成功')
  console.log('  新指纹:', currentFingerprint.substring(0, 32) + '...')
}

updateHardwareFingerprint()
