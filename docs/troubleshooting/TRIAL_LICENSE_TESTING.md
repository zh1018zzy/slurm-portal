# 试用版许可证测试方法

> 适用范围：历史故障案例与问题追溯（参考用）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 当前状态
- 安装时间：2025-09-17T08:01:14.611Z
- 剩余天数：约90天（新安装）

## 测试方法

### 1. 测试试用期即将到期（剩余7天）
```bash
# 修改安装时间为83天前
cp config/installation.json config/installation.json.backup
cat > config/installation.json << 'EOF'
{
  "installDate": "2025-06-26T08:01:14.611Z",
  "installId": "f7de0af6-8c4f-4ca8-84e2-a996512905a0",
  "version": "1.0.0",
  "createdAt": "2025-06-26T08:01:14.614Z"
}
EOF
```

### 2. 测试试用期已过期
```bash
# 修改安装时间为91天前
cat > config/installation.json << 'EOF'
{
  "installDate": "2025-06-18T08:01:14.611Z",
  "installId": "f7de0af6-8c4f-4ca8-84e2-a996512905a0",
  "version": "1.0.0",
  "createdAt": "2025-06-18T08:01:14.614Z"
}
EOF
```

### 3. 测试新安装（完整试用期）
```bash
# 恢复为今天安装
cp config/installation.json.backup config/installation.json
```

### 4. 重置试用期（删除安装标记）
```bash
# 删除安装文件，系统会重新创建
rm config/installation.json
# 下次访问许可证API时会自动重新创建
```

## 测试验证
访问以下URL查看许可证状态：
- http://localhost:3000/api/license/status
- http://localhost:3000/dashboard/system/license

## 预期结果
- **剩余7天**：显示警告信息，建议升级
- **已过期**：显示"平台许可已到期，请联系管理员"，阻止登录
- **新安装**：显示90天试用期
