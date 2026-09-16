# 许可证检查实现指南

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🔧 问题解决

### 当前遇到的问题

1. **Edge Runtime 兼容性问题**
   - `lib/logger.ts` 使用了 Node.js 的 `path` 模块
   - 中间件运行在 Edge Runtime 中，不支持 Node.js 模块

2. **HTTP Headers 重复发送错误**
   - 中间件中可能重复设置了响应头

3. **类型错误**
   - `Response.json` 与 `NextResponse.json` 类型不匹配

## ✅ 解决方案

### 1. 简化中间件配置

```typescript
// middleware.ts - 简化版本
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // 跳过静态资源和许可证API
  if (request.nextUrl.pathname.startsWith('/_next/') ||
      request.nextUrl.pathname.startsWith('/favicon.') ||
      request.nextUrl.pathname.startsWith('/api/license/')) {
    return NextResponse.next()
  }

  // 开发环境下跳过许可证验证
  if (process.env.NODE_ENV === 'development' && 
      process.env.SKIP_LICENSE_VALIDATION === 'true') {
    return NextResponse.next()
  }

  // 生产环境下的基本保护
  if (process.env.NODE_ENV === 'production') {
    // 只对特定的API路由进行保护
    const protectedPaths = [
      '/api/jobs',
      '/api/files', 
      '/api/users',
      '/api/vnc',
      '/api/webshell'
    ]
    
    const isProtectedPath = protectedPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    )
    
    if (isProtectedPath) {
      // 在生产环境中，如果没有许可证，可以返回一个提示
      // 这里暂时允许访问，实际的许可证检查在API路由中进行
      console.log(`访问受保护路径: ${request.nextUrl.pathname}`)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### 2. 使用装饰器模式

```typescript
// lib/license/license-decorator.ts
import { NextRequest, NextResponse } from 'next/server'
import { FeatureModule } from './types'

/**
 * 许可证检查装饰器
 * 用于API路由的许可证验证
 */
export function withLicenseCheck(feature?: FeatureModule) {
  return function(handler: (req: NextRequest) => Promise<NextResponse>) {
    return async function(req: NextRequest): Promise<NextResponse> {
      try {
        // 开发环境下跳过许可证验证
        if (process.env.NODE_ENV === 'development' && 
            process.env.SKIP_LICENSE_VALIDATION === 'true') {
          return await handler(req)
        }

        // 检查许可证状态
        const licenseResponse = await fetch(`${req.nextUrl.origin}/api/license/status`)
        if (!licenseResponse.ok) {
          return NextResponse.json(
            { error: '无法获取许可证状态' },
            { status: 503 }
          )
        }

        const licenseData = await licenseResponse.json()
        
        // 如果许可证无效
        if (!licenseData.valid) {
          return NextResponse.json(
            { 
              error: 'License Validation Failed',
              message: licenseData.message || '许可证验证失败',
              status: licenseData.status
            },
            { status: 403 }
          )
        }

        // 如果指定了功能模块，检查功能权限
        if (feature && licenseData.license) {
          const hasFeature = licenseData.license.enabledFeatures.includes(feature)
          if (!hasFeature) {
            return NextResponse.json(
              { 
                error: 'Feature Not Licensed',
                message: `${feature} 功能需要相应的许可证授权`,
                upgradeRequired: true
              },
              { status: 403 }
            )
          }
        }

        // 许可证验证通过，执行原始处理器
        return await handler(req)

      } catch (error) {
        console.error('许可证检查失败:', error)
        
        // 在生产环境下，许可证检查失败时阻止访问
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: '许可证验证服务暂时不可用' },
            { status: 503 }
          )
        }
        
        // 开发环境下允许继续
        return await handler(req)
      }
    }
  }
}
```

### 3. 在API路由中使用

```typescript
// app/api/jobs/route.ts - 示例
import { NextRequest, NextResponse } from 'next/server'
import { withLicenseCheck } from '@/lib/license/license-decorator'
import { FeatureModule } from '@/lib/license/types'

