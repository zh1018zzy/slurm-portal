'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'

interface AdminProtectedProps {
  children: ReactNode
  fallback?: ReactNode
  showAccessDenied?: boolean
}

/**
 * 管理员权限保护组件
 * 只有管理员用户才能访问包装的内容
 */
export function AdminProtected({ 
  children, 
  fallback,
  showAccessDenied = true 
}: AdminProtectedProps) {
  const { user, authLoaded } = useAuth()

  // 加载中状态
  if (!authLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">正在验证用户权限...</p>
        </div>
      </div>
    )
  }

  // 未登录用户
  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">需要登录</h3>
          <p className="text-gray-600 mb-4">请先登录后再访问此页面</p>
          <Button onClick={() => window.location.href = '/login'}>
            前往登录
          </Button>
        </div>
      </div>
    )
  }

  // 检查是否为管理员（包括超级管理员）
  const isAdmin = user.isAdmin ||
                  user.role === 'admin' ||
                  user.role === 'super_admin' ||
                  user.isSuperAdmin === true

  if (isAdmin) {
    return <>{children}</>
  }

  // 如果提供了自定义fallback，使用它
  if (fallback) {
    return <>{fallback}</>
  }

  // 默认的权限不足提示UI
  if (showAccessDenied) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-700">
              访问受限
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-base">
                此页面需要管理员权限才能访问，您当前的权限不足
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">当前用户信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>用户名:</span>
                  <span className="font-medium">{user.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>用户角色:</span>
                  <span className="font-medium">{user.role || 'user'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>管理员权限:</span>
                  <span className="font-medium text-red-600">无</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-600">
                如需访问此功能，请联系系统管理员申请相应权限
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="outline"
                  onClick={() => {
                    window.history.back()
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回上页
                </Button>
                
                <Button 
                  onClick={() => {
                    window.location.href = '/dashboard'
                  }}
                >
                  返回主页
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center">
              如有疑问，请联系系统管理员
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 简单的拒绝访问提示
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">权限不足</h3>
        <p className="text-gray-600">此页面需要管理员权限</p>
      </div>
    </div>
  )
}

export default AdminProtected