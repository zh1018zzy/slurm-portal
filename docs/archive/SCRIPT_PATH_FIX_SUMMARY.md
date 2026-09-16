# HPC应用脚本路径显示问题修复总结

> 适用范围：一次性排障、阶段总结、历史决策追溯（全项目）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题背景

用户反映在作业详情页面中，"脚本路径"字段显示的是完整的脚本内容，而不是脚本文件的路径。该问题同时影响HPC应用（ABAQUS、COMSOL等）和VNC应用。

## 问题分析

### 根本原因
1. **数据存储混乱**：作业提交时将脚本内容存储到 `script` 字段，但没有保存实际的脚本文件路径
2. **前端显示错误**：页面尝试显示 `job.extra?.scriptPath`，但该字段不存在，可能回退显示脚本内容
3. **文件API路径解析错误**：文件浏览API使用硬编码的 `job.sh` 文件名来解析目录，无法处理VNC的 `vnc_job.sh` 文件

### 数据流问题
```
作业提交 → job.script = "脚本内容" (❌ 错误)
         job.extra = {} (❌ 缺少路径信息)
         ↓
数据库    → script字段存储脚本内容 (❌ 应该存储路径)
         extra/params字段缺少路径 (❌ 应该包含路径)
         ↓  
前端显示  → 尝试显示路径但获取到脚本内容 (❌ 显示错误)
```

## 完整修复方案

### 1. 后端修复 - 作业提交路径保存

**文件位置**：`/opt/my-hpcapp/app/api/applications/[id]/submit/route.ts`

#### HPC应用修复 (行218-240)
```typescript
const jobData = {
  jobId: slurmJobId,
  user: username,
  jobName: formData.jobName || `${app.metadata.name}-job`,
  partition: cleanPartition,
  status: 'PENDING',
  submitTime: new Date().toISOString(),
  script: jobScript,
  extra: {
    applicationName: app.metadata.displayName || app.metadata.name,
    templateName: template.name,
    parameters: formData,
    uploadedFiles: Object.keys(uploadedFiles),
    jobDir: jobDir,
    scriptPath: scriptPath,        // 🔧 新增：保存脚本文件路径
    stdoutPath: path.join(jobDir, 'slurm-%j.out'), // 🔧 新增：标准输出路径
    stderrPath: path.join(jobDir, 'slurm-%j.err')  // 🔧 新增：标准错误路径
  }
}
```

#### VNC应用修复 (行517-525)
```typescript
extra: {
  applicationName: vncApp.name,
  vncApp: vncApp,
  parameters: formData,
  jobDir: jobDir,
  scriptPath: scriptPath,        // 🔧 新增：VNC脚本文件路径
  stdoutPath: path.join(jobDir, 'slurm-%j.out'), // 🔧 新增：VNC标准输出路径
  stderrPath: path.join(jobDir, 'slurm-%j.err')  // 🔧 新增：VNC标准错误路径
}
```

### 2. 前端修复 - 作业详情页面显示

**文件位置**：`/opt/my-hpcapp/app/dashboard/jobs/[id]/page.tsx`

#### 修复路径显示 (行585、589、593)
```typescript
// 脚本路径 - 优先从params读取，兼容extra
{job.params?.scriptPath || job.extra?.scriptPath || '-'}

// 标准输出路径
{job.params?.stdoutPath || job.extra?.stdoutPath || '-'}

// 错误输出路径
{job.params?.stderrPath || job.extra?.stderrPath || '-'}
```

### 3. 文件API修复 - 多种脚本文件支持

**文件位置**：
- `/opt/my-hpcapp/app/api/files/route.ts` (行168-177)
- `/opt/my-hpcapp/services/frontend/app/api/files/route.ts` (行168-177)

#### 智能脚本路径解析
```typescript
// 从脚本路径提取作业目录，支持多种脚本文件名
let realJobDir;
if (scriptPath.endsWith('/job.sh')) {
  realJobDir = scriptPath.replace(/\/job\.sh$/, '');        // HPC应用脚本
} else if (scriptPath.endsWith('/vnc_job.sh')) {
  realJobDir = scriptPath.replace(/\/vnc_job\.sh$/, '');    // VNC应用脚本
} else {
  // 通用处理：取脚本文件的父目录
  realJobDir = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
}
```

## 数据库字段说明

