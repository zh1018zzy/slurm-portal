# VNC URL 生成问题修复

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

VNC 作业已运行，但页面显示"VNC启动中..."，说明 `vncUrl` 没有正确生成。

## 问题分析

通过日志分析发现：
```
[getJobStatus] 作业 105 脚本路径不存在: 
```

问题根源：作业目录路径解析错误。

### 实际作业目录结构

作业目录命名规则不是简单的 `job_${jobId}`，而是包含时间戳和随机字符串：
- **错误路径**: `/home/testuser3/my-jobs/job_105/`
- **正确路径**: `/home/testuser3/my-jobs/job_1753253946290_d03f35dfcf16/`

### scontrol 输出分析

```bash
$ scontrol show job 105
Command=/home/testuser3/my-jobs/job_1753253946290_d03f35dfcf16/job.sh
```

## 解决方案

### 1. 修复路径解析逻辑

在 `getJobStatus` 方法中，从 `scontrol show job` 的 `Command` 字段解析实际作业目录：

```typescript
// 从 Command 字段解析实际的作业目录
const commandMatch = /Command=([^\s]+)/.exec(scontrolRaw)
let jobFolder = ''
if (commandMatch) {
  // Command 格式: /home/username/my-jobs/job_timestamp_random/job.sh
  const commandPath = commandMatch[1]
  jobFolder = commandPath.replace('/job.sh', '')
} else {
  // 回退到默认路径
  jobFolder = username ? `/home/${username}/my-jobs/job_${jobId}` : ''
}
```

### 2. 同时修复 sacct 和 squeue 查询路径

- **sacct 查询路径**: 主要查询方式
- **squeue 回退路径**: 备用查询方式

### 3. 增强调试功能

添加详细的调试日志：
```typescript
console.log(`[getJobStatus] 作业 ${jobId} 解析路径:`, { username, jobFolder, scriptPath })
```

## 修复验证

### 测试脚本验证

创建测试脚本验证修复效果：
```javascript
// 解析 Command 字段
const commandMatch = /Command=([^\s]+)/.exec(scontrolOutput);
const jobFolder = commandPath.replace('/job.sh', '');

// 读取脚本内容
const scriptContent = execSync(`cat ${jobFolder}/job.sh`, { encoding: 'utf8' });

// 提取 display 信息
const displayMatch = /DISPLAY=:(\d+)/.exec(scriptContent);
const display = parseInt(displayMatch[1]);
const port = 5900 + display;

// 生成 VNC URL
const vncUrl = `http://192.168.1.10:6080/vnc.html?host=compute-node-01&port=${port}`;
```

### 测试结果

```
解析的作业目录: /home/testuser3/my-jobs/job_1753253946290_d03f35dfcf16
脚本包含 vncserver: true
脚本包含 VNC: true
Display: 101
Port: 6001
生成的 VNC URL: http://192.168.1.10:6080/vnc.html?host=compute-node-01&port=6001
测试结果: ✅ 成功
```

## 修复效果

修复后，VNC 作业应该能正确显示：
- ✅ **正确解析作业目录路径**
- ✅ **成功读取 VNC 脚本内容**
- ✅ **正确提取 display 和 port 信息**
- ✅ **生成正确的 noVNC URL**
- ✅ **前端显示"noVNC访问"按钮**

## 相关文件

- `lib/scheduler/slurm-adapter.ts` - 主要修复文件
- `app/api/debug/vnc-jobs/route.ts` - 调试 API
- `app/dashboard/applications/page.tsx` - 前端调试按钮 
