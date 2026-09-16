// SchedulerAdapter 通用接口和类型定义
// 适用于 Slurm、OpenPBS 等多种调度器

export interface SubmitJobOptions {
  script: string; // 作业脚本内容或路径
  partition?: string; // 分区/队列
  nodes?: number;
  ntasks?: number;
  cpusPerTask?: number;
  gpus?: number;
  mem?: string;
  time?: string; // 格式: 01:00:00
  jobName?: string;
  jobType?: 'compute' | 'graphics' | 'interactive'; // 作业类型
  // Graphics 作业特有参数
  vncDisplay?: number;
  vncPort?: number;
  vncGeometry?: string;
  appCommand?: string;
  [key: string]: any; // 兼容扩展
}

export interface JobInfo {
  jobId: string;
  jobName: string;
  user: string;
  status: JobStatus;
  submitTime?: string;
  startTime?: string;
  endTime?: string;
  partition?: string;
  nodes?: string[];
  reason?: string;
  jobType?: 'compute' | 'graphics' | 'interactive';
  // Graphics 作业特有字段
  vncDisplay?: number;
  vncPort?: number;
  vncGeometry?: string;
  appCommand?: string;
  vncUrl?: string | Promise<string>;
  [key: string]: any;
}

export type JobStatus = 'PENDING' | 'RUNNING' | 'SUSPENDED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';

export interface PartitionInfo {
  name: string;
  nodeCount: number;
  cpuCount: number;
  gpuCount?: number;
  state?: string;
  cpuTotal?: number;
  cpuAlloc?: number;
  cpuIdle?: number;
  healthyNodes?: number;
  unhealthyNodes?: number;
  gpuTotal?: number;
  gpuAlloc?: number;
  status?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  gpuUsage?: number;
  [key: string]: any;
}

export interface NodeInfo {
  name: string;
  state: string;
  cpuTotal: number;
  cpuAlloc: number;
  memTotal: number;
  memAlloc: number;
  gpuTotal?: number;
  gpuAlloc?: number;
  [key: string]: any;
}

export interface SchedulerAdapter {
  submitJob(options: SubmitJobOptions): Promise<JobInfo>;
  getJobStatus(jobId: string): Promise<JobInfo>;
  cancelJob(jobId: string): Promise<boolean>;
  suspendJob(jobId: string): Promise<boolean>;
  resumeJob(jobId: string): Promise<boolean>;
  listJobs(
    user?: string,
    options?: {
      days?: number;
      limit?: number;
    }
  ): Promise<JobInfo[]>;
  listActiveJobs(user?: string): Promise<JobInfo[]>; // 新增：高效查询活跃作业
  listPartitions(): Promise<PartitionInfo[]>;
  listNodes(): Promise<NodeInfo[]>;
  getJobLogs(jobId: string): Promise<{ stdout: string; stderr: string }>;
}

// 说明：
// - 所有调度器适配器都需实现 SchedulerAdapter 接口
// - 类型字段可根据实际调度器扩展
// - 便于前后端类型安全和多调度器切换 