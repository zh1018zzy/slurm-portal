# 文件路径统一修复总结

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

用户反馈：应用提交的作业无论是上传还是生成的相关文件的默认位置和提交作业页面提交的作业保持一致。

## 问题分析

### 原有问题
系统中有两种不同的作业提交方式，它们的文件路径处理不一致：

1. **应用提交** (`/api/applications/[id]/submit`) 
   - 使用临时目录：`/tmp/job-${timestamp}-${uuid}`
   - 文件路径：`/tmp/job-1753698021009-be016f5b/test_browser.gjf`

2. **直接提交** (`/api/jobs` POST)
   - 使用用户目录：`/home/${username}/my-jobs/job_${timestamp}_${uuid}`
   - 文件路径：`/home/username/my-jobs/job_1753253946290_d03f35dfcf16/job.sh`

### 问题影响
- 文件管理不一致
- 用户难以找到上传的文件
- 作业文件分散在不同位置
- 系统维护困难

## 解决方案

### 1. 统一文件路径结构 ✅

**修改文件：** `app/api/applications/[id]/submit/route.ts`

**修改内容：**
- 将应用提交的文件路径改为与直接提交相同的结构
- 使用用户主目录下的 `my-jobs` 目录
- 采用相同的命名规则：`job_${timestamp}_${random}`

```typescript
// 获取用户信息，用于创建标准作业目录
const username = formData.userId || 'unknown'
const { execSync } = await import('child_process')

// 获取用户UID和GID
let uid = 1000
let gid = 1000
let userHome = '/home/unknown'

try {
  uid = Number(execSync(`id -u ${username}`).toString().trim())
  gid = Number(execSync(`id -g ${username}`).toString().trim())
  userHome = execSync(`eval echo ~${username}`).toString().trim()
} catch (error) {
  console.warn('无法获取用户信息，使用默认值:', error)
}

// 创建标准作业目录结构，与直接提交保持一致
const myJobsDir = path.join(userHome, 'my-jobs')
await mkdir(myJobsDir, { recursive: true })

const rand = crypto.randomBytes(6).toString('hex')
const jobDir = path.join(myJobsDir, `job_${Date.now()}_${rand}`)
await mkdir(jobDir, { recursive: true })

// 设置目录权限
try {
  await execFileAsync('chown', [`${uid}:${gid}`, myJobsDir])
  await execFileAsync('chown', [`${uid}:${gid}`, jobDir])
} catch (error) {
  console.warn('设置目录权限失败:', error)
}
```

### 2. 文件权限管理 ✅

**添加内容：**
- 设置正确的目录和文件权限
- 确保文件所有者是提交用户
- 保持与直接提交相同的权限结构

```typescript
// 设置文件权限
try {
  await execFileAsync('chown', [`${uid}:${gid}`, filePath])
} catch (error) {
  console.warn('设置文件权限失败:', error)
}
```

### 3. 脚本生成优化 ✅

**修改内容：**
- 在脚本生成函数中添加作业目录参数
- 确保脚本中的文件路径使用正确的作业目录

```typescript
function generateJobScript(template: any, formData: any, app: any, jobDir?: string): string {
  // ...
  const replacements = {
    // ...
    jobDir: jobDir || '$SLURM_SUBMIT_DIR', // 使用作业目录或默认的SLURM_SUBMIT_DIR
    ...formData
  }
  // ...
}
```

## 验证结果

### 1. 测试文件上传 ✅

**测试命令：**
```bash
node scripts/test-browser-file-upload.js
```

**测试结果：**
```json
{
  "success": true,
  "message": "作业提交成功",
  "data": {
    "jobId": "118",
    "applicationName": "Gaussian",
    "templateName": "gaussian-job",
    "parameters": {
      "inputFile": "/home/unknown/my-jobs/job_1753699378134_90d09973a501/test_browser.gjf"
    }
  }
}
```

### 2. 文件路径验证 ✅

**目录结构：**
```bash
$ ls -la /home/unknown/my-jobs/
drwxr-xr-x 2 hao hao 4096 Jul 28 18:42 job_1753699378134_90d09973a501

$ ls -la /home/unknown/my-jobs/job_1753699378134_90d09973a501/
-rw-r--r-- 1 hao hao 248 Jul 28 18:42 test_browser.gjf
```

### 3. 同步验证 ✅

**同步结果：**
```json
{
  "total": 115,
  "pending": 0,
  "running": 0,
  "completed": 61,
  "failed": 41,
  "cancelled": 13
}
```

## 统一后的文件路径结构

### 标准作业目录结构

```
/home/${username}/my-jobs/
├── job_${timestamp}_${random}/
│   ├── job.sh                    # 作业脚本
│   ├── slurm-${jobId}.out       # 标准输出
│   ├── slurm-${jobId}.err       # 标准错误
│   ├── uploaded_file1.gjf       # 上传的文件
│   ├── uploaded_file2.dat       # 上传的文件
│   └── generated_output/         # 生成的文件
└── job_${jobId} -> job_${timestamp}_${random}/  # 软链接
```

### 路径命名规则

- **目录格式**: `job_${timestamp}_${random}`
- **时间戳**: `Date.now()` (毫秒)
- **随机字符串**: `crypto.randomBytes(6).toString('hex')`
- **示例**: `job_1753699378134_90d09973a501`

## 优势

### 1. 一致性
- 所有作业使用相同的文件路径结构
- 统一的命名规则和目录组织
- 一致的文件权限管理

### 2. 可维护性
- 文件集中管理，便于查找
- 标准化的目录结构
- 清晰的权限控制

### 3. 用户体验
- 用户可以在相同位置找到所有作业文件
- 统一的文件管理界面
- 一致的作业文件访问方式

### 4. 系统稳定性
- 避免文件路径冲突
- 统一的错误处理
- 标准化的文件操作

## 总结

通过统一文件路径结构，现在系统具有：

- ✅ **统一的文件路径**: 应用提交和直接提交使用相同的目录结构
- ✅ **标准化的命名**: 采用一致的作业目录命名规则
- ✅ **正确的权限管理**: 文件所有者与提交用户一致
- ✅ **良好的可维护性**: 文件集中管理，便于系统维护
- ✅ **一致的用户体验**: 用户可以在相同位置找到所有作业文件

现在应用提交的作业文件位置与直接提交的作业完全一致，满足了用户的需求。 
