# HPC应用中心实施指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 概述

本文档提供了HPC应用中心的完整实施指南，该系统旨在创建一个可扩展、可维护的平台，用于集成和管理各种HPC集群应用程序。

## 架构设计

### 核心组件

1. **应用规范系统** (`lib/hpc-application-spec.ts`)
   - 标准化的应用描述格式
   - 支持多种应用类型和执行模式
   - 灵活的资源配置和用户界面定义

2. **应用注册表** (`lib/application-registry.ts`)
   - 应用发现和管理
   - 自动从Environment Modules和Spack发现
   - 基于分类和标签的搜索功能

3. **资源调度器** (`lib/resource-scheduler.ts`)
   - 智能资源推荐
   - 基于历史数据的优化
   - 多维度资源验证

4. **示例应用** (`lib/applications/examples.ts`)
   - MATLAB和Gaussian完整配置示例
   - 最佳实践参考

## 数据库设计

### 核心表结构

```sql
-- 扩展应用表，支持新的规范格式
CREATE TABLE hpc_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_version VARCHAR(16) NOT NULL DEFAULT 'v1.0',
  metadata JSONB NOT NULL,
  requirements JSONB NOT NULL,
  resources JSONB NOT NULL,
  execution JSONB NOT NULL,
  interface JSONB NOT NULL,
  io JSONB,
  monitoring JSONB,
  access JSONB,
  extensions JSONB,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 应用使用统计表
CREATE TABLE hpc_application_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES hpc_applications(id),
  user_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(64),
  resources_used JSONB,
  execution_time INTEGER, -- 秒
  status VARCHAR(32),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 资源使用历史表（用于机器学习优化）
CREATE TABLE hpc_resource_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_name VARCHAR(128) NOT NULL,
  user_input JSONB,
  resources_allocated JSONB,
  resources_used JSONB,
  efficiency_metrics JSONB,
  execution_time INTEGER,
  success BOOLEAN,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 应用发现缓存表
CREATE TABLE hpc_discovered_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name VARCHAR(128) NOT NULL,
  module_version VARCHAR(64),
  full_name VARCHAR(256),
  discovery_source VARCHAR(32), -- 'modules', 'spack', 'manual'
  metadata JSONB,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module_name, module_version, discovery_source)
);
```

### 索引和优化

```sql
-- 性能索引
CREATE INDEX idx_hpc_apps_metadata_name ON hpc_applications ((metadata->>'name'));
CREATE INDEX idx_hpc_apps_metadata_category ON hpc_applications ((metadata->>'category'));
CREATE INDEX idx_hpc_apps_metadata_tags ON hpc_applications USING GIN ((metadata->'tags'));
CREATE INDEX idx_hpc_usage_app_user ON hpc_application_usage(application_id, user_id);
CREATE INDEX idx_hpc_resource_history_app ON hpc_resource_history(application_name);
CREATE INDEX idx_hpc_discovered_modules_name ON hpc_discovered_modules(module_name);

-- 全文搜索索引（使用辅助函数避免子查询问题）
CREATE OR REPLACE FUNCTION hpc_app_search_text(metadata jsonb) 
RETURNS text AS $$
BEGIN
  RETURN COALESCE(metadata->>'name', '') || ' ' ||
         COALESCE(metadata->>'displayName', '') || ' ' ||
         COALESCE(metadata->>'description', '') || ' ' ||
         COALESCE(metadata->>'tags'::text, '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE INDEX idx_hpc_apps_search ON hpc_applications USING GIN (
  to_tsvector('simple', hpc_app_search_text(metadata))
);
```

## API设计

### RESTful API端点

```typescript
// /api/applications - 应用管理
interface ApplicationAPI {
  // 获取所有应用
  GET /api/applications
  
  // 按分类获取应用
  GET /api/applications?category=scientific-computing
  
  // 搜索应用
  GET /api/applications/search?q=matlab&tags=numerical-computing
  
  // 获取特定应用
  GET /api/applications/:name
  GET /api/applications/:name/:version
  
  // 管理员：创建/更新应用
  POST /api/applications
  PUT /api/applications/:id
  DELETE /api/applications/:id
}

// /api/applications/:name/submit - 作业提交
interface JobSubmissionAPI {
  // 获取应用表单配置
  GET /api/applications/:name/form
  
  // 验证表单数据
  POST /api/applications/:name/validate
  
  // 获取资源推荐
  POST /api/applications/:name/recommend
  
  // 提交作业
  POST /api/applications/:name/submit
  
  // 预览生成的脚本
  POST /api/applications/:name/preview
}

// /api/discovery - 应用发现
interface DiscoveryAPI {
  // 触发应用发现
  POST /api/discovery/scan
  
  // 获取发现的模块
  GET /api/discovery/modules
  
  // 将模块转换为应用
  POST /api/discovery/modules/:name/convert
}
```

### API实现示例

