# WebShell 快速开始指南

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🚀 5分钟快速部署

### 1. 安装依赖

```bash
# 进入项目目录
cd /opt/my-hpcapp

# 安装前端依赖
npm install xterm@5.3.0 xterm-addon-fit@0.8.0 xterm-addon-web-links@0.9.0 socket.io-client

# 安装后端依赖
npm install socket.io node-pty

# 安装开发依赖
npm install --save-dev @types/node-pty
```

### 2. 安装系统依赖

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install python3 make g++ build-essential

# CentOS/RHEL
sudo yum install python3 make gcc-c++ gcc
```

### 3. 配置环境变量

```bash
# 创建环境变量文件
cat > .env.local << EOF
WEBSHELL_PORT=3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

### 4. 启动服务

```bash
# 启动WebShell服务器
chmod +x scripts/start-webshell.sh
./scripts/start-webshell.sh

# 启动前端应用（新终端）
npm run dev
```

### 5. 验证安装

```bash
# 检查WebShell服务器
curl http://localhost:3001/api/webshell

# 预期返回
{
  "status": "ok",
  "activeSessions": 0
}
```

## 🎮 立即使用

### 1. 访问WebShell
1. 打开浏览器访问 `http://localhost:3000`
2. 登录系统
3. 在右上角找到 **WebShell** 按钮
4. 点击按钮打开终端
5. 点击 **连接终端** 建立连接

### 2. 基本操作
- **输入命令**：直接在终端中输入Linux命令
- **复制文本**：选中文本后点击 **复制** 按钮
- **粘贴内容**：点击 **粘贴** 按钮将内容粘贴到终端
- **关闭终端**：点击 **X** 按钮关闭

## 🔐 权限配置

### 为测试用户添加权限

```sql
-- 添加WebShell访问权限
INSERT INTO webshell_permissions (
  user_id, 
  permission_type, 
  is_active,
  allowed_commands,
  clipboard_size_limit,
  max_session_time
) VALUES (
  'your-user-id',
  'webshell_access',
  true,
  ARRAY['*'],
  1048576,  -- 1MB
  14400     -- 4小时
);

-- 添加复制权限
INSERT INTO webshell_permissions (
  user_id, permission_type, is_active, clipboard_size_limit
) VALUES (
  'your-user-id', 'webshell_copy', true, 1048576
);

-- 添加粘贴权限
INSERT INTO webshell_permissions (
  user_id, permission_type, is_active, clipboard_size_limit
) VALUES (
  'your-user-id', 'webshell_paste', true, 1048576
);
```

## 🛠️ 常见问题

### 连接失败
```bash
# 检查服务器状态
curl http://localhost:3001/api/webshell

# 重启服务器
pkill -f webshell-server
./scripts/start-webshell.sh
```

### 权限错误
```sql
-- 检查用户权限
SELECT * FROM webshell_permissions 
WHERE user_id = 'your-user-id' 
AND permission_type = 'webshell_access';
```

### 依赖安装失败
```bash
# 重新安装node-pty
npm rebuild node-pty

# 或使用预编译版本
npm install node-pty --build-from-source=false
```

## 📚 更多信息

- **完整文档**：[WebShell功能说明](./webshell-feature-guide.md)
- **集成说明**：[WebShell集成文档](./webshell-integration.md)
- **权限系统**：[权限控制说明](../../system/permissions/permission-control-system.md)

---

🎉 **恭喜！WebShell功能已成功部署并可以使用了！** 
