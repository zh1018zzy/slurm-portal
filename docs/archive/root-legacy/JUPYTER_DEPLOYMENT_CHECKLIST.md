# Jupyter Lab 部署检查清单

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

快速部署 Jupyter Lab 到 HPC 系统的步骤。

## 📋 前置条件

- [ ] HPC 系统运行正常
- [ ] Slurm 已配置并运行
- [ ] Python 3.11+ 已安装
- [ ] Node.js 18+ 已安装
- [ ] 有 root 或 sudo 权限

---

## ⚡ 快速部署 (15分钟)

### 1. 安装 Jupyter Lab 环境 (5分钟)

```bash
# 创建虚拟环境
sudo python3.11 -m venv /opt/software/jupyter-env

# 安装 Jupyter Lab
sudo /opt/software/jupyter-env/bin/pip install \
  jupyterlab notebook ipywidgets \
  numpy pandas matplotlib scikit-learn scipy
```

### 2. 注册应用 (1分钟)

```bash
cd /opt/my-hpcapp
npx tsx scripts/register-jupyter-app.ts
```

### 3. 重启应用 (1分钟)

```bash
pm2 restart hpc-management-platform
# 或
npm run build && npm run start
```

### 4. 测试访问 (5分钟)

```bash
# 1. 打开浏览器
open http://your-server/dashboard

# 2. 点击 "AI工具" -> "Jupyter Lab"

# 3. 启动测试会话
#    - 会话名称: test
#    - 资源配置: 轻量级
#    - 运行时长: 2小时

# 4. 等待状态变为 "RUNNING"

# 5. 点击 "打开 Jupyter Lab"

# 6. 使用 Token 登录
```

---

## 🔍 验证部署

### 检查环境

```bash
# 1. 检查 Python 环境
/opt/software/jupyter-env/bin/python --version
# 预期输出: Python 3.11.x

# 2. 检查 Jupyter Lab
/opt/software/jupyter-env/bin/jupyter lab --version
# 预期输出: 4.0.x

# 3. 检查已安装的包
/opt/software/jupyter-env/bin/pip list | grep -E "jupyter|numpy|pandas"
```

### 检查 Slurm

```bash
# 1. 检查服务状态
systemctl status slurmctld slurmd

# 2. 检查分区
sinfo -o "%P %a %l %D %N"
# 确保存在: interactive, gpu, highmem

# 3. 测试作业提交
srun --partition=interactive hostname
```

### 检查文件

```bash
# 应用定义文件
ls -la /opt/my-hpcapp/lib/applications/ai/jupyter.ts

# 管理页面
ls -la /opt/my-hpcapp/app/\[locale\]/dashboard/jupyter/page.tsx

# API 路由
ls -la /opt/my-hpcapp/app/api/jupyter/sessions/route.ts

# 国际化文件
grep -A5 '"jupyter"' /opt/my-hpcapp/messages/zh.json
```

---

## 🎯 常见问题快速修复

### 问题: 注册脚本失败

```bash
# 检查数据库连接
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 如果未设置,添加到环境变量
export SUPABASE_URL="your-url"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
```

### 问题: 会话提交失败

```bash
# 重启 Slurm
sudo systemctl restart slurmctld slurmd

# 检查用户是否在 Slurm 中
sacctmgr show assoc where user=$USER
```

### 问题: 无法访问页面

```bash
# 检查应用是否运行
pm2 list

# 查看日志
pm2 logs hpc-management-platform

# 重启应用
pm2 restart hpc-management-platform
```

---

## ✅ 部署成功标志

当你看到以下内容时,说明部署成功:

1. ✅ 系统桌面显示 "AI工具" 卡片
2. ✅ 点击 Jupyter Lab 进入管理页面
3. ✅ 可以提交新会话
4. ✅ 会话状态显示正常
5. ✅ 可以打开 Jupyter Lab 界面
6. ✅ Token 登录成功

---

## 📞 需要帮助?

如果遇到问题:

1. 查看详细文档: `docs/JUPYTER_LAB_INTEGRATION.md`
2. 查看日志: `pm2 logs` 或 `~/.jupyter/logs/`
3. 检查 Slurm 日志: `/var/log/slurm/`

---

**部署时间**: 约 15 分钟
**难度**: ⭐⭐☆☆☆
