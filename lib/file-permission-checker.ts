import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export interface FilePermission {
  id: string
  userId: string
  permissionType: 'file_upload' | 'file_download' | 'file_preview' | 'file_delete' | 'file_share' | 'file_export' | 'file_copy'
  isEnabled: boolean
  maxFileSize?: number
  quotaLimit?: number
}

export interface FileOperationRequest {
  userId: string
  username: string
  operationType: 'file_upload' | 'file_download' | 'file_preview' | 'file_delete' | 'file_share' | 'file_export' | 'file_copy'
  filePath?: string
  fileSize?: number
  fileType?: string
  ipAddress?: string
}

export interface FilePermissionResult {
  hasPermission: boolean
  reason?: string
  quotaUsed?: number
  quotaRemaining?: number
}

/**
 * 检查文件操作权限
 */
export async function checkFilePermission(request: FileOperationRequest): Promise<FilePermissionResult> {
  try {
    // 获取用户文件权限 - 改为获取所有匹配的记录
    const { data: permissions, error } = await supabase
      .from('file_permissions')
      .select('*')
      .eq('user_id', request.userId)
      .eq('permission_type', request.operationType)
      .eq('is_enabled', true)

    if (error) {
      console.error('获取文件权限失败:', error)
      return { hasPermission: false, reason: '权限查询失败' }
    }

    if (!permissions || permissions.length === 0) {
      return { hasPermission: false, reason: '未配置文件权限' }
    }

    // 使用第一条权限记录进行检查
    const permission = permissions[0]

    // 检查文件大小限制
    if (permission.max_file_size && request.fileSize) {
      if (request.fileSize > permission.max_file_size) {
        return { hasPermission: false, reason: `文件大小超过限制 (${formatFileSize(permission.max_file_size)})` }
      }
    }

    // 检查配额限制
    if (permission.quota_limit) {
      const quotaUsed = await getUserQuotaUsed(request.userId)
      const quotaRemaining = permission.quota_limit - quotaUsed
      
      if (request.fileSize && request.fileSize > quotaRemaining) {
        return { 
          hasPermission: false, 
          reason: '存储配额不足',
          quotaUsed: quotaUsed,
          quotaRemaining: quotaRemaining
        }
      }
    }

    return { hasPermission: true }
  } catch (error) {
    console.error('文件权限检查失败:', error)
    return { hasPermission: false, reason: '权限检查异常' }
  }
}

/**
 * 获取用户已使用的配额
 */
async function getUserQuotaUsed(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('file_operation_logs')
      .select('file_size')
      .eq('user_id', userId)
      .eq('operation_type', 'file_upload')
      .eq('result', 'granted')

    if (error || !data) {
      return 0
    }

    return data.reduce((total: number, log: any) => total + (log.file_size || 0), 0)
  } catch (error) {
    console.error('获取用户配额使用情况失败:', error)
    return 0
  }
}

/**
 * 记录文件操作日志
 */
export async function logFileOperation(request: FileOperationRequest, result: FilePermissionResult): Promise<void> {
  try {
    await supabase
      .from('file_operation_logs')
      .insert({
        user_id: request.userId,
        username: request.username,
        operation_type: request.operationType,
        file_path: request.filePath,
        file_size: request.fileSize,
        file_type: request.fileType,
        result: result.hasPermission ? 'granted' : 'denied',
        reason: result.reason,
        ip_address: request.ipAddress
      })
  } catch (error) {
    console.error('记录文件操作日志失败:', error)
  }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 获取用户文件权限列表
 */
export async function getUserFilePermissions(userId: string): Promise<FilePermission[]> {
  try {
    const { data, error } = await supabase
      .from('file_permissions')
      .select('*')
      .eq('user_id', userId)

    if (error || !data) {
      return []
    }

    return data.map((perm: any) => ({
      id: perm.id,
      userId: perm.user_id,
      permissionType: perm.permission_type,
      isEnabled: perm.is_enabled,
      maxFileSize: perm.max_file_size,
      quotaLimit: perm.quota_limit
    }))
  } catch (error) {
    console.error('获取用户文件权限失败:', error)
    return []
  }
}

/**
 * 更新用户文件权限
 */
export async function updateUserFilePermission(
  userId: string, 
  permissionType: string, 
  updates: Partial<FilePermission>
): Promise<boolean> {
  try {
    // 先检查是否已存在
    const { data: existing } = await supabase
      .from('file_permissions')
      .select('id')
      .eq('user_id', userId)
      .eq('permission_type', permissionType)
      .single()

    if (existing) {
      // 更新现有记录
      const { error } = await supabase
        .from('file_permissions')
        .update({
          is_enabled: updates.isEnabled,
          max_file_size: updates.maxFileSize,
          quota_limit: updates.quotaLimit
        })
        .eq('user_id', userId)
        .eq('permission_type', permissionType)

      return !error
    } else {
      // 创建新记录
      const { error } = await supabase
        .from('file_permissions')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          permission_type: permissionType,
          is_enabled: updates.isEnabled ?? true,
          max_file_size: updates.maxFileSize,
          quota_limit: updates.quotaLimit
        })

      return !error
    }
  } catch (error) {
    console.error('更新用户文件权限失败:', error)
    return false
  }
}

/**
 * 删除用户文件权限
 */
export async function deleteUserFilePermission(userId: string, permissionType: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('file_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_type', permissionType)

    return !error
  } catch (error) {
    console.error('删除用户文件权限失败:', error)
    return false
  }
} 

/**
 * 通过用户名获取用户文件权限列表
 */
export async function getUserFilePermissionsByUsername(username: string): Promise<FilePermission[]> {
  try {
    // 先通过用户名查找用户ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (userError || !user) {
      console.error('通过用户名查找用户失败:', userError)
      return []
    }

    // 然后通过用户ID获取权限
    return await getUserFilePermissions(user.id)
  } catch (error) {
    console.error('通过用户名获取用户文件权限失败:', error)
    return []
  }
} 