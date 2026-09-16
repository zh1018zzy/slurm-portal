'use client'

import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity, History, Plus, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n-utils'

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useT('jobs')
  const tDashboard = useT('dashboard')
  const tReports = useT('jobsReports')

  // 作业管理子菜单项
  const jobSubItems = [
    {
      href: `/${locale}/dashboard/jobs`,
      label: t('list'),
      icon: Activity
    },
    {
      href: `/${locale}/dashboard/jobs/history`,
      label: t('history'),
      icon: History
    },
    {
      href: `/${locale}/dashboard/jobs/reports`,
      label: tReports('title'),
      icon: BarChart3
    },
    {
      href: `/${locale}/dashboard/submit`,
      label: tDashboard('submitJob'),
      icon: Plus
    }
  ]

  return (
    <div className="space-y-6">
      {/* 子菜单导航 */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {jobSubItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "flex items-center space-x-2 px-6 py-3 rounded-none border-b-2 text-base",
                    isActive 
                      ? "border-primary bg-primary text-primary-foreground font-medium" 
                      : "border-transparent hover:border-muted-foreground/20 hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* 页面内容 */}
      <div>
        {children}
      </div>
    </div>
  )
} 