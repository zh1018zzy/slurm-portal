# 部署认证问题检查清单

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🔍 **问题描述**

在新环境部署后，出现以下认证错误：
- 文件管理页面：`GET /api/permissions/file-permissions 401 (Unauthorized)`
- WebShell页面：`GET /api/webshell/check-access 401 (Unauthorized)`

## 🛠️ **检查步骤**

### 1. **环境变量配置**

确保 `.env` 文件中包含以下配置：

```bash
# JWT配置（必须）
JWT_SECRET=your-secure-jwt-secret-key-here

# 认证模式
AUTH_MODE=ldap

# LDAP配置
LDAP_URL=ldap://your-ldap-server:389
LDAP_BASE_DN=dc=your-domain,dc=com
LDAP_BIND_DN=cn=admin,dc=your-domain,dc=com
LDAP_BIND_PASSWORD=your-admin-password

# Supabase配置
SUPABASE_URL=http://your-supabase-server:8000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. **验证JWT_SECRET**

```bash
# 检查环境变量
echo $JWT_SECRET

# 如果没有设置，添加配置
echo "JWT_SECRET=your-secure-jwt-secret-key-here" >> .env
```

### 3. **重启应用服务器**

```bash
# 停止应用
pkill -f "next"

# 重新启动
npm run dev
# 或
npm start
```

### 4. **用户登录测试**

1. 访问应用首页
2. 使用正确的用户名和密码登录
3. 检查浏览器控制台是否有认证错误
4. 检查localStorage中是否有token

### 5. **API测试**

使用以下命令测试API是否正常工作：

```bash
# 测试认证API
curl -X POST http://your-server:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'

# 如果登录成功，使用返回的token测试其他API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://your-server:3000/api/permissions/file-permissions
```

## 🔧 **常见解决方案**

### 方案1: 重新登录
如果token过期或无效：
1. 清除浏览器localStorage：`localStorage.clear()`
2. 重新登录获取新token

### 方案2: 手动设置token
在浏览器控制台中运行：
```javascript
// 生成临时token（仅用于测试）
const token = 'your-valid-jwt-token';
localStorage.setItem('token', token);
location.reload();
```

### 方案3: 检查JWT_SECRET一致性
确保所有环境使用相同的JWT_SECRET：
```bash
# 检查当前环境变量
node -e "console.log('JWT_SECRET:', process.env.JWT_SECRET || '未设置')"
```

## 🚨 **故障排除**

### 错误1: "无效的token"
- 检查JWT_SECRET是否正确配置
- 确认用户已登录且token有效
- 清除浏览器缓存和localStorage

### 错误2: "未授权访问"
- 检查Authorization头是否正确设置
- 确认token格式为 `Bearer <token>`
- 验证token未过期

### 错误3: "用户不存在"
- 检查LDAP配置是否正确
- 确认用户在LDAP中存在
- 验证Supabase用户表中有对应记录

## 📋 **验证清单**

- [ ] JWT_SECRET环境变量已设置
- [ ] 应用服务器已重启
- [ ] 用户能够成功登录
- [ ] localStorage中有有效token
- [ ] 文件管理页面正常工作
- [ ] WebShell页面正常工作
- [ ] 所有API调用返回200状态码

## 🔗 **相关文件**

- `.env` - 环境变量配置
- `lib/jwt.ts` - JWT工具函数
- `app/api/auth/route.ts` - 认证API
- `app/api/permissions/file-permissions/route.ts` - 文件权限API
- `app/api/webshell/check-access/route.ts` - WebShell权限API
- `hooks/use-auth.ts` - 认证Hook
- `app/dashboard/files/page.tsx` - 文件管理页面
- `app/dashboard/webshell/page.tsx` - WebShell页面 
