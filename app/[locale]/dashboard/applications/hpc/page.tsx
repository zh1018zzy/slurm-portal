'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useCurrentLocale } from '@/lib/i18n-client-utils'

export default function HpcApplicationsRedirect() {
  const router = useRouter()
  const currentLocale = useCurrentLocale()

  useEffect(() => {
    // 重定向到新的应用中心路径
    router.replace(`/${currentLocale}/dashboard/applications`)
  }, [router, currentLocale])

  return (
    <div className="container mx-auto p-6">
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">重定向中...</h2>
        <p className="text-muted-foreground">正在跳转到应用中心</p>
      </div>
    </div>
  )
}