```typescript
// app/api/applications/route.ts
import { applicationRegistry } from '@/lib/application-registry'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const query = searchParams.get('q')
  const tags = searchParams.get('tags')?.split(',')

  if (query || category || tags) {
    const results = applicationRegistry.search({
      keyword: query || undefined,
      category: category as any,
      tags: tags || undefined
    })
    return NextResponse.json(results)
  }

  const applications = applicationRegistry.getAll()
  return NextResponse.json(applications)
}

// app/api/applications/[name]/submit/route.ts
import { resourceScheduler } from '@/lib/resource-scheduler'
import { submitJob } from '@/lib/slurm'

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const { name } = params
  const formData = await request.json()
  
  // 获取应用规范
  const app = applicationRegistry.get(name)
  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }
  
  // 资源推荐和验证
  const recommendation = await resourceScheduler.recommendResources(app, formData)
  const validation = resourceScheduler.validateResourceConfiguration(app, recommendation.profile)
  
  if (!validation.valid) {
    return NextResponse.json({ 
      error: 'Invalid configuration', 
      details: validation.errors 
    }, { status: 400 })
  }
  
  // 生成脚本
  const script = generateScript(app, formData, recommendation.profile)
  
  // 提交作业
  const jobId = await submitJob(script, recommendation.profile)
  
  // 记录使用统计
  await recordUsage(app.metadata.name, formData, recommendation.profile, jobId)
  
  return NextResponse.json({
    jobId,
    recommendation,
    script: script.substring(0, 500) + '...' // 截断显示
  })
}
```

## 前端组件设计

### 应用中心主页

```typescript
// app/dashboard/applications/page.tsx
'use client'

import { ApplicationCard } from '@/components/applications/ApplicationCard'
import { ApplicationFilter } from '@/components/applications/ApplicationFilter'
import { useApplications } from '@/hooks/useApplications'

export default function ApplicationsPage() {
  const { applications, categories, loading, search, filter } = useApplications()

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">应用中心</h1>
        <ApplicationFilter 
          categories={categories}
          onFilter={filter}
          onSearch={search}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {applications.map((app) => (
          <ApplicationCard
            key={`${app.metadata.name}@${app.metadata.version}`}
            application={app}
          />
        ))}
      </div>
    </div>
  )
}
```

### 动态表单组件

```typescript
// components/applications/DynamicForm.tsx
'use client'

import { HpcApplicationSpec, FormField } from '@/lib/hpc-application-spec'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { generateZodSchema } from '@/lib/form-validation'

interface DynamicFormProps {
  application: HpcApplicationSpec
  onSubmit: (data: any) => void
  onRecommend?: (data: any) => void
}

export function DynamicForm({ application, onSubmit, onRecommend }: DynamicFormProps) {
  const schema = generateZodSchema(application.interface.form)
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(application.interface.form)
  })

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return <TextInput field={field} form={form} />
      case 'number':
        return <NumberInput field={field} form={form} />
      case 'select':
        return <SelectInput field={field} form={form} />
      case 'textarea':
        return <TextareaInput field={field} form={form} />
      case 'file':
        return <FileInput field={field} form={form} />
      case 'boolean':
        return <BooleanInput field={field} form={form} />
      case 'slider':
        return <SliderInput field={field} form={form} />
      default:
        return null
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {application.interface.form.map((field) => (
        <div key={field.name}>
          {renderField(field)}
        </div>
      ))}
      
      <div className="flex gap-4">
        {onRecommend && (
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onRecommend(form.getValues())}
          >
            获取资源推荐
          </Button>
        )}
        <Button type="submit">提交作业</Button>
      </div>
    </form>
  )
}
```

### 资源推荐组件

```typescript
// components/applications/ResourceRecommendation.tsx
interface ResourceRecommendationProps {
  recommendation: ResourceRecommendation
  onApply: (profile: ResourceProfile) => void
}

export function ResourceRecommendation({ recommendation, onApply }: ResourceRecommendationProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          资源推荐
          <Badge variant="outline">
            置信度: {Math.round(recommendation.confidence * 100)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label>节点数</Label>
            <div className="font-mono">{recommendation.profile.nodes}</div>
          </div>
          <div>
            <Label>CPU核心</Label>
            <div className="font-mono">{recommendation.profile.cpusPerTask}</div>
          </div>
          <div>
            <Label>内存</Label>
            <div className="font-mono">{recommendation.profile.memory}</div>
          </div>
          <div>
            <Label>运行时间</Label>
            <div className="font-mono">{recommendation.profile.walltime}</div>
          </div>
        </div>
        
        <div className="mb-4">
          <Label>推荐理由</Label>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            {recommendation.reasoning.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
        
        <Button onClick={() => onApply(recommendation.profile)}>
          应用推荐配置
        </Button>
      </CardContent>
    </Card>
  )
}
```

## 部署策略

### 1. 开发环境设置

