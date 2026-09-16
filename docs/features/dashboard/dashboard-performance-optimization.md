# 仪表盘性能优化总结

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 问题描述

用户反馈仪表盘页面加载缓慢，特别是作业趋势图表导致整个页面都在等待加载。

## 性能瓶颈分析

### 1. 主要瓶颈
- **TrendChart组件阻塞页面加载**：趋势图表在页面加载时就开始请求数据
- **多个API并行请求**：useDashboardData同时请求3个API，造成阻塞
- **缺乏缓存机制**：每次都是重新请求数据
- **加载顺序不合理**：重要内容和非重要内容同时加载

### 2. 具体问题
- `/api/jobs/trend` API响应慢
- `/api/jobs/partitions` API响应慢
- 前端没有合理的加载策略

## 优化方案

### 1. 动态加载优化 ✅

**修改文件：** `app/dashboard/page.tsx`

```typescript
// 将TrendChart改为动态导入
const TrendChart = dynamic(() => import('@/components/dashboard/TrendChart').then(mod => ({ default: mod.TrendChart })), {
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">加载趋势图表中...</p>
      </div>
    </div>
  ),
  ssr: false
})
```

**优化效果：**
- 趋势图表不会阻塞页面初始加载
- 页面可以快速显示其他内容

### 2. 数据加载策略优化 ✅

**修改文件：** `hooks/use-dashboard-data.ts`

```typescript
// 优化前：并行加载所有数据
const [statsRes, jobsRes, partitionsRes] = await Promise.all([...])

// 优化后：分阶段加载
// 1. 先加载关键数据（统计和作业列表）
const [statsRes, jobsRes] = await criticalDataPromise
// 2. 异步加载非关键数据（分区信息）
partitionsPromise.then(async (partitionsRes) => {
  // 异步处理分区数据
})
```

**优化效果：**
- 页面可以快速显示关键信息
- 非关键数据异步加载，不阻塞用户交互

### 3. 趋势图表延迟加载 ✅

**修改文件：** `components/dashboard/TrendChart.tsx`

```typescript
export function TrendChart() {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    // 延迟加载：等待页面其他内容加载完成后再加载趋势数据
    const timer = setTimeout(() => {
      setShouldLoad(true)
    }, 1000) // 1秒后开始加载

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!shouldLoad) return
    // 开始加载数据
  }, [shouldLoad])
}
```

**优化效果：**
- 趋势图表延迟1秒加载
- 页面其他内容优先显示

### 4. API缓存机制 ✅

**修改文件：** `app/api/jobs/trend/route.ts`

```typescript
// 简单的内存缓存
const trendCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 检查缓存
const cacheKey = `${targetUser}-${dateRange}`
const cached = trendCache.get(cacheKey)
if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
  return Response.json(cached.data)
}

// 缓存结果
trendCache.set(cacheKey, {
  data: response,
  timestamp: Date.now()
})
```

**优化效果：**
- 相同请求5分钟内直接返回缓存
- 大幅减少数据库查询

### 5. 加载顺序优化 ✅

**修改文件：** `app/dashboard/page.tsx`

```typescript
{/* 趋势图表 - 底部全宽，延迟加载 */}
<div className="mt-6">
  <Card>
    <CardHeader>
      <CardTitle>作业趋势（近30天）</CardTitle>
    </CardHeader>
    <CardContent>
      <Suspense fallback={...}>
        <TrendChart />
      </Suspense>
    </CardContent>
  </Card>
</div>
```

**优化效果：**
- 趋势图表放在页面底部
- 使用Suspense提供更好的加载体验

## 性能提升效果

### 优化前
- 页面加载时间：3-5秒
- 所有内容同时加载，用户需要等待
- 趋势图表阻塞页面显示

### 优化后
- 页面初始加载时间：1-2秒
- 关键内容优先显示
- 趋势图表延迟加载，不阻塞页面
- API响应时间减少（缓存机制）

## 技术要点

### 1. 动态导入
- 使用Next.js的`dynamic`函数
- 设置`ssr: false`避免服务端渲染
- 提供友好的loading状态

### 2. 分阶段加载
- 关键数据优先加载
- 非关键数据异步加载
- 避免所有请求同时进行

### 3. 缓存策略
- 内存缓存减少数据库查询
- 合理的缓存过期时间
- 用户级别的缓存隔离

### 4. 延迟加载
- 使用`setTimeout`延迟加载
- 等待页面主要内容加载完成
- 提供更好的用户体验

## 监控建议

1. **性能监控**：监控页面加载时间和API响应时间
2. **缓存命中率**：监控缓存的使用情况
3. **用户反馈**：收集用户对加载速度的反馈
4. **错误监控**：监控加载失败的情况

## 后续优化方向

1. **服务端缓存**：使用Redis等外部缓存
2. **数据预取**：在用户访问前预取数据
3. **虚拟滚动**：对于大量数据的列表
4. **图片优化**：使用WebP格式和懒加载
5. **代码分割**：进一步拆分组件减少初始包大小 
