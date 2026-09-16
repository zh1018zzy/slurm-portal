> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`
你的需求是：**实现一个通用的计算提交和管理系统，能够兼容多种调度器（如 Slurm、OpenPBS 等）**。  
这类系统的核心是“调度器适配层”，让前端和业务逻辑与具体调度器解耦，便于后续扩展和维护。

---

## 设计思路

### 1. 统一调度器接口（抽象层）

- 定义一组通用接口（TypeScript interface），如：
  - 提交作业（submitJob）
  - 查询作业状态（getJobStatus）
  - 取消作业（cancelJob）
  - 查询队列/分区（listPartitions/Queues）
  - 查询节点资源（listNodes）
- 每个调度器实现一套具体的适配器（adapter），实现这些接口。

#### 例子（TypeScript接口）：

```ts
export interface SchedulerAdapter {
  submitJob(options: SubmitJobOptions): Promise<JobInfo>;
  getJobStatus(jobId: string): Promise<JobStatus>;
  cancelJob(jobId: string): Promise<boolean>;
  listPartitions(): Promise<PartitionInfo[]>;
  listNodes(): Promise<NodeInfo[]>;
  // ...其他通用操作
}
```

### 2. 具体调度器适配器实现

- `lib/scheduler/slurm-adapter.ts`：实现 SchedulerAdapter，内部用 slurm 命令或API
- `lib/scheduler/openpbs-adapter.ts`：实现 SchedulerAdapter，内部用 qsub/qstat/qdel 等
- 未来可扩展 `lib/scheduler/lsf-adapter.ts`、`lib/scheduler/torque-adapter.ts` 等

### 3. 动态选择调度器

- 在配置文件或环境变量中指定当前集群使用的调度器类型（如 SLURM、PBS）
- 统一入口（如 `lib/scheduler/index.ts`）根据配置动态导出对应适配器

#### 例子：

```ts
import { slurmAdapter } from './slurm-adapter'
import { openpbsAdapter } from './openpbs-adapter'

const SCHEDULER = process.env.SCHEDULER_TYPE || 'slurm'

export const scheduler: SchedulerAdapter =
  SCHEDULER === 'pbs' ? openpbsAdapter : slurmAdapter
```

### 4. 前端/后端调用方式

- 后端 API 只调用 scheduler 统一接口，不关心底层实现
- 前端页面只和后端 API 交互，完全无感知调度器类型

---

## 目录结构建议

```
lib/
  scheduler/
    index.ts              // 动态调度器适配器入口
    types.ts              // 通用类型定义
    slurm-adapter.ts      // Slurm 适配器
    openpbs-adapter.ts    // OpenPBS 适配器
    ...
app/
  api/
    jobs/
      route.ts            // 统一作业提交/管理API，调用 scheduler
    ...
```

---

## 关键点说明

- **类型抽象**：所有调度器的作业、分区、节点等信息都要有统一的 TypeScript 类型，适配器内部做格式转换。
- **适配器隔离**：每个调度器的命令/API/解析逻辑都只在自己的 adapter 文件里实现。
- **易扩展**：未来支持新调度器只需新增 adapter 并实现接口即可。
- **配置灵活**：支持多集群/多调度器时，可按集群维度配置调度器类型。

---

## 参考开源项目

- [OpenHPC Portal](https://github.com/openhpc/ohpc-portal)：有类似的适配层设计
- [OpenPBS REST API](https://github.com/openpbs/openpbs/tree/master/contrib/pbs_rest)
- [Slurm REST API](https://slurm.schedmd.com/rest_api.html)

---

## 下一步建议

1. 先设计并实现 `SchedulerAdapter` 接口和类型定义
2. 实现 Slurm 和 OpenPBS 的 adapter（可先 mock，后续补全命令/解析）
3. 编写统一的 API 路由，调用 scheduler
4. 前端页面只对接统一 API

---

如需具体代码模板或某一部分详细实现（如 Slurm submitJob 适配），请告知！
