# 环境兼容性说明

> 适用范围：部署流程、环境配置与发布运维
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## TypeScript编译问题解决方案

### 问题描述
不同开发环境之间可能出现TypeScript编译错误，主要原因包括：

1. **TypeScript版本差异**
2. **依赖包版本不一致**
3. **编译器配置差异**
4. **Node.js版本差异**

### 统一环境配置

#### 1. Node.js版本要求
- 推荐版本：Node.js 18.x 或 20.x
- 检查命令：`node --version`

#### 2. TypeScript版本锁定
```json
"typescript": "5.3.3"
```

#### 3. 关键配置项
```json
{
  "strict": false,
  "skipLibCheck": true,
  "noImplicitAny": false,
  "strictNullChecks": false
}
```

### 环境部署步骤

1. **清理现有依赖**
```bash
rm -rf node_modules
rm package-lock.json
```

2. **重新安装依赖**
```bash
npm install
```

3. **验证编译**
```bash
npm run build
```

### 常见问题解决

#### 问题1: job-cache类型错误
**解决方案**: 使用类型断言绕过严格检查
```typescript
(jobCache as any).cache[cacheKey]
```

#### 问题2: 导入路径问题
**解决方案**: 确保tsconfig.json中paths配置正确
```json
"paths": {
  "@/*": ["./*"]
}
```

#### 问题3: 第三方库类型问题
**解决方案**: 启用skipLibCheck
```json
"skipLibCheck": true
```

### 编译命令
- 开发环境: `npm run dev`
- 生产构建: `npm run build`
- 类型检查: `npx tsc --noEmit`

### 注意事项
- 不同环境请使用相同的package-lock.json
- 如遇到持续问题，请检查全局TypeScript版本
- 建议使用Docker或容器化部署确保环境一致性