### 修复后的数据结构
```json
{
  "script": "/path/to/job/script.sh",     // 存储脚本文件路径（不是内容）
  "params": {                             // 存储作业额外信息
    "scriptPath": "/path/to/job/script.sh",
    "stdoutPath": "/path/to/job/slurm-%j.out",
    "stderrPath": "/path/to/job/slurm-%j.err",
    "jobDir": "/path/to/job/directory",
    "applicationName": "应用名称",
    "templateName": "模板名称",
    "parameters": { /* 用户输入参数 */ }
  }
}
```

### 数据流向说明
```
作业提交 → jobData.extra = {路径信息} ✅
         ↓
job-db.ts → 将extra保存到数据库的params字段 ✅
         ↓
前端页面 → 从params或extra字段读取路径信息 ✅
```

## 支持的应用类型

| 应用类型 | 脚本文件名 | 修复状态 | 示例应用 |
|---------|-----------|---------|---------|
| HPC应用 | `job.sh` | ✅ 已修复 | ABAQUS, COMSOL, ANSYS Fluent, Materials Studio |
| VNC应用 | `vnc_job.sh` | ✅ 已修复 | 系统桌面, MATLAB桌面 |
| 其他应用 | 任意名称 | ✅ 通用支持 | 自定义应用 |

## 测试验证

### HPC应用测试（作业194）
```bash
✅ script字段：/home/demo_user/my-jobs/job_1756216715090_f553bc037ef1/job.sh
✅ params.scriptPath：/home/demo_user/my-jobs/job_1756216715090_f553bc037ef1/job.sh
✅ params.stdoutPath：/home/demo_user/my-jobs/job_1756216715090_f553bc037ef1/slurm-%j.out
✅ params.stderrPath：/home/demo_user/my-jobs/job_1756216715090_f553bc037ef1/slurm-%j.err
```

### VNC应用测试（作业196）
```bash
✅ script字段：/home/demo_user/my-jobs/job_1756218500181_2e2f17b879cf/vnc_job.sh
✅ params.scriptPath：/home/demo_user/my-jobs/job_1756218500181_2e2f17b879cf/vnc_job.sh
✅ params.stdoutPath：/home/demo_user/my-jobs/job_1756218500181_2e2f17b879cf/slurm-%j.out
✅ params.stderrPath：/home/demo_user/my-jobs/job_1756218500181_2e2f17b879cf/slurm-%j.err
```

### 文件API测试
```bash
# 修复前：ENOTDIR错误
❌ 真实目录兜底失败: ENOTDIR: not a directory, scandir '/path/to/vnc_job.sh'

# 修复后：正常访问
✅ 文件API调用成功
✅ 文件数量: 3
✅ 实际目录: /home/demo_user/my-jobs/job_1756218500181_2e2f17b879cf
✅ 文件列表: vnc_job.sh, slurm-196.out, slurm-196.err
```

## 用户体验改善

### 修复前
```
脚本路径: #!/bin/bash
#SBATCH --job-name=test-job
#SBATCH --nodes=1
... (显示完整脚本内容，数百行)
```

### 修复后
```
脚本路径: /home/demo_user/my-jobs/job_1756216715090_f553bc037ef1/job.sh
标准输出路径: /home/demo_user/my-jobs/job_1756216715090_f553bc037ef1/slurm-%j.out
错误输出路径: /home/demo_user/my-jobs/job_1756216715090_f553bc037ef1/slurm-%j.err
```

## 部署步骤

1. **代码更新**：所有修改已完成并经过测试
2. **重新编译**：`npm run build`
3. **重启服务**：`pm2 restart 0`
4. **验证功能**：
   - 提交新的HPC作业，检查路径显示
   - 提交新的VNC作业，检查路径显示
   - 访问作业目录文件，确认无错误

## 相关问题解决

1. ✅ **脚本生成问题**：修复了default值处理，避免`--mem=default`错误
2. ✅ **作业详情显示**：路径字段现在显示文件路径而非脚本内容
3. ✅ **文件浏览功能**：支持访问不同类型的作业目录
4. ✅ **多节点资源配置**：支持1-3节点，最高192核心配置
5. ✅ **动态分区检测**：使用API动态获取可用分区

## 维护建议

1. **新增应用类型**：如果添加新类型的应用，请在文件API中添加对应的脚本文件名处理
2. **数据库清理**：考虑清理旧作业中的冗余脚本内容数据（可选）
3. **监控日志**：关注是否还有类似的`ENOTDIR`错误
4. **测试覆盖**：在添加新功能时确保路径处理逻辑的正确性

---

**修复完成日期**：2025-08-26  
**影响范围**：所有HPC应用和VNC应用的作业提交和管理功能  
**测试状态**：✅ 已通过功能测试和回归测试
