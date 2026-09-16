# VNC应用与noVNC集成使用指南

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🎯 功能概述

本系统已成功集成VNC应用和noVNC网关，支持：
- ✅ **TurboVNC服务器**：在vtdev节点运行 
- ✅ **noVNC网关**：192.168.31.130:6080
- ✅ **内置VNC应用**：桌面、终端、浏览器、编辑器
- ✅ **Web访问**：通过浏览器直接访问VNC桌面

## 🚀 使用流程

### 1. 提交VNC作业

1. 访问 **应用中心**：http://localhost:3000/dashboard/applications
2. 选择VNC应用：
   - **VNC 桌面**：完整Linux桌面环境
   - **XTerm 终端**：图形化终端
   - **Firefox 浏览器**：网页浏览器
   - **GEdit 编辑器**：文本编辑器
3. 配置分辨率（可选）
4. 点击"提交作业"

### 2. 监控作业状态

- 在 **应用中心** → **我的作业** 标签页查看
- 或在 **作业管理** 页面查看所有作业
- 作业状态：等待中 → 运行中 → 已完成

### 3. 访问VNC桌面

当作业状态为"运行中"时：
1. 点击 **"VNC桌面"** 按钮
2. 自动打开noVNC网页客户端
3. 即可在浏览器中操作Linux桌面

## 🔧 技术架构

### VNC服务器配置
- **路径**：/opt/TurboVNC/bin/
- **节点**：vtdev
- **端口范围**：5901-5999 (display :101-:999)
- **安全类型**：None（内网环境）

### noVNC网关
- **地址**：192.168.31.130:6080
- **访问格式**：http://192.168.31.130:6080/vnc.html?host=vtdev&port=59XX
- **端口映射**：port = 5900 + display号

### 作业脚本特性
- 自动分配display号
- 清理残留进程
- 创建用户目录
- 启动指定应用程序
- 输出访问地址

## 📋 故障排除

### 1. 作业无法启动
- 检查vtdev节点是否可用
- 确认TurboVNC已正确安装
- 查看作业日志了解错误信息

### 2. 无法访问VNC桌面
- 确认noVNC docker容器运行正常
- 检查防火墙设置
- 验证端口是否被占用

### 3. 显示异常
- 尝试不同的分辨率设置
- 检查X11转发是否正常
- 确认应用程序是否已安装

## 🎨 支持的应用程序

### 系统工具
- **xterm**：终端模拟器
- **mate-session**：完整桌面环境

### 网络工具  
- **firefox**：网页浏览器
- **chromium**：另一个浏览器选择

### 开发工具
- **gedit**：文本编辑器
- **vim/emacs**：命令行编辑器

### 科学计算
- **octave**：数值计算
- **python3**：Python解释器

## 🔗 相关地址

- **应用中心**：http://localhost:3000/dashboard/applications
- **作业管理**：http://localhost:3000/dashboard/jobs
- **noVNC网关**：http://192.168.31.130:6080

## 🛠️ 扩展开发

### 添加新VNC应用
编辑 `/opt/my-hpcapp/app/api/applications/available/route.ts`：

```typescript
{
  id: 'vnc-newapp',
  name: '新应用名称',
  description: '应用描述',
  category: '应用分类',
  command: 'app-command',
  fields: [
    {
      name: 'geometry',
      label: '分辨率',
      type: 'select',
      default: '1280x800',
      options: [/* 分辨率选项 */]
    }
  ]
}
```

### 自定义VNC配置
编辑 `/opt/my-hpcapp/lib/vnc-manager.ts` 中的 `VNC_CONFIG`：

```typescript
const VNC_CONFIG = {
  DEFAULT_GEOMETRY: '1280x800',
  SECURITY_TYPE: 'None',
  DISPLAY_RANGE: [101, 999],
  NOVNC_GATEWAY: process.env.NOVNC_GATEWAY || 'localhost',
  TURBO_VNC_PATH: '/opt/TurboVNC/bin/'
}
```

---

🎉 **VNC应用与noVNC集成已完成！**

用户现在可以通过Web界面轻松提交VNC作业，并通过noVNC在浏览器中访问远程桌面。