// 使用许可证检查装饰器
export const GET = withLicenseCheck(FeatureModule.JOB_MANAGEMENT)(async (req: NextRequest) => {
  // 这里是原始的API处理逻辑
  const jobs = [
    { id: 1, name: 'Job 1', status: 'running' },
    { id: 2, name: 'Job 2', status: 'completed' }
  ]
  
  return NextResponse.json({ jobs })
})
```

### 4. 在组件中使用

```tsx
// 使用Hook检查权限
import { useFeatureAccess, FeatureGuard } from '@/hooks/use-license'
import { FeatureModule } from '@/lib/license/types'

function MyComponent() {
  const { allowed, loading } = useFeatureAccess(FeatureModule.USER_MANAGEMENT)
  
  if (loading) return <div>加载中...</div>
  if (!allowed) return <div>功能未授权</div>
  
  return <div>用户管理界面</div>
}

// 使用组件保护功能
function ProtectedComponent() {
  return (
    <FeatureGuard feature={FeatureModule.VNC_DESKTOP}>
      <VNCDesktopInterface />
    </FeatureGuard>
  )
}
```

## 🚀 许可证检查生效的条件

### 1. **配置环境变量**
```bash
# .env.local
LICENSE_FILE_PATH=config/license.json
LICENSE_PUBLIC_KEY_PATH=config/license-public.pem
STRICT_LICENSE_VALIDATION=true

# 开发环境配置（可选）
# SKIP_LICENSE_VALIDATION=true
```

### 2. **创建许可证文件**
```bash
# 生成密钥对
./scripts/generate-keypair.sh

# 生成许可证
node scripts/generate-license.js --customer "测试客户" --tier basic --users 10
```

### 3. **在API路由中添加许可证检查**
```typescript
// 使用装饰器模式
export const GET = withLicenseCheck(FeatureModule.JOB_MANAGEMENT)(async (req) => {
  // API逻辑
})

// 或手动检查
export async function GET(req: NextRequest) {
  const licenseResponse = await fetch(`${req.nextUrl.origin}/api/license/status`)
  const licenseData = await licenseResponse.json()
  
  if (!licenseData.valid) {
    return NextResponse.json(
      { error: '许可证验证失败' },
      { status: 403 }
    )
  }
  
  // 继续处理请求...
}
```

## ⚠️ 未配置许可证时的情况

### 开发环境
- 默认允许所有功能访问
- 可以通过 `SKIP_LICENSE_VALIDATION=true` 跳过验证
- 不会阻止系统运行

### 生产环境
- 会进行严格验证
- 许可证无效时会返回错误响应
- 可能阻止某些功能访问

### 许可证文件缺失
- 返回 `MISSING` 状态
- 显示"许可证文件不存在"错误
- 功能访问被阻止

## 📋 最佳实践

1. **开发阶段**：使用 `SKIP_LICENSE_VALIDATION=true` 跳过验证
2. **测试阶段**：创建测试许可证进行功能验证
3. **生产阶段**：确保许可证文件存在且有效
4. **错误处理**：提供友好的错误信息和升级提示
5. **监控告警**：监控许可证状态和使用量

## 🔧 故障排查

### 常见问题

1. **许可证验证失败**
   ```bash
   # 检查许可证文件是否存在
   ls -la config/license.json
   
   # 检查公钥文件是否存在
   ls -la config/license-public.pem
   ```

2. **功能访问被拒绝**
   ```bash
   # 检查功能是否在许可证中启用
   curl http://localhost:3000/api/license/status | grep enabledFeatures
   ```

3. **中间件错误**
   - 确保中间件文件语法正确
   - 检查是否有Node.js模块依赖
   - 验证环境变量配置

### 调试模式

```bash
# 设置环境变量
export SKIP_LICENSE_VALIDATION=true
export NODE_ENV=development
```

---

**注意**: 本实现方案避免了Edge Runtime的兼容性问题，通过装饰器模式在API路由层面进行许可证检查，既保证了功能完整性，又避免了技术限制。 
