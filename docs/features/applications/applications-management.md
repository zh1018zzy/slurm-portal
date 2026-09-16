# 应用管理功能

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

应用管理功能允许管理员创建、编辑、删除和管理集群应用，包括应用信息、权限配置、动态表单和脚本模板等。

## 功能特性

### 🎯 核心功能
- **应用管理**：创建、编辑、删除应用
- **动态表单**：配置应用参数表单，支持多种字段类型
- **脚本模板**：定义作业脚本模板，支持参数替换
- **权限控制**：配置应用访问权限
- **状态管理**：草稿、启用、禁用状态

### 📊 字段类型支持
- **文本 (text)**：单行文本输入
- **数字 (number)**：数值输入，支持最小/最大值
- **选择 (select)**：下拉选择框
- **多行文本 (textarea)**：多行文本输入
- **复选框 (checkbox)**：布尔值选择

### 🔐 权限管理
- **角色权限**：基于用户角色的访问控制
- **部门权限**：基于部门的访问控制
- **用户权限**：针对特定用户的权限设置
- **权限类型**：查看、提交、管理权限

## 数据库结构

### applications 表
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,           -- 应用名称
  description TEXT,                     -- 应用描述
  icon TEXT,                           -- 应用图标
  category VARCHAR(64),                 -- 应用分类
  tags TEXT[],                         -- 应用标签
  fields JSONB NOT NULL DEFAULT '[]',   -- 表单字段配置
  script_template TEXT NOT NULL,        -- 脚本模板
  status VARCHAR(32) NOT NULL DEFAULT 'draft', -- 状态
  form_version INTEGER NOT NULL DEFAULT 1,     -- 表单版本
  permissions JSONB DEFAULT '{}',       -- 权限配置
  created_by VARCHAR(64),               -- 创建者
  updated_by VARCHAR(64),               -- 更新者
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### application_permissions 表
```sql
CREATE TABLE application_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  role_id VARCHAR(64),                  -- 角色ID
  department_id VARCHAR(64),            -- 部门ID
  user_id VARCHAR(64),                  -- 用户ID
  permission_type VARCHAR(32) NOT NULL, -- 权限类型: view, submit, admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(application_id, role_id, department_id, user_id, permission_type)
);
```

## API 接口

### 应用列表
```
GET /api/applications
参数:
- page: 页码 (默认: 1)
- pageSize: 每页数量 (默认: 20)
- q: 搜索关键词
- category: 分类筛选
- status: 状态筛选
```

### 创建应用
```
POST /api/applications
Body:
{
  "name": "应用名称",
  "description": "应用描述",
  "category": "分类",
  "fields": [...],           // 表单字段配置
  "script_template": "...",  // 脚本模板
  "status": "draft",         // 状态
  "permissions": {...}       // 权限配置
}
```

### 更新应用
```
PUT /api/applications/[id]
Body: 同创建应用
```

### 删除应用
```
DELETE /api/applications/[id]
```

## 使用指南

### 1. 数据库初始化
```bash
# 执行数据库迁移脚本
./scripts/setup-applications.sh
```

### 2. 访问应用管理
1. 登录系统（需要管理员权限）
2. 进入系统管理页面：`/dashboard/system`
3. 点击"管理应用"按钮
4. 进入HPC应用管理页面：`/dashboard/system/applications/management`

### 3. 创建应用
1. 点击"创建应用"按钮
2. 填写基本信息：
   - 应用名称
   - 描述
   - 分类
   - 状态
3. 配置表单字段：
   - 添加字段（名称、标签、类型、是否必填）
   - 设置字段属性（默认值、描述、选项等）
4. 编写脚本模板：
   - 使用 `{{字段名}}` 语法引用表单字段
   - 示例：`#SBATCH -N {{nodes}}`
5. 保存应用

### 4. 编辑应用
1. 在应用列表中找到要编辑的应用
2. 点击"编辑"按钮
3. 修改应用信息
4. 保存更改

