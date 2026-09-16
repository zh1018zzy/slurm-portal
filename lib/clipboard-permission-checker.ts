import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export interface ClipboardPermission {
  id: number
  user_id?: string
  role_id?: number
  department_id?: number
  permission_type: 'clipboard_read' | 'clipboard_write' | 'clipboard_clear' | 'clipboard_history' | 'clipboard_share'
  content_types?: string[]
  size_limit?: number
  history_limit?: number
  allowed_apps?: string[]
  denied_apps?: string[]
  encryption_required?: boolean
  audit_enabled?: boolean
  expires_at?: string
  is_active: boolean
}

export interface ClipboardPermissionCheck {
  hasPermission: boolean
  reason?: string
  sizeLimit?: number
  historyLimit?: number
  encryptionRequired?: boolean
}

/**
 * 检查剪贴板权限
 */
export async function checkClipboardPermission(
  userId: string,
  permissionType: ClipboardPermission['permission_type'],
  options: {
    contentType?: string
    contentSize?: number
    appName?: string
  } = {}
): Promise<ClipboardPermissionCheck> {
  try {
    // 获取用户信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, department')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return { hasPermission: false, reason: '用户不存在' }
    }

    // 获取用户权限（优先级：用户 > 角色 > 部门）
    let permission: ClipboardPermission | null = null

    // 1. 检查用户直接权限
    const { data: userPermission } = await supabase
      .from('clipboard_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('permission_type', permissionType)
      .eq('is_active', true)
      .is('expires_at', null)
      .or(`expires_at.gt.${new Date().toISOString()}`)
      .single()

    if (userPermission) {
      permission = userPermission
    } else {
      // 2. 检查角色权限
      const { data: rolePermission } = await supabase
        .from('clipboard_permissions')
        .select('*')
        .eq('role_id', userData.role)
        .eq('permission_type', permissionType)
        .eq('is_active', true)
        .is('expires_at', null)
        .or(`expires_at.gt.${new Date().toISOString()}`)
        .single()

      if (rolePermission) {
        permission = rolePermission
      } else {
        // 3. 检查部门权限
        const { data: deptPermission } = await supabase
          .from('clipboard_permissions')
          .select('*')
          .eq('department_id', userData.department)
          .eq('permission_type', permissionType)
          .eq('is_active', true)
          .is('expires_at', null)
          .or(`expires_at.gt.${new Date().toISOString()}`)
          .single()

        if (deptPermission) {
          permission = deptPermission
        }
      }
    }

    if (!permission) {
      return { hasPermission: false, reason: `没有${permissionType}权限` }
    }

    // 检查内容类型
    if (permission.content_types && options.contentType) {
      if (!permission.content_types.includes(options.contentType)) {
        return { hasPermission: false, reason: `不支持的内容类型: ${options.contentType}` }
      }
    }

    // 检查内容大小
    if (permission.size_limit && options.contentSize) {
      if (options.contentSize > permission.size_limit) {
        return { 
          hasPermission: false, 
          reason: `内容大小超出限制: ${options.contentSize} > ${permission.size_limit}`,
          sizeLimit: permission.size_limit
        }
      }
    }

    // 检查应用权限
    if (permission.denied_apps && options.appName) {
      if (permission.denied_apps.includes(options.appName)) {
        return { hasPermission: false, reason: `应用被禁止访问: ${options.appName}` }
      }
    }

    if (permission.allowed_apps && options.appName) {
      if (!permission.allowed_apps.includes('*') && !permission.allowed_apps.includes(options.appName)) {
        return { hasPermission: false, reason: `应用不在允许列表中: ${options.appName}` }
      }
    }

    return { 
      hasPermission: true,
      sizeLimit: permission.size_limit,
      historyLimit: permission.history_limit,
      encryptionRequired: permission.encryption_required
    }
  } catch (error) {
    console.error('检查剪贴板权限失败:', error)
    return { hasPermission: false, reason: '权限检查失败' }
  }
}

/**
 * 检查剪贴板读取权限
 */
export async function checkClipboardRead(userId: string, contentType?: string, contentSize?: number): Promise<boolean> {
  const result = await checkClipboardPermission(userId, 'clipboard_read', { contentType, contentSize })
  return result.hasPermission
}

/**
 * 检查剪贴板写入权限
 */
export async function checkClipboardWrite(userId: string, contentType?: string, contentSize?: number): Promise<boolean> {
  const result = await checkClipboardPermission(userId, 'clipboard_write', { contentType, contentSize })
  return result.hasPermission
}

/**
 * 检查剪贴板清空权限
 */
export async function checkClipboardClear(userId: string): Promise<boolean> {
  const result = await checkClipboardPermission(userId, 'clipboard_clear')
  return result.hasPermission
}

/**
 * 检查剪贴板历史权限
 */
export async function checkClipboardHistory(userId: string): Promise<boolean> {
  const result = await checkClipboardPermission(userId, 'clipboard_history')
  return result.hasPermission
}

/**
 * 检查剪贴板共享权限
 */
export async function checkClipboardShare(userId: string, contentType?: string, contentSize?: number): Promise<boolean> {
  const result = await checkClipboardPermission(userId, 'clipboard_share', { contentType, contentSize })
  return result.hasPermission
}

/**
 * 记录剪贴板操作审计日志
 */
export async function logClipboardOperation(
  userId: string,
  permissionType: ClipboardPermission['permission_type'],
  options: {
    contentType?: string
    contentSize?: number
    contentHash?: string
    appName?: string
    result: 'granted' | 'denied' | 'error'
    reason?: string
    ipAddress?: string
  }
): Promise<void> {
  try {
    await supabase
      .from('extended_permission_audit_logs')
      .insert({
        user_id: userId,
        permission_type: permissionType,
        resource_type: 'clipboard',
        action: permissionType.replace('clipboard_', ''),
        clipboard_content_hash: options.contentHash,
        ip_address: options.ipAddress,
        result: options.result,
        reason: options.reason,
        metadata: {
          content_type: options.contentType,
          content_size: options.contentSize,
          app_name: options.appName
        }
      })
  } catch (error) {
    console.error('记录剪贴板操作审计日志失败:', error)
  }
}

/**
 * 加密剪贴板内容（如果需要）
 */
export function encryptClipboardContent(content: string, key?: string): string {
  // 这里实现简单的加密逻辑，实际应用中应使用更安全的加密方法
  if (!key) {
    key = process.env.CLIPBOARD_ENCRYPTION_KEY || 'default-key'
  }
  
  // 简单的异或加密（仅用于演示）
  const encrypted = content.split('').map((char, index) => {
    const keyChar = key[index % key.length]
    return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0))
  }).join('')
  
  return Buffer.from(encrypted).toString('base64')
}

/**
 * 解密剪贴板内容
 */
export function decryptClipboardContent(encryptedContent: string, key?: string): string {
  if (!key) {
    key = process.env.CLIPBOARD_ENCRYPTION_KEY || 'default-key'
  }
  
  try {
    const decoded = Buffer.from(encryptedContent, 'base64').toString()
    const decrypted = decoded.split('').map((char, index) => {
      const keyChar = key[index % key.length]
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0))
    }).join('')
    
    return decrypted
  } catch (error) {
    console.error('解密剪贴板内容失败:', error)
    return encryptedContent
  }
} 