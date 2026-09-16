# 许可证检查使用指南

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🔧 问题解决

### 当前遇到的问题

1. **Edge Runtime 兼容性问题** - `lib/logger.ts` 使用了 Node.js 的 `path` 模块
2. **HTTP Headers 重复发送错误** - 中间件中可能重复设置了响应头
3. **类型错误** - `Response.json` 与 `NextResponse.json` 类型不匹配

## ✅ 解决方案

### 1. 简化中间件配置

当前的 `middleware.ts` 已经简化为只记录日志，不进行复杂的许可证检查，避免了所有兼容性问题。

### 2. 在API路由中进行许可证检查

```typescript
// 示例：在API路由中添加许可证检查
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // 开发环境下跳过许可证验证
  if (process.env.NODE_ENV === 'development' && 
      process.env.SKIP_LICENSE_VALIDATION === 'true') {
    // 继续处理请求
  } else {
    // 检查许可证状态
    try {
      const licenseResponse = await fetch(`${req.nextUrl.origin}/api/license/status`)
      if (licenseResponse.ok) {
        const licenseData = await licenseResponse.json()
        
        if (!licenseData.valid) {
          return NextResponse.json(
            { 
              error: 'License Validation Failed',
              message: licenseData.message || '许可证验证失败'
            },
            { status: 403 }
          )
        }
      }
    } catch (error) {
      // 许可证检查失败时的处理
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: '许可证验证服务暂时不可用' },
          { status: 503 }
        )
      }
    }
  }
  
  // 继续处理请求...
  return NextResponse.json({ success: true })
}
```

### 3. 在组件中使用许可证检查

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

### 1. 配置环境变量
```bash
# .env.local
LICENSE_FILE_PATH=config/license.json
LICENSE_PUBLIC_KEY_PATH=config/license-public.pem
STRICT_LICENSE_VALIDATION=true

# 开发环境配置（可选）
# SKIP_LICENSE_VALIDATION=true
```

### 2. 创建许可证文件
```bash
# 生成密钥对
./scripts/generate-keypair.sh

# 生成许可证
node scripts/generate-license.js --customer "测试客户" --tier basic --users 10
```

### 3. 在需要保护的API路由中添加许可证检查

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

### 调试模式

```bash
# 设置环境变量
export SKIP_LICENSE_VALIDATION=true
export NODE_ENV=development
```

---

**注意**: 本实现方案避免了Edge Runtime的兼容性问题，通过在API路由层面进行许可证检查，既保证了功能完整性，又避免了技术限制。 
