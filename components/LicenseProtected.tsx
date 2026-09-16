'use client'

import { ReactNode } from 'react'

interface LicenseProtectedProps {
  feature: string
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

/**
 * 功能保护壳（开源版）
 *
 * 开源版已移除商业许可证体系，此组件始终渲染子组件。
 * 保留原 props 签名以兼容既有调用方（如 big-screen、VNC 等页面）。
 */
export function LicenseProtected({
  children,
}: LicenseProtectedProps) {
  return <>{children}</>
}

export default LicenseProtected
