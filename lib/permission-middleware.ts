import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { checkPermission, Permission } from '@/lib/permission-checker'
import { logPermissionAudit } from '@/lib/permission-audit'

export interface PermissionConfig {
  resource: string
  action: string
  scope?: string
  conditions?: object
}

/**
 * 权限控制中间件装饰器
 * @param permission 权限配置
 * @returns 包装后的API处理函数
 */
export function withPermission(permission: PermissionConfig) {
  return function(handler: Function) {
    return async function(req: NextRequest, ...args: any[]) {
      try {
        // 验证JWT
        const userInfo = getCurrentUser(req)
        if (!userInfo?.username) {
          return NextResponse.json({ 
            success: false, 
            error: '未登录或登录已过期' 
          }, { status: 401 })
        }

        // 检查权限
        const hasPermission = await checkPermission(userInfo, permission)
        if (!hasPermission) {
          // 记录权限审计日志
          await logPermissionAudit(userInfo, permission, false, req)
          
          return NextResponse.json({ 
            success: false, 
            error: '权限不足',
            details: {
              required: permission,
              user: userInfo.username
            }
          }, { status: 403 })
        }

        // 记录权限审计日志
        await logPermissionAudit(userInfo, permission, true, req)

        // 执行原始处理函数
        return handler(req, ...args)
      } catch (error) {
        console.error('权限中间件错误:', error)
        return NextResponse.json({ 
          success: false, 
          error: '权限验证失败' 
        }, { status: 500 })
      }
    }
  }
}

/**
 * 获取当前用户信息
 * @param req NextRequest对象
 * @returns 用户信息或null
 */
export function getCurrentUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    return userInfo
  } catch (error) {
    console.error('获取当前用户信息失败:', error)
    return null
  }
}

/**
 * 检查用户是否已登录
 * @param req NextRequest对象
 * @returns boolean 是否已登录
 */
export function isAuthenticated(req: NextRequest): boolean {
  return getCurrentUser(req) !== null
}

/**
 * 检查用户是否为管理员
 * @param req NextRequest对象
 * @returns boolean 是否为管理员
 */
export function isAdmin(req: NextRequest): boolean {
  const userInfo = getCurrentUser(req)
  return userInfo?.role === 'admin' ||
         userInfo?.role === 'system_admin' ||
         userInfo?.role === 'super_admin' ||
         userInfo?.isAdmin === true ||
         userInfo?.isSuperAdmin === true
}

/**
 * 检查用户是否为超级管理员
 * @param req NextRequest对象
 * @returns boolean 是否为超级管理员
 */
export function isSuperAdmin(req: NextRequest): boolean {
  const userInfo = getCurrentUser(req)
  return userInfo?.role === 'super_admin' || userInfo?.isSuperAdmin === true
}

/**
 * 权限检查辅助函数
 * @param req NextRequest对象
 * @param permission 权限配置
 * @returns Promise<boolean> 是否有权限
 */
export async function checkRequestPermission(req: NextRequest, permission: Permission): Promise<boolean> {
  const userInfo = getCurrentUser(req)
  if (!userInfo) {
    return false
  }
  
  return await checkPermission(userInfo, permission)
}

/**
 * 批量权限检查中间件
 * @param permissions 权限配置数组
 * @param requireAll 是否要求所有权限都满足
 * @returns 包装后的API处理函数
 */
export function withMultiplePermissions(permissions: PermissionConfig[], requireAll: boolean = true) {
  return function(handler: Function) {
    return async function(req: NextRequest, ...args: any[]) {
      try {
        // 验证JWT
        const userInfo = getCurrentUser(req)
        if (!userInfo?.username) {
          return NextResponse.json({ 
            success: false, 
            error: '未登录或登录已过期' 
          }, { status: 401 })
        }

        // 检查所有权限
        const permissionChecks = await Promise.all(
          permissions.map(permission => checkPermission(userInfo, permission))
        )

        const hasAllPermissions = requireAll 
          ? permissionChecks.every(result => result)
          : permissionChecks.some(result => result)

        if (!hasAllPermissions) {
          // 记录权限审计日志
          for (let i = 0; i < permissions.length; i++) {
            await logPermissionAudit(userInfo, permissions[i], permissionChecks[i], req)
          }
          
          return NextResponse.json({ 
            success: false, 
            error: '权限不足',
            details: {
              required: permissions,
              requireAll,
              results: permissionChecks,
              user: userInfo.username
            }
          }, { status: 403 })
        }

        // 记录权限审计日志
        for (let i = 0; i < permissions.length; i++) {
          await logPermissionAudit(userInfo, permissions[i], permissionChecks[i], req)
        }

        // 执行原始处理函数
        return handler(req, ...args)
      } catch (error) {
        console.error('批量权限中间件错误:', error)
        return NextResponse.json({ 
          success: false, 
          error: '权限验证失败' 
        }, { status: 500 })
      }
    }
  }
}

/**
 * 条件权限中间件
 * @param permission 权限配置
 * @param condition 条件函数
 * @returns 包装后的API处理函数
 */
export function withConditionalPermission(
  permission: PermissionConfig, 
  condition: (req: NextRequest, userInfo: any) => boolean | Promise<boolean>
) {
  return function(handler: Function) {
    return async function(req: NextRequest, ...args: any[]) {
      try {
        // 验证JWT
        const userInfo = getCurrentUser(req)
        if (!userInfo?.username) {
          return NextResponse.json({ 
            success: false, 
            error: '未登录或登录已过期' 
          }, { status: 401 })
        }

        // 检查条件
        const conditionResult = await condition(req, userInfo)
        if (!conditionResult) {
          return NextResponse.json({ 
            success: false, 
            error: '条件不满足' 
          }, { status: 403 })
        }

        // 检查权限
        const hasPermission = await checkPermission(userInfo, permission)
        if (!hasPermission) {
          // 记录权限审计日志
          await logPermissionAudit(userInfo, permission, false, req)
          
          return NextResponse.json({ 
            success: false, 
            error: '权限不足',
            details: {
              required: permission,
              user: userInfo.username
            }
          }, { status: 403 })
        }

        // 记录权限审计日志
        await logPermissionAudit(userInfo, permission, true, req)

        // 执行原始处理函数
        return handler(req, ...args)
      } catch (error) {
        console.error('条件权限中间件错误:', error)
        return NextResponse.json({ 
          success: false, 
          error: '权限验证失败' 
        }, { status: 500 })
      }
    }
  }
} 