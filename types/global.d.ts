// 全局类型声明文件
declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react'
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string
    absoluteStrokeWidth?: boolean
  }
  
  export const Monitor: ComponentType<IconProps>
  export const Cpu: ComponentType<IconProps>
  export const MemoryStick: ComponentType<IconProps>
  export const HardDrive: ComponentType<IconProps>
  export const Activity: ComponentType<IconProps>
  export const Users: ComponentType<IconProps>
  export const BarChart3: ComponentType<IconProps>
  export const TrendingUp: ComponentType<IconProps>
  export const Server: ComponentType<IconProps>
  export const Database: ComponentType<IconProps>
  export const Zap: ComponentType<IconProps>
  export const RefreshCw: ComponentType<IconProps>
  export const AlertTriangle: ComponentType<IconProps>
  export const CheckCircle: ComponentType<IconProps>
  export const Settings: ComponentType<IconProps>
  export const Lightbulb: ComponentType<IconProps>
  export const BookOpen: ComponentType<IconProps>
  export const Terminal: ComponentType<IconProps>
  export const Upload: ComponentType<IconProps>
  export const Dna: ComponentType<IconProps>
  export const Search: ComponentType<IconProps>
  export const Filter: ComponentType<IconProps>
  export const Grid3X3: ComponentType<IconProps>
  export const List: ComponentType<IconProps>
  export const Play: ComponentType<IconProps>
  export const Loader2: ComponentType<IconProps>
  export const ChevronLeft: ComponentType<IconProps>
  export const ChevronRight: ComponentType<IconProps>
  export const Trash2: ComponentType<IconProps>
  export const ExternalLink: ComponentType<IconProps>
  export const FileText: ComponentType<IconProps>
  export const Globe: ComponentType<IconProps>
  export const Eye: ComponentType<IconProps>
  export const MonitorIcon: ComponentType<IconProps>
  export const AlertCircle: ComponentType<IconProps>
  export const Maximize2: ComponentType<IconProps>
  export const X: ComponentType<IconProps>
  export const PlayCircle: ComponentType<IconProps>
  export const PauseCircle: ComponentType<IconProps>
  export const Clock: ComponentType<IconProps>
  export const CpuIcon: ComponentType<IconProps>
  export const MemoryStickIcon: ComponentType<IconProps>
  export const Download: ComponentType<IconProps>
  export const Copy: ComponentType<IconProps>
  export const Check: ComponentType<IconProps>
  export const File: ComponentType<IconProps>
  export const Folder: ComponentType<IconProps>
  export const ArrowLeft: ComponentType<IconProps>
  export const Home: ComponentType<IconProps>
  export const Bell: ComponentType<IconProps>
  export const Menu: ComponentType<IconProps>
  export const History: ComponentType<IconProps>
  export const Plus: ComponentType<IconProps>
  export const Grid3x3: ComponentType<IconProps>
  export const User: ComponentType<IconProps>
  export const LogOut: ComponentType<IconProps>
  export const Archive: ComponentType<IconProps>
  export const EyeOff: ComponentType<IconProps>
  export const HardDriveIcon: ComponentType<IconProps>
  export const CheckCircleIcon: ComponentType<IconProps>
  export const ServerIcon: ComponentType<IconProps>
  export const ActivityIcon: ComponentType<IconProps>
  export const UsersIcon: ComponentType<IconProps>
  export const ClockIcon: ComponentType<IconProps>
  export const Shield: ComponentType<IconProps>
  export const Edit: ComponentType<IconProps>
  export const Pin: ComponentType<IconProps>
  export const Save: ComponentType<IconProps>
  export const Image: ComponentType<IconProps>
  export const Link: ComponentType<IconProps>
  export const Palette: ComponentType<IconProps>
  export const Music: ComponentType<IconProps>
  export const Circle: ComponentType<IconProps>
  export const CheckIcon: ComponentType<IconProps>
  export const MoonIcon: ComponentType<IconProps>
  export const SunIcon: ComponentType<IconProps>
  export const PaletteIcon: ComponentType<IconProps>
  export const XCircle: ComponentType<IconProps>
  export const Info: ComponentType<IconProps>
  export const CheckSquare: ComponentType<IconProps>
  export const Square: ComponentType<IconProps>
  export const Calendar: ComponentType<IconProps>
  export const RotateCcw: ComponentType<IconProps>
  export const Share: ComponentType<IconProps>
  export const UserX: ComponentType<IconProps>
  export const Lock: ComponentType<IconProps>
  export const HelpCircle: ComponentType<IconProps>
  export const PieChart: ComponentType<IconProps>
}

declare module 'recharts' {
  import { ComponentType, ReactNode } from 'react'
  
  export interface ResponsiveContainerProps {
    width?: string | number
    height?: string | number
    children: ReactNode
  }
  
  export interface PieChartProps {
    children: ReactNode
  }
  
  export interface PieProps {
    data: any[]
    dataKey: string
    nameKey?: string
    cx?: string | number
    cy?: string | number
    outerRadius?: number
    innerRadius?: number
    fill?: string
    label?: boolean | ((props: any) => string)
    labelLine?: boolean
    fontSize?: number
    children?: ReactNode
  }
  
  export interface CellProps {
    key: string
    fill: string
  }
  
  export interface TooltipProps {
    contentStyle?: React.CSSProperties
    formatter?: (value: any, name: string) => [any, string]
    labelFormatter?: (label: string) => string
    cursor?: React.CSSProperties
    content?: React.ReactElement | React.ComponentType<any>
  }
  
  export interface BarChartProps {
    data: any[]
    margin?: {
      top?: number
      right?: number
      left?: number
      bottom?: number
    }
    children: ReactNode
  }
  
