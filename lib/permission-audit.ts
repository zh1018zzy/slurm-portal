import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export interface AuditLogEntry {
  user_id: string
  action: string
  resource: string
  resource_id?: string
  permission_granted: boolean
  ip_address?: string
  user_agent?: string
  additional_data?: object
}

/**
 * 记录权限审计日志
 * @param userInfo 用户信息
 * @param permission 权限配置
 * @param granted 是否授权
 * @param req 请求对象
 * @param additionalData 额外数据
 */
export async function logPermissionAudit(
  userInfo: any,
  permission: any,
  granted: boolean,
  req: NextRequest,
  additionalData?: object
) {
  try {
    const auditEntry: AuditLogEntry = {
      user_id: userInfo.id || userInfo.username,
      action: permission.action,
      resource: permission.resource,
      resource_id: permission.resource_id,
      permission_granted: granted,
      ip_address: getClientIP(req),
      user_agent: req.headers.get('user-agent') || undefined,
      additional_data: additionalData
    }

    await supabase.from('permission_audit_logs').insert(auditEntry)
  } catch (error) {
    console.error('权限审计日志记录失败:', error)
    // 审计日志失败不应该影响主流程，所以只记录错误
  }
}

/**
 * 获取客户端IP地址
 * @param req 请求对象
 * @returns IP地址字符串
 */
function getClientIP(req: NextRequest): string {
  // 尝试从各种头部获取真实IP
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = req.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // 如果都没有，返回默认值
  return req.ip || 'unknown'
}

/**
 * 获取权限审计日志
 * @param filters 过滤条件
 * @returns Promise<AuditLogEntry[]> 审计日志列表
 */
export async function getPermissionAuditLogs(filters: {
  userId?: string
  resource?: string
  action?: string
  startDate?: string
  endDate?: string
  granted?: boolean
  page?: number
  pageSize?: number
} = {}): Promise<{ logs: AuditLogEntry[], total: number }> {
  try {
    let query = supabase
      .from('permission_audit_logs')
      .select('*', { count: 'exact' })

    // 应用过滤器
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }
    if (filters.resource) {
      query = query.eq('resource', filters.resource)
    }
    if (filters.action) {
      query = query.eq('action', filters.action)
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }
    if (filters.granted !== undefined) {
      query = query.eq('permission_granted', filters.granted)
    }

    // 分页
    const page = filters.page || 1
    const pageSize = filters.pageSize || 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('获取权限审计日志失败:', error)
      return { logs: [], total: 0 }
    }

    return { logs: data || [], total: count || 0 }
  } catch (error) {
    console.error('获取权限审计日志失败:', error)
    return { logs: [], total: 0 }
  }
}

/**
 * 获取权限使用统计
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns Promise<object> 统计信息
 */
export async function getPermissionUsageStats(
  startDate?: string,
  endDate?: string
): Promise<{
  totalChecks: number
  grantedChecks: number
  deniedChecks: number
  grantRate: number
  topResources: Array<{ resource: string; count: number }>
  topActions: Array<{ action: string; count: number }>
  topUsers: Array<{ user_id: string; count: number }>
}> {
  try {
    let query = supabase.from('permission_audit_logs').select('*')

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error || !data) {
      return {
        totalChecks: 0,
        grantedChecks: 0,
        deniedChecks: 0,
        grantRate: 0,
        topResources: [],
        topActions: [],
        topUsers: []
      }
    }

    const totalChecks = data.length
    const grantedChecks = data.filter((log: any) => log.permission_granted).length
    const deniedChecks = totalChecks - grantedChecks
    const grantRate = totalChecks > 0 ? (grantedChecks / totalChecks) * 100 : 0

    // 统计资源使用情况
    const resourceCounts: Record<string, number> = {}
    data.forEach((log: any) => {
      resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1
    })
    const topResources = Object.entries(resourceCounts)
      .map(([resource, count]) => ({ resource, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 统计操作使用情况
    const actionCounts: Record<string, number> = {}
    data.forEach((log: any) => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
    })
    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 统计用户使用情况
    const userCounts: Record<string, number> = {}
    data.forEach((log: any) => {
      userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1
    })
    const topUsers = Object.entries(userCounts)
      .map(([user_id, count]) => ({ user_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalChecks,
      grantedChecks,
      deniedChecks,
      grantRate,
      topResources,
      topActions,
      topUsers
    }
  } catch (error) {
    console.error('获取权限使用统计失败:', error)
    return {
      totalChecks: 0,
      grantedChecks: 0,
      deniedChecks: 0,
      grantRate: 0,
      topResources: [],
      topActions: [],
      topUsers: []
    }
  }
}

/**
 * 清理旧的审计日志
 * @param daysToKeep 保留天数
 * @returns Promise<number> 删除的记录数
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { data, error } = await supabase
      .from('permission_audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select()

    if (error) {
      console.error('清理旧审计日志失败:', error)
      return 0
    }

    return data?.length || 0
  } catch (error) {
    console.error('清理旧审计日志失败:', error)
    return 0
  }
}

/**
 * 导出审计日志
 * @param filters 过滤条件
 * @param format 导出格式 ('csv' | 'json')
 * @returns Promise<string> 导出的数据
 */
export async function exportAuditLogs(
  filters: {
    userId?: string
    resource?: string
    action?: string
    startDate?: string
    endDate?: string
    granted?: boolean
  } = {},
  format: 'csv' | 'json' = 'csv'
): Promise<string> {
  try {
    const { logs } = await getPermissionAuditLogs({ ...filters, page: 1, pageSize: 10000 })

    if (format === 'json') {
      return JSON.stringify(logs, null, 2)
    }

    // CSV格式
    if (logs.length === 0) {
      return 'user_id,action,resource,resource_id,permission_granted,ip_address,user_agent,created_at\n'
    }

    const headers = Object.keys(logs[0]).join(',')
    const rows = logs.map(log => 
      Object.values(log).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    )

    return [headers, ...rows].join('\n')
  } catch (error) {
    console.error('导出审计日志失败:', error)
    return ''
  }
} 