### 5. 删除应用
1. 在应用列表中找到要删除的应用
2. 点击"删除"按钮
3. 确认删除操作

## 脚本模板语法

### 参数替换
使用 `{{字段名}}` 语法在脚本模板中引用表单字段：

```bash
#!/bin/bash
#SBATCH -J {{name}}
#SBATCH -N {{nodes}}
#SBATCH -n {{cpus}}
#SBATCH --mem={{memory}}G
#SBATCH -t {{time}}
#SBATCH -p {{partition}}

# 执行应用命令
{{command}}
```

### 示例应用

#### MATLAB 应用
```json
{
  "name": "MATLAB",
  "description": "MATLAB 科学计算软件",
  "category": "科学计算",
  "fields": [
    {
      "name": "nodes",
      "label": "节点数",
      "type": "number",
      "required": true,
      "default": 1,
      "min": 1,
      "max": 10
    },
    {
      "name": "script",
      "label": "MATLAB脚本",
      "type": "textarea",
      "required": true,
      "description": "输入MATLAB代码"
    }
  ],
  "script_template": "#!/bin/bash\n#SBATCH -J {{name}}\n#SBATCH -N {{nodes}}\nmodule load matlab\nmatlab -batch \"{{script}}\""
}
```

#### Firefox 图形应用
```json
{
  "name": "Firefox",
  "description": "Firefox 网页浏览器",
  "category": "网络工具",
  "fields": [
    {
      "name": "nodes",
      "label": "节点数",
      "type": "number",
      "required": true,
      "default": 1,
      "min": 1,
      "max": 1
    }
  ],
  "script_template": "#!/bin/bash\n#SBATCH -J {{name}}\n#SBATCH -N {{nodes}}\n#SBATCH -p graphics\nmodule load firefox\nfirefox"
}
```

## 权限配置

### 权限结构
```json
{
  "permissions": {
    "roles": ["admin", "user"],
    "departments": ["计算机系", "物理系"],
    "users": ["user1", "user2"]
  }
}
```

### 权限类型
- **view**: 查看应用
- **submit**: 提交作业
- **admin**: 管理应用

## 注意事项

1. **权限要求**：只有管理员可以访问应用管理功能
2. **字段名称**：字段名称必须唯一，且只能包含字母、数字、下划线
3. **脚本模板**：确保脚本模板语法正确，避免语法错误
4. **状态管理**：只有启用状态的应用才会在应用中心显示
5. **数据备份**：删除应用前请确保已备份重要数据

## 故障排除

### 常见问题

1. **应用不显示**
   - 检查应用状态是否为 "active"
   - 检查用户权限配置
   - 检查应用分类设置

2. **表单字段错误**
   - 确保字段名称唯一
   - 检查字段类型配置
   - 验证必填字段设置

3. **脚本模板错误**
   - 检查参数引用语法 `{{字段名}}`
   - 验证脚本语法正确性
   - 确保字段名称匹配

### 日志查看
- 应用管理操作日志可在系统日志中查看
- 作业提交日志可在作业详情页面查看

## 更新日志

- **v1.0.0**: 初始版本，支持基本的应用管理功能
- **v1.1.0**: 添加权限管理功能
- **v1.2.0**: 支持动态表单配置
- **v1.3.0**: 添加脚本模板功能 

## 应用中心“我的作业”图形作业识别机制

前端“我的作业”Tab 只展示 jobType 为 graphics 的作业。后端 /api/jobs 路由会根据如下规则补充 jobType 字段：

- job_type 字段为 'graphics'；
- params 字段中包含 vncDisplay；
- job_name 包含 'VNC'；
- script 字段包含 'vncserver'。

满足任一条件即判定为 graphics 作业，否则为 compute 作业。

这样前端过滤时能准确显示所有通过应用中心提交的图形作业。 
