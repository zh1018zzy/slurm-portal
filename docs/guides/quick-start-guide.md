
# HPC管理平台微服务快速启动指南

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🚀 快速开始

### 1. 环境准备

确保系统已安装以下依赖：
- Docker
- Docker Compose
- Node.js 18+

### 2. 配置环境变量

```bash
# 复制环境变量文件
cp .env.microservices .env.microservices.local

# 编辑环境变量（根据你的实际环境修改）
nano .env.microservices.local
```

主要配置项：
```bash
# 数据库配置
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://hpcapp:your_secure_password@postgres:5432/hpc_platform

# LDAP配置
LDAP_URL=ldap://your-ldap-server:389
LDAP_BASE_DN=dc=your-domain,dc=com
LDAP_BIND_DN=cn=admin,dc=your-domain,dc=com
LDAP_BIND_PASSWORD=your_ldap_password

# Slurm配置
SLURM_HOST=your-slurm-master
SLURM_PORT=6817

# JWT配置
JWT_SECRET=your_jwt_secret_key
```

### 3. 启动微服务

使用测试脚本启动：
```bash
# 启动所有服务
./scripts/test-microservices.sh start

# 查看服务状态
./scripts/test-microservices.sh status

# 查看服务日志
./scripts/test-microservices.sh logs
```

或使用Docker Compose直接启动：
```bash
docker-compose -f docker-compose.microservices.yml --env-file .env.microservices.local up -d
```

### 4. 验证服务

```bash
# 运行服务测试
./scripts/test-microservices.sh test
```

### 5. 访问服务

- **负载均衡器**: http://localhost
- **认证服务**: http://localhost:3001
- **作业管理服务**: http://localhost:3002
- **文件管理服务**: http://localhost:3003
- **Grafana监控**: http://localhost:3007
- **MinIO控制台**: http://localhost:9001

## 📋 服务说明

### 认证服务 (Auth Service)
- **端口**: 3001
- **功能**: 用户认证、权限管理
- **API**: `/api/auth/*`

### 作业管理服务 (Job Service)
- **端口**: 3002
- **功能**: Slurm作业管理
- **API**: `/api/jobs/*`

### 文件管理服务 (File Service)
- **端口**: 3003
- **功能**: 文件上传下载
- **API**: `/api/files/*`

## 🛠️ 常用命令

### 服务管理
```bash
# 启动服务
./scripts/test-microservices.sh start

# 停止服务
./scripts/test-microservices.sh stop

# 重启服务
./scripts/test-microservices.sh restart

# 查看状态
./scripts/test-microservices.sh status

# 查看日志
./scripts/test-microservices.sh logs [service-name]
```

### 测试服务
```bash
# 测试认证服务
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'

# 测试作业服务
curl -X GET http://localhost:3002/partitions

# 测试文件服务
curl -X GET http://localhost:3003/health
```

### 数据库管理
```bash
# 连接PostgreSQL
docker exec -it my-hpcapp-postgres-1 psql -U hpcapp -d hpc_platform

# 查看Redis
docker exec -it my-hpcapp-redis-1 redis-cli
```

## 🔧 故障排除

### 常见问题

1. **服务启动失败**
   ```bash
   # 查看服务日志
   ./scripts/test-microservices.sh logs auth-service
   
   # 检查端口占用
   netstat -tlnp | grep :3001
   ```

2. **数据库连接失败**
   ```bash
   # 检查PostgreSQL状态
   docker-compose -f docker-compose.microservices.yml ps postgres
   
   # 查看数据库日志
   docker-compose -f docker-compose.microservices.yml logs postgres
   ```

3. **LDAP认证失败**
   ```bash
   # 测试LDAP连接
   ldapsearch -H ldap://your-ldap-server:389 -D "cn=admin,dc=your-domain,dc=com" -w your_password -b "dc=your-domain,dc=com"
   ```

### 日志查看
```bash
# 查看所有服务日志
docker-compose -f docker-compose.microservices.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.microservices.yml logs -f auth-service
```

### 性能监控
```bash
# 查看资源使用情况
docker stats

# 查看服务健康状态
curl http://localhost/health
```

## 📊 性能优化

### 资源分配
- **认证服务**: 1CPU, 1GB内存
- **作业服务**: 2CPU, 2GB内存
- **文件服务**: 1.5CPU, 2GB内存

### 缓存策略
- Redis缓存热点数据
- Nginx代理缓存
- 静态资源长期缓存

### 负载均衡
- 限流保护
- 连接复用
- 健康检查

## 🔒 安全配置

### 网络安全
- 使用HTTPS
- 配置防火墙
- 限制端口访问

### 认证安全
- 强密码策略
- JWT令牌过期
- LDAP安全连接

### 数据安全
- 数据库加密
- 文件权限控制
- 审计日志

## 📈 扩展指南

### 水平扩展
```bash
# 扩展特定服务
docker-compose -f docker-compose.microservices.yml up -d --scale job-service=3
```

### 添加新服务
1. 在 `services/` 目录下创建新服务
2. 更新 `docker-compose.microservices.yml`
3. 配置Nginx路由
4. 重启服务

### 监控告警
- 配置Grafana仪表板
- 设置InfluxDB告警
- 集成外部监控系统

## 📞 支持

如果遇到问题，请：
1. 查看服务日志
2. 检查环境配置
3. 参考故障排除指南
4. 联系技术支持

---

**注意**: 这是生产环境的快速启动指南，请根据实际需求调整配置。 
