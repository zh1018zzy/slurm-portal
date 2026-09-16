## 🔧 许可证系统问题解决方案

> 适用范围：历史许可证故障案例追溯与修复参考（特定环境）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

### **问题分析：**
您遇到的"Application error: a client-side exception has occurred"是由于**中间件许可证验证循环**导致的：

1. 中间件调用 `/api/license/status` 验证许可证
2. 许可证验证器调用 `/api/users/count` 获取用户数
3. `/api/users/count` 请求又被中间件拦截，形成无限循环
4. 导致请求超时和客户端错误

### **解决方案：**

#### **已修复的问题：**
✅ **移除循环调用**：许可证验证器不再通过HTTP API获取用户数  
✅ **中间件优化**：排除 `/api/users/count` 路径  
✅ **试用版许可证验证**：系统现在正确识别试用版状态  

#### **当前试用版状态：**
- **许可证类型**：试用版 (trial)
- **有效期**：90天（剩余90天）
- **用户限制**：最多10个用户，5个并发用户
- **当前使用**：3个用户，1个在线用户
- **安装时间**：2025-09-17T11:10:13.634Z

### **测试试用版许可证：**

#### **方法1：快速测试过期状态**
```bash
# 1. 备份当前安装文件

> 适用范围：历史故障案例与问题追溯（参考用）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`
cp config/installation.json config/installation.json.backup

# 2. 设置为91天前安装（已过期）
cat > config/installation.json << 'EOF'
{
  "installDate": "2025-06-18T11:10:13.634Z",
  "installId": "5d6b9705-ac21-4a44-9057-06dca0e3f614",
  "version": "1.0.0",
  "createdAt": "2025-06-18T11:10:13.634Z"
}
EOF

# 3. 重启服务
pm2 restart hpc-management-platform

# 4. 测试访问（应该看到"平台许可已到期，请联系管理员"）
curl http://localhost:3000/api/license/status
```

#### **方法2：使用测试脚本**
```bash
./test-trial-license.sh
```

#### **恢复原状**
```bash
cp config/installation.json.backup config/installation.json
pm2 restart hpc-management-platform
```

### **注意事项：**
1. **商业版许可证已移除**：确保测试试用版功能
2. **用户数限制**：试用版最多10个用户
3. **过期后完全阻止访问**：包括登录和所有功能
4. **真实环境部署**：建议将用户统计改为直接数据库查询，避免HTTP调用

系统现在已经正常工作，可以正确显示试用版状态和限制！
