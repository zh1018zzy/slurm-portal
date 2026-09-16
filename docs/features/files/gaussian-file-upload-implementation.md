# Gaussian应用文件上传功能实现

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

用户反馈Gaussian应用作业配置中的输入文件字段没有显示上传框，虽然应用模板配置正确，但相关功能未实现。

## 问题分析

经过检查发现以下问题：

1. **前端组件缺失**：`DynamicForm.tsx`组件中缺少对`file`类型字段的处理逻辑
2. **API支持不完整**：应用提交API没有处理文件上传的multipart/form-data请求
3. **文件处理缺失**：后端没有将上传的文件保存到作业目录

## 解决方案

### 1. 前端文件上传组件实现

#### 修改 `components/applications/DynamicForm.tsx`

添加了文件上传字段的处理逻辑：

```typescript
{field.type === 'file' && (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative"
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = field.accept?.join(',') || '*'
          input.multiple = field.multiple || false
          input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || [])
            if (field.multiple) {
              handleFieldChange(field.name, files)
            } else {
              handleFieldChange(field.name, files[0] || null)
            }
          }
          input.click()
        }}
      >
        <Upload className="h-4 w-4 mr-2" />
        选择文件
      </Button>
      {field.accept && (
        <span className="text-sm text-muted-foreground">
          支持: {field.accept.join(', ')}
        </span>
      )}
    </div>
    
    {/* 显示已选择的文件 */}
    {formData[field.name] && (
      <div className="space-y-1">
        {/* 文件列表显示逻辑 */}
      </div>
    )}
  </div>
)}
```

#### 智能提交逻辑

根据是否包含文件选择不同的提交方式：

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  
  // 检查是否有文件需要上传
  const hasFiles = application.interface.form.some(field => 
    field.type === 'file' && formData[field.name]
  )
  
  if (hasFiles) {
    // 如果有文件，使用FormData上传
    const formDataObj = new FormData()
    // 添加所有表单数据...
    onSubmit(formDataObj)
  } else {
    // 没有文件，使用JSON提交
    onSubmit(formData)
  }
}
```

### 2. 后端API文件上传支持

#### 修改 `app/api/applications/[id]/submit/route.ts`

添加了multipart/form-data请求处理：

```typescript
// 检查请求内容类型
const contentType = request.headers.get('content-type') || ''

let formData: any
let uploadedFiles: { [key: string]: File } = {}

if (contentType.includes('multipart/form-data')) {
  // 处理文件上传
  const formDataObj = await request.formData()
  formData = {}
  uploadedFiles = {}
  
  for (const [key, value] of Array.from(formDataObj.entries())) {
    if (value instanceof File) {
      uploadedFiles[key] = value
      formData[key] = value.name
    } else {
      formData[key] = value
    }
  }
} else {
  // 处理JSON数据
  formData = await request.json()
}
```

#### 文件保存逻辑

```typescript
// 处理上传的文件
const jobDir = `/tmp/job-${Date.now()}-${randomUUID().substring(0, 8)}`
await mkdir(jobDir, { recursive: true })

// 上传文件到作业目录
for (const [fieldName, file] of Object.entries(uploadedFiles)) {
  const filePath = path.join(jobDir, file.name)
  const bytes = await file.arrayBuffer()
  await writeFile(filePath, new Uint8Array(bytes))
  
  // 更新formData中的文件路径
  formData[fieldName] = path.join(jobDir, file.name)
}
```

### 3. 前端提交逻辑优化

#### 修改 `app/dashboard/applications/hpc/page.tsx`

添加了FormData和JSON提交的智能切换：

```typescript
const handleFormSubmit = async (formData: any) => {
  // 检查是否是FormData（包含文件上传）
  const isFormData = formData instanceof FormData
  
  let response: Response
  
  if (isFormData) {
    // 添加版本信息到FormData
    formData.append('version', selectedApp.metadata.version)
    
    response = await fetch(`/api/applications/${selectedApp.metadata.name}/submit`, {
      method: 'POST',
      body: formData // 不设置Content-Type，让浏览器自动设置multipart/form-data
    })
  } else {
    // 使用JSON提交
    response = await fetch(`/api/applications/${selectedApp.metadata.name}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...formData,
        version: selectedApp.metadata.version
      })
    })
  }
}
```

## 功能特性

### ✅ 已实现功能

1. **文件上传界面**：
   - 支持单文件和多文件上传
   - 文件类型限制（通过accept属性）
   - 文件大小显示
   - 文件删除功能

2. **智能提交**：
   - 自动检测是否包含文件
   - 有文件时使用FormData提交
   - 无文件时使用JSON提交

3. **文件处理**：
   - 文件保存到临时作业目录
   - 文件路径传递给作业脚本
   - 支持多种文件格式

4. **用户体验**：
   - 文件选择按钮
   - 文件列表显示
   - 文件删除按钮
   - 支持的文件类型提示

### 🔧 技术实现

1. **前端组件**：
   - 动态表单字段渲染
   - 文件选择和预览
   - FormData构建和提交

2. **后端API**：
   - multipart/form-data请求处理
   - 文件保存和管理
   - 作业目录创建

3. **文件管理**：
   - 临时目录创建
   - 文件路径映射
   - 作业脚本变量替换

## 测试验证

### 测试脚本

创建了 `scripts/test-gaussian-file-upload.js` 测试脚本：

```bash
node scripts/test-gaussian-file-upload.js
```

### 测试内容

1. **应用信息获取**：验证Gaussian应用是否正确配置
2. **文件上传测试**：创建测试.gjf文件并上传
3. **作业提交测试**：验证文件上传后的作业提交
4. **响应验证**：检查返回的作业ID和文件信息

## 使用说明

### 对于用户

1. **访问应用中心**：进入 `/dashboard/applications/hpc`
2. **选择Gaussian应用**：点击Gaussian应用卡片
3. **填写表单**：
   - 输入作业名称
   - 点击"选择文件"按钮上传.gjf或.com文件
   - 配置计算资源参数
4. **提交作业**：点击"提交作业"按钮

### 对于开发者

1. **添加文件字段**：在应用配置中添加`type: 'file'`的字段
2. **配置文件类型**：使用`accept`属性限制文件类型
3. **模板变量**：在作业脚本中使用`{{fieldName}}`引用文件路径

## 配置示例

### Gaussian应用配置

```typescript
{
  name: 'inputFile',
  label: '输入文件',
  type: 'file',
  accept: ['.gjf', '.com'],
  required: true,
  help: {
    text: '上传Gaussian输入文件（.gjf或.com格式）'
  }
}
```

### 作业脚本模板

```bash
#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --nodes={{nodes}}
#SBATCH --ntasks={{ntasks}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition={{partition}}

module load gaussian/16
g16 < {{inputFile}} > {{outputFile}}
```

## 总结

通过以上实现，Gaussian应用的文件上传功能已经完整实现：

- ✅ 前端显示文件上传界面
- ✅ 支持文件选择和预览
- ✅ 后端处理文件上传
- ✅ 文件保存到作业目录
- ✅ 作业脚本正确引用文件路径
- ✅ 智能提交逻辑（FormData vs JSON）

现在用户可以在Gaussian应用配置中看到文件上传框，并成功上传.gjf或.com文件进行作业提交。 
