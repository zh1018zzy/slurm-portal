# 应用作业提交用户身份修复总结

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

用户反馈：虽然应用作业提交成功了，但提交作业的用户还是root，需要参考计算作业提交逻辑完善应用作业提交。

## 问题分析

### 原有问题
- 应用作业提交API使用 `execFileAsync('sbatch', [scriptPath])` 直接以root身份提交
- 计算作业提交使用 `su -l ${username} -c "${sbatchCmd}"` 以用户身份提交
- 导致应用作业在Slurm中显示为root用户，而不是实际提交用户

### 问题影响
- 作业所有权不正确
- 用户无法正确识别自己的作业
- 与计算作业提交逻辑不一致
- 可能影响作业管理和权限控制

## 解决方案

### 1. 修改作业提交逻辑 ✅

**修改文件：** `app/api/applications/[id]/submit/route.ts`

**修改内容：**
- 参考slurm-adapter的提交逻辑
- 使用 `su -l ${username} -c "${sbatchCmd}"` 以用户身份提交
- 构建完整的sbatch参数

```typescript
// 提交作业到Slurm - 使用用户身份提交，而不是root
const sbatchArgs = [
  '-p', formData.partition || app.resources.default.partition || 'compute',
  '-J', formData.jobName || `${app.metadata.name}-job`,
  '-N', String(formData.nodes || app.resources.default.nodes || 1),
  '--cpus-per-task', String(formData.cpusPerTask || app.resources.default.cpusPerTask || 1),
  '-o', path.join(jobDir, 'slurm-%j.out'),
  '-e', path.join(jobDir, 'slurm-%j.err'),
  path.join(jobDir, 'job.sh')
]

// 如果有内存参数
if (formData.memory && formData.memory !== '0' && formData.memory !== '0G' && formData.memory !== '0M') {
  sbatchArgs.splice(-1, 0, '--mem', formData.memory)
}

// 如果有时间参数
if (formData.walltime && formData.walltime.trim()) {
  sbatchArgs.splice(-1, 0, '-t', formData.walltime)
}

const sbatchCmd = `sbatch ${sbatchArgs.map(a => `'${a.replace(/'/g, `'\\''`)}'`).join(' ')}`
const suCmd = `su -l ${username} -c "${sbatchCmd}"`

const { stdout, stderr } = await execFileAsync('sh', ['-c', suCmd])
```

### 2. 修改脚本文件位置 ✅

**修改内容：**
- 将脚本文件创建在作业目录中，而不是临时目录
- 设置正确的文件权限
- 与计算作业提交保持一致

```typescript
// 创建作业脚本文件在作业目录中
const scriptPath = path.join(jobDir, 'job.sh')

await writeFile(scriptPath, jobScript, 'utf8')

// 设置脚本文件权限
try {
  await execFileAsync('chown', [`${uid}:${gid}`, scriptPath])
  await execFileAsync('chmod', ['700', scriptPath])
} catch (error) {
  console.warn('设置脚本文件权限失败:', error)
}
```

### 3. 更新清理逻辑 ✅

**修改内容：**
- 移除临时文件清理逻辑
- 脚本文件现在在作业目录中，不需要单独清理

```typescript
// 脚本文件现在在作业目录中，不需要清理
```

## 验证结果

### 1. 作业提交验证 ✅

**测试结果：**
```json
{
  "success": true,
  "message": "作业提交成功",
  "data": {
    "jobId": "123",
    "applicationName": "Gaussian",
    "templateName": "gaussian-job",
    "parameters": {
      "inputFile": "/home/sc_admin/my-jobs/job_1753701085694_9cf35ec43122/test_auth.gjf"
    }
  }
}
```

### 2. Slurm作业状态验证 ✅

**squeue输出：**
```bash
$ squeue -j 123
             JOBID PARTITION     NAME     USER ST       TIME  NODES NODELIST(REASON)
               123   compute test-aut sc_admin PD       0:00      1 (PartitionConfig)
```

**验证要点：**
- ✅ 作业ID: 123 成功提交
- ✅ 用户: `sc_admin` (正确，不再是root)
- ✅ 作业名称: `test-aut` (正确)
- ✅ 分区: `compute` (正确)

### 3. 文件结构验证 ✅

**目录结构：**
```bash
$ ls -la /home/sc_admin/my-jobs/job_1753701085694_9cf35ec43122/
total 16
drwxr-xr-x  2 sc_admin 2000 4096 Jul 28 19:11 .
drwx------ 11 sc_admin 2000 4096 Jul 28 19:11 ..
-rwx------  1 sc_admin 2000  256 Jul 28 19:11 job.sh
-rw-r--r--  1 sc_admin 2000  248 Jul 28 19:11 test_auth.gjf
```

**验证要点：**
- ✅ 目录权限正确 (sc_admin:2000)
- ✅ 脚本文件权限正确 (700)
- ✅ 上传文件权限正确 (644)
- ✅ 文件内容完整

### 4. 数据库同步验证 ✅

**同步结果：**
```json
{
  "jobId": "123",
  "jobName": "test-auth-job",
  "user": "sc_admin",
  "status": "PENDING",
  "partition": "compute",
  "extra": {
    "scriptPath": "/home/sc_admin/my-jobs/job_1753701085694_9cf35ec43122/job.sh",
    "stdoutPath": "/home/sc_admin/my-jobs/job_1753701085694_9cf35ec43122/slurm-123.out",
    "stderrPath": "/home/sc_admin/my-jobs/job_1753701085694_9cf35ec43122/slurm-123.err"
  }
}
```

## 技术实现对比

### 修改前 vs 修改后

| 方面 | 修改前 | 修改后 |
|------|--------|--------|
| **提交方式** | `execFileAsync('sbatch', [scriptPath])` | `su -l ${username} -c "${sbatchCmd}"` |
| **用户身份** | root | 实际用户 (sc_admin) |
| **脚本位置** | `/tmp/${jobId}.sh` | `/home/${username}/my-jobs/job_${timestamp}_${random}/job.sh` |
| **文件权限** | root:root | 用户:用户组 |
| **清理逻辑** | 需要清理临时文件 | 无需清理 |

### 与计算作业提交的一致性

现在应用作业提交与计算作业提交完全一致：

1. **用户身份**: 都使用实际用户身份提交
2. **文件结构**: 都使用 `/home/${username}/my-jobs/job_${timestamp}_${random}/` 结构
3. **权限设置**: 都设置正确的用户权限
4. **提交方式**: 都使用 `su -l ${username} -c "${sbatchCmd}"` 方式

## 优势总结

### 1. 一致性 ✅
- 应用作业提交与计算作业提交逻辑完全一致
- 统一的用户身份管理
- 统一的文件路径结构

### 2. 安全性 ✅
- 正确的用户身份验证
- 适当的文件权限设置
- 防止权限混淆

### 3. 可维护性 ✅
- 清晰的代码结构
- 统一的错误处理
- 标准化的作业管理

### 4. 用户体验 ✅
- 用户可以在正确位置找到自己的作业
- 作业显示正确的用户身份
- 统一的作业管理界面

## 总结

通过这次修复，我们成功解决了应用作业提交的用户身份问题：

1. **用户身份正确** ✅
   - 作业现在以实际用户身份提交
   - Slurm显示正确的用户信息
   - 文件权限正确设置

2. **与计算作业一致** ✅
   - 使用相同的提交逻辑
   - 使用相同的文件结构
   - 使用相同的权限管理

3. **系统完整性** ✅
   - 所有作业提交方式现在完全一致
   - 统一的用户管理和权限控制
   - 标准化的作业生命周期管理

现在应用作业提交与计算作业提交在用户身份、文件结构、权限管理等方面完全一致，提供了统一的用户体验。 
