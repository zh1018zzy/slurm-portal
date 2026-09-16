# 📋 通知系统快速部署

> 适用范围：部署流程、环境配置与发布运维
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🚀 一键部署

```bash
cd /opt/my-hpcapp
./scripts/deploy-notifications.sh
```

## 📊 验证部署

1. **检查服务状态**:
   ```bash
   ps aux | grep job-sync
   tail -f /tmp/job-sync.log
   ```

2. **访问通知页面**:
   打开浏览器访问: http://localhost:3000/dashboard/notifications

3. **验证功能**:
   - 重新登录系统获取有效JWT token
   - 查看通知列表和统计信息
   - 测试分页和筛选功能

## 🔧 常见问题

| 问题 | 解决方案 |
|------|----------|
| 页面显示空白 | 重新登录系统 |
| 401认证错误 | `node scripts/fix-notification-auth.js` |
| 服务未运行 | `./scripts/deploy-notifications.sh` |

## 📚 详细文档

- 完整部署指南: `docs/notification-service-deployment.md`
- 系统架构说明: `docs/CLAUDE.md#notification-system`

---
**状态**: ✅ 已部署并运行，监控21+个作业，50+条通知记录
