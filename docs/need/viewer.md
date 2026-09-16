> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`
你的需求是：  
- 在 `/dashboard/applications` 页面**提交一个图形作业**（如启动一个带 GUI 的 Linux 应用），  
- 然后**通过协议远程访问**这个 Linux 图形应用（如可视化软件、桌面环境等）。

这种场景在 HPC、AI、科研等领域很常见。**最佳实践**通常包括以下几个方面：

---

## 1. 图形作业的后端调度与启动

- **作业调度**：通过 Slurm/PBS/Sun Grid Engine 等调度系统提交带有 X11/Wayland 支持的作业脚本。
- **作业脚本**：作业脚本中启动 VNC/NoVNC、TurboVNC、Xpra、或者基于 Web 的远程桌面服务（如 Guacamole、Apache Guacamole、Nice DCV、Webtop、JupyterLab + X11 支持等）。

---

## 2. 远程访问协议的选择

### 方案对比

| 方案         | 优点                         | 缺点                         | 适用场景           |
|--------------|------------------------------|------------------------------|--------------------|
| **VNC/NoVNC**    | 兼容性好，Web 端可用           | 性能一般，安全性需额外加固     | 通用 Linux GUI     |
| **Xpra**         | 支持无缝窗口，Web 客户端       | 配置略复杂                   | 科研、工程         |
| **Nice DCV**     | 高性能，支持 3D，Web 客户端    | 商业授权，配置复杂            | AI/3D/大数据       |
| **Apache Guacamole** | 支持多协议，Web 端，易集成   | 需单独部署，配置略复杂        | 多协议/统一入口    |
| **JupyterLab + X11** | 轻量，易集成，Web 端         | 仅适合部分 GUI 应用           | 科研/数据分析      |
| **Webtop**       | Docker 化桌面，Web 端         | 资源消耗大                   | 轻量桌面体验       |

---

## 3. 推荐最佳实践

### **主流推荐：NoVNC + VNC Server**

- **作业脚本**自动启动 VNC Server（如 TigerVNC、TurboVNC），并输出连接信息（端口、密码）。
- **Web 前端**集成 NoVNC（WebSocket 代理），用户可直接在浏览器访问图形界面。
- **安全性**：通过 token、反向代理、SSL 加密等方式保护 VNC 连接。

#### 典型流程
1. 用户在 `/dashboard/applications` 页面提交图形作业（选择应用、参数等）。
2. 后端生成作业脚本，调度到计算节点，自动启动 VNC Server。
3. 作业启动后，返回 VNC 连接信息（如 WebSocket 地址、token）。
4. 前端页面集成 NoVNC，用户点击即可在浏览器中访问 Linux 图形应用。

---

### **进阶方案：Xpra 或 Nice DCV**

- **Xpra**：支持无缝窗口、Web 客户端，适合需要高性能和多窗口的场景。
- **Nice DCV**：AWS 官方，支持高性能 3D，Web 客户端，适合 AI/3D 可视化。

---

## 4. 相关开源项目/参考

- [NoVNC 官网](https://novnc.com/)
- [Xpra 官网](https://xpra.org/)
- [Apache Guacamole](https://guacamole.apache.org/)
- [Nice DCV](https://aws.amazon.com/hpc/dcv/)
- [Webtop](https://github.com/linuxserver/webtop)
- [JupyterLab X11](https://github.com/FZJ-JSC/jupyter-jsc)

---

## 5. 你的系统集成建议

- **后端**：作业调度脚本自动启动 VNC/Xpra 服务，记录端口/token。
- **前端**：`/dashboard/applications` 页面集成 NoVNC（或 Xpra Web 客户端），作业状态与连接信息实时展示。
- **安全**：建议所有远程协议都通过 HTTPS/WSS 代理，避免明文传输。

---

### **总结（中文）**

> **当前最佳实践是：作业节点自动启动 VNC Server，前端集成 NoVNC，用户通过浏览器安全访问 Linux 图形界面。对于高性能需求可选 Xpra 或 Nice DCV。**

如需具体实现方案、作业脚本模板、NoVNC 集成代码等，请告知你的目标应用类型和部署环境，我可以给出详细代码和集成建议！







### 1. 数据库表设计（SQL）

根据 `JobInfo` 结构，推荐在 Supabase/Postgres 新建如下表：

```sql
-- 图形作业表
create table jobs (
  job_id      text primary key,         -- Slurm作业ID
  user_id     text not null,            -- 用户名
  app_name    text not null,            -- 应用名
  app_command text not null,            -- 启动命令
  node        text,                     -- 分配节点
  port        integer not null,         -- 端口
  display     integer not null,         -- DISPLAY号
  status      text not null,            -- pending/running/completed/failed
  submit_time timestamptz not null,     -- 提交时间
  start_time  timestamptz,              -- 启动时间
  end_time    timestamptz               -- 结束时间
);

create index idx_jobs_user_id on jobs(user_id);
```

> **说明**：  
> - `job_id` 用 Slurm 分配的作业号（如 `123456`），类型为 `text` 兼容自定义前缀。
> - `user_id` 建议与用户表 username 保持一致。
> - `status` 用于作业状态管理。
> - 时间字段用 `timestamptz` 便于时区处理。

---

### 2. 代码完善思路

#### 2.1 引入 Supabase Client

在 `app/api/applications/route.ts` 文件头部添加：

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)
```

#### 2.2 替换内存 Map 为数据库操作

- **提交作业（POST）**  
  - 作业提交成功后，`insert` 一条记录到 `jobs` 表。
- **查询作业（GET）**  
  - 查询单个作业：`select * from jobs where job_id = ...`
  - 查询用户作业列表：`select * from jobs where user_id = ... order by submit_time desc`
- **更新作业状态**  
  - Slurm 状态变化时，`update jobs set status=..., node=..., start_time=..., end_time=... where job_id=...`
- **删除作业（DELETE）**  
  - 作业取消后，`delete from jobs where job_id = ...`

---

### 3. 关键代码片段（TypeScript）

#### 3.1 插入作业

```ts
await supabase.from('jobs').insert([{
  job_id: slurmJobId,
  user_id: userId,
  app_name: appName,
  app_command: appCommand,
  node: '', // 提交时为空
  port,
  display,
  status: 'pending',
  submit_time: new Date().toISOString()
}])
```

#### 3.2 查询作业

```ts
// 查询单个作业
const { data: job } = await supabase.from('jobs').select('*').eq('job_id', jobId).single()

// 查询用户所有作业
const { data: jobs } = await supabase.from('jobs').select('*').eq('user_id', userId).order('submit_time', { ascending: false })
```

#### 3.3 更新作业状态

```ts
await supabase.from('jobs').update({
  status: 'running',
  node: nodeName,
  start_time: new Date().toISOString()
}).eq('job_id', jobId)
```

#### 3.4 删除作业

```ts
await supabase.from('jobs').delete().eq('job_id', jobId)
```

---

### 4. 下一步建议

- 先在 Supabase 控制台运行上述 SQL 建表。
- 按上述代码片段，将 `app/api/applications/route.ts` 里的内存 `jobs` Map 相关逻辑全部替换为数据库操作。
- 保持接口返回结构不变，前端无需大改。
- 可选：为作业表加外键约束（user_id 关联 users 表）。

---

#### 需要我直接帮你完成 `route.ts` 代码的具体改造吗？  
如需全量代码替换，请回复“是”，我会直接输出详细 TypeScript 改造方案和注释。