  export interface LineChartProps {
    data: any[]
    margin?: {
      top?: number
      right?: number
      left?: number
      bottom?: number
    }
    children: ReactNode
  }
  
  export interface LineProps {
    type?: string
    dataKey: string
    stroke?: string
    strokeWidth?: number
    dot?: boolean | object
    activeDot?: boolean | object
    name?: string
  }
  
  export interface CartesianGridProps {
    strokeDasharray?: string
    stroke?: string
    horizontal?: boolean
    vertical?: boolean
  }
  
  export interface XAxisProps {
    dataKey: string
    stroke?: string
    fontSize?: number
    tick?: React.CSSProperties
    axisLine?: boolean
    tickLine?: boolean
    angle?: number
    textAnchor?: string
    height?: number
    interval?: number
    tickFormatter?: (value: any) => string
  }
  
  export interface YAxisProps {
    stroke?: string
    fontSize?: number
    tick?: React.CSSProperties
    axisLine?: boolean
    tickLine?: boolean
    domain?: [any, any]
  }
  
  export interface BarProps {
    dataKey: string
    fill: string
    radius?: number[]
    maxBarSize?: number
    children?: ReactNode
    name?: string
  }
  
  export interface LabelListProps {
    dataKey: string
    position?: string
    style?: React.CSSProperties
    formatter?: (value: number) => string
  }
  
  export const ResponsiveContainer: ComponentType<ResponsiveContainerProps>
  export const PieChart: ComponentType<PieChartProps>
  export const Pie: ComponentType<PieProps>
  export const Cell: ComponentType<CellProps>
  export const Tooltip: ComponentType<TooltipProps>
  export const BarChart: ComponentType<BarChartProps>
  export const LineChart: ComponentType<LineChartProps>
  export const Line: ComponentType<LineProps>
  export const AreaChart: ComponentType<any>
  export const Area: ComponentType<any>
  export const CartesianGrid: ComponentType<CartesianGridProps>
  export const XAxis: ComponentType<XAxisProps>
  export const YAxis: ComponentType<YAxisProps>
  export const Bar: ComponentType<BarProps>
  export const LabelList: ComponentType<LabelListProps>
  export const Legend: ComponentType<any>
}

declare module '@supabase/supabase-js' {
  export interface SupabaseClient {
    from: (table: string) => any
    auth: any
    storage: any
    rpc: any
  }
  
  export interface PostgrestBuilder {
    select: (columns?: string, options?: any) => PostgrestBuilder
    insert: (values: any, options?: any) => PostgrestBuilder
    update: (values: any, options?: any) => PostgrestBuilder
    delete: (options?: any) => PostgrestBuilder
    eq: (column: string, value: any) => PostgrestBuilder
    neq: (column: string, value: any) => PostgrestBuilder
    gt: (column: string, value: any) => PostgrestBuilder
    gte: (column: string, value: any) => PostgrestBuilder
    lt: (column: string, value: any) => PostgrestBuilder
    lte: (column: string, value: any) => PostgrestBuilder
    like: (column: string, value: string) => PostgrestBuilder
    ilike: (column: string, value: string) => PostgrestBuilder
    in: (column: string, values: any[]) => PostgrestBuilder
    not: (column: string, operator: string, value: any) => PostgrestBuilder
    or: (filters: string, values: any[]) => PostgrestBuilder
    order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => PostgrestBuilder
    limit: (count: number) => PostgrestBuilder
    range: (from: number, to: number) => PostgrestBuilder
    single: () => Promise<{ data: any; error: any }>
    maybeSingle: () => Promise<{ data: any; error: any }>
    then: (onfulfilled?: any, onrejected?: any) => Promise<any>
  }
  
  export function createClient(url: string, key: string, options?: any): SupabaseClient
}

// 本地模块类型声明
declare module '@/lib/scheduler/slurm-adapter' {
  interface JobInfo {
    jobId: string;
    jobName: string;
    user: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
    submitTime?: string;
    startTime?: string;
    endTime?: string;
    partition?: string;
    nodes?: string[];
    reason?: string;
    jobType?: 'compute' | 'graphics' | 'interactive';
    vncDisplay?: number;
    vncPort?: number;
    vncGeometry?: string;
    appCommand?: string;
    vncUrl?: string | Promise<string>;
    [key: string]: any;
  }

  export const slurmAdapter: {
    getJobStatus: (jobId: string) => Promise<any>
    getAllJobsStatus: () => Promise<any[]>
    listJobs: (
      targetUser?: string,
      options?: {
        days?: number
        limit?: number
      }
    ) => Promise<any[]>
    listActiveJobs: (targetUser?: string) => Promise<any[]>
    getJobLogs: (jobId: string) => Promise<any>
    cancelJob: (jobId: string) => Promise<boolean>
    suspendJob: (jobId: string) => Promise<boolean>
    resumeJob: (jobId: string) => Promise<boolean>
    listPartitions: () => Promise<any[]>
    listNodes: () => Promise<any[]>
    submitJob: (jobData: any) => Promise<JobInfo>
  }
}

declare module '@/lib/job-db' {
  export function batchUpsertJobsToDb(jobs: any[]): Promise<void>
  export function upsertJobToDb(job: any): Promise<void>
  export function updateJobVncInfo(jobId: string, vncInfo: any): Promise<void>
}

declare module '@/lib/job-cache' {
  export const jobCache: {
    get: (key: string) => any
    set: (key: string, value: any, ttl?: number) => void
    delete: (key: string) => void
    clear: () => void
    invalidate: (key: string) => void
    getStatsCache: (key: string) => any
    setStatsCache: (key: string, value: any, ttl?: number) => void
  }
} 