```bash
# 安装依赖
npm install

# 设置环境变量
cp .env.example .env.local

# 初始化数据库
npm run db:migrate
npm run db:seed

# 启动开发服务器
npm run dev
```

### 2. 数据库迁移

```typescript
// scripts/migrate-applications.ts
import { supabase } from '@/lib/supabase'
import { applicationRegistry } from '@/lib/application-registry'
import { matlabApp, gaussianApp } from '@/lib/applications/examples'

async function migrateApplications() {
  // 注册示例应用
  applicationRegistry.register(matlabApp)
  applicationRegistry.register(gaussianApp)
  
  // 同步到数据库
  for (const app of applicationRegistry.getAll()) {
    await supabase.from('hpc_applications').upsert({
      metadata: app.metadata,
      requirements: app.requirements,
      resources: app.resources,
      execution: app.execution,
      interface: app.interface,
      io: app.io,
      monitoring: app.monitoring,
      access: app.access,
      extensions: app.extensions
    })
  }
  
  console.log('Applications migrated successfully')
}
```

### 3. 生产环境配置

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    volumes:
      - /opt/hpc-data:/app/data
      - /etc/slurm:/etc/slurm:ro

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: hpc_apps
      POSTGRES_USER: hpc_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:
```

### 4. 监控和日志

```typescript
// lib/monitoring.ts
import { createLogger } from 'winston'

export const logger = createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
})

// 应用使用指标
export async function recordApplicationMetrics(
  appName: string, 
  userId: string, 
  action: string,
  metadata?: any
) {
  logger.info('Application usage', {
    application: appName,
    user: userId,
    action,
    metadata,
    timestamp: new Date().toISOString()
  })
  
  // 发送到监控系统（如Prometheus）
  // metrics.counter('hpc_application_usage_total').inc({
  //   application: appName,
  //   action
  // })
}
```

## 测试策略

### 1. 单元测试

```typescript
// __tests__/application-registry.test.ts
import { ApplicationRegistry } from '@/lib/application-registry'
import { matlabApp } from '@/lib/applications/examples'

describe('ApplicationRegistry', () => {
  let registry: ApplicationRegistry

  beforeEach(() => {
    registry = ApplicationRegistry.getInstance()
  })

  test('should register and retrieve applications', () => {
    registry.register(matlabApp)
    
    const retrieved = registry.get('matlab', 'R2023b')
    expect(retrieved).toBeDefined()
    expect(retrieved?.metadata.name).toBe('matlab')
  })

  test('should search applications by keyword', () => {
    registry.register(matlabApp)
    
    const results = registry.search({ keyword: 'numerical' })
    expect(results).toHaveLength(1)
    expect(results[0].metadata.name).toBe('matlab')
  })
})
```

### 2. 集成测试

```typescript
// __tests__/api/applications.test.ts
import { GET, POST } from '@/app/api/applications/route'
import { NextRequest } from 'next/server'

describe('/api/applications', () => {
  test('GET should return all applications', async () => {
    const request = new NextRequest('http://localhost:3000/api/applications')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('POST should create new application', async () => {
    const appData = {
      metadata: {
        name: 'test-app',
        version: '1.0',
        description: 'Test application'
      }
      // ... other required fields
    }
    
    const request = new NextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(appData)
    })
    
    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})
```

### 3. 端到端测试

```typescript
// e2e/application-submission.spec.ts
import { test, expect } from '@playwright/test'

test('complete application submission flow', async ({ page }) => {
  await page.goto('/dashboard/applications')
  
  // 点击MATLAB应用
  await page.click('[data-testid="app-matlab"]')
  
  // 填写表单
  await page.fill('[name="jobName"]', 'test-matlab-job')
  await page.selectOption('[name="resourceProfile"]', 'default')
  await page.fill('[name="matlabCode"]', 'disp("Hello World")')
  
  // 获取资源推荐
  await page.click('[data-testid="get-recommendation"]')
  await expect(page.locator('[data-testid="recommendation"]')).toBeVisible()
  
  // 提交作业
  await page.click('[data-testid="submit-job"]')
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
})
```

## 维护和更新

### 1. 应用版本管理

- 使用语义化版本控制
- 向后兼容的API设计
- 数据库模式版本控制

### 2. 性能优化

- 应用发现结果缓存
- 资源推荐算法优化
- 数据库查询优化

### 3. 安全考虑

- 输入验证和清理
- RBAC权限控制
- 审计日志

### 4. 扩展性规划

- 插件系统架构
- 微服务拆分准备
- 容器化部署

## 总结

本实施指南提供了HPC应用中心的完整架构和实现细节。通过标准化的应用规范、智能的资源调度和灵活的用户界面，该系统能够有效支持各种HPC应用的集成和管理。

关键成功因素：
1. **标准化**：统一的应用描述格式
2. **自动化**：应用发现和资源优化
3. **可扩展性**：支持新应用类型和资源类型
4. **用户体验**：直观的界面和智能推荐
5. **可维护性**：清晰的代码架构和完善的测试
