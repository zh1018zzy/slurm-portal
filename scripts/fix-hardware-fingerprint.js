/**
 * 修复硬件指纹不匹配问题
 * 重新生成与 hardware-fingerprint.ts 一致的安全标记
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');

// 使用完整的硬件指纹生成逻辑（与 hardware-fingerprint.ts 一致）
function generateFingerprint() {
  function getCPUId() {
    try {
      const coreCount = execSync('cat /proc/cpuinfo | grep "processor" | wc -l').toString().trim();
      const cpuModel = execSync('cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2').toString().trim();
      return crypto.createHash('md5').update(`${cpuModel}-${coreCount}`).digest('hex');
    } catch {
      return crypto.createHash('md5').update(os.arch() + os.cpus().length).digest('hex');
    }
  }

  function getMotherboardId() {
    try {
      const serial = execSync('sudo dmidecode -s baseboard-serial-number 2>/dev/null || echo "unknown"').toString().trim();
      if (serial && serial !== 'unknown' && serial !== 'Not Specified') {
        return crypto.createHash('md5').update(serial).digest('hex');
      }
      const manufacturer = execSync('sudo dmidecode -s baseboard-manufacturer 2>/dev/null || echo "unknown"').toString().trim();
      const product = execSync('sudo dmidecode -s baseboard-product-name 2>/dev/null || echo "unknown"').toString().trim();
      return crypto.createHash('md5').update(`${manufacturer}-${product}`).digest('hex');
    } catch {
      return crypto.createHash('md5').update(os.hostname()).digest('hex');
    }
  }

  function getMacAddresses() {
    const networkInterfaces = os.networkInterfaces();
    const macAddresses = [];
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      if (interfaces) {
        for (const iface of interfaces) {
          if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
            macAddresses.push(iface.mac.toLowerCase());
          }
        }
      }
    }
    return Array.from(new Set(macAddresses)).sort();
  }

  function getDiskSerials() {
    try {
      const output = execSync('lsblk -o NAME,SERIAL -n 2>/dev/null | grep -v loop | grep -v sr | awk \'{if($2!="" && $2!="N/A") print $2}\'').toString();
      const serials = output.trim().split('\n').filter(s => s.length > 0);
      return Array.from(new Set(serials)).sort();
    } catch {
      return [];
    }
  }

  function getSystemUUID() {
    try {
      const uuid = execSync('sudo dmidecode -s system-uuid 2>/dev/null || echo "unknown"').toString().trim();
      if (uuid && uuid !== 'unknown' && uuid !== 'Not Specified') {
        return uuid.toLowerCase();
      }
      const machineId = execSync('cat /etc/machine-id 2>/dev/null || echo "unknown"').toString().trim();
      if (machineId && machineId !== 'unknown') {
        return machineId;
      }
    } catch {}
    const systemInfo = `${os.hostname()}-${os.platform()}-${os.arch()}`;
    return crypto.createHash('md5').update(systemInfo).digest('hex');
  }

  const cpuId = getCPUId();
  const motherboardId = getMotherboardId();
  const macAddresses = getMacAddresses();
  const diskSerials = getDiskSerials();
  const systemUUID = getSystemUUID();

  const components = [
    cpuId,
    motherboardId,
    macAddresses.join(','),
    diskSerials.slice(0, 3).join(','),
    systemUUID || ''
  ];

  const fingerprint = components.join('|');
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

async function updateSecurityMarkers() {
  console.log('=== 修复硬件指纹不匹配问题 ===\n');

  try {
    const installFile = path.join(process.cwd(), 'config/installation.json');
    const securityFile = path.join(process.cwd(), 'config/.security_markers');

    // 读取安装信息
    const installData = JSON.parse(fs.readFileSync(installFile, 'utf8'));
    const installDate = installData.installDate;

    // 生成当前硬件指纹
    const hwFingerprint = generateFingerprint();
    console.log('当前硬件指纹:', hwFingerprint.substring(0, 32) + '...');
    console.log('安装日期:', installDate);

    // 读取旧的安全标记
    if (fs.existsSync(securityFile)) {
      const oldSecurity = JSON.parse(fs.readFileSync(securityFile, 'utf8'));
      console.log('旧硬件指纹:', oldSecurity.hardwareFingerprint);
    }

    const timestamp = Date.now().toString();

    // 创建安全标记
    const markers = [];
    const marker1 = crypto.createHash('sha256').update(hwFingerprint + installDate + 'marker1').digest('hex');
    markers.push(marker1);

    const marker2 = crypto.createHash('sha256').update(hwFingerprint + timestamp + 'marker2').digest('hex');
    markers.push(marker2);

    const marker3 = crypto.createHash('sha256').update(marker1 + marker2 + installDate).digest('hex');
    markers.push(marker3);

    const securityData = {
      markers,
      createdAt: new Date().toISOString(),
      version: '1.0',
      hardwareFingerprint: hwFingerprint
    };

    fs.writeFileSync(securityFile, JSON.stringify(securityData, null, 2));
    console.log('\n✓ 安全标记文件已更新');
    console.log('新硬件指纹:', hwFingerprint.substring(0, 32) + '...');

  } catch (error) {
    console.error('\n✗ 更新失败:', error.message);
    process.exit(1);
  }
}

updateSecurityMarkers();
