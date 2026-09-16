'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  BarChart3, 
  FileText, 
  Settings, 
  Users, 
  Bell, 
  Database, 
  HardDrive,
  Activity,
  Terminal,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Grid3x3,
  User,
  LogOut,
  Shield,
  Lock,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useSystemSettings } from '@/hooks/use-system-settings'
import { useBigScreenSettings } from '@/hooks/use-big-screen-settings'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { SystemLogo } from '@/components/SystemLogo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import CopyrightFooter from '@/components/CopyrightFooter'
import DashboardBranding from '@/components/DashboardBranding'
import SystemFavicon from '@/components/SystemFavicon'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NotificationProvider } from '@/contexts/NotificationProvider'
import { NotificationBadge } from '@/components/notifications/NotificationBadge'
import { NavItem } from '@/components/navigation/NavItem'
import { useT } from '@/lib/i18n-utils'
import { useCurrentLocale } from '@/lib/i18n-client-utils'
import { getUserRoleLabel } from '@/lib/admin-utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const WebShell = dynamic(() => import('@/components/WebShell'), { ssr: false })
const NotificationDropdown = dynamic(() => import('@/components/notifications/NotificationDropdown').then(mod => ({ default: mod.NotificationDropdown })), { ssr: false })

// 主导航项配置
const getNavItems = (locale: string, applicationsCenterEnabled: boolean = true, t: any) => {
  const items = [
    {
      href: `/${locale}/dashboard`,
      label: t('overview'),
      icon: BarChart3
    }
  ]

  // 根据系统设置决定是否显示应用中心
  if (applicationsCenterEnabled) {
    items.push({
      href: `/${locale}/dashboard/applications`,
      label: t('applications'),
      icon: Grid3x3
    })
  }

  // 添加其他菜单项
  items.push(
    {
      href: `/${locale}/dashboard/submit`,
      label: t('submitJob'),
      icon: FileText
    },
    {
      href: `/${locale}/dashboard/jobs`,
      label: t('jobs'),
      icon: Activity
    },
    {
      href: `/${locale}/dashboard/applications/vnc`,
      label: t('systemDesktop'),
      icon: Monitor
    },
    {
      href: `/${locale}/dashboard/files`,
      label: t('files'),
      icon: HardDrive
    },
    {
      href: `/${locale}/dashboard/notifications`,
      label: t('notifications'),
      icon: Bell
    }
  )

  return items
}

// 系统管理项（仅管理员可见）- 已移至 SystemMenu 组件内部

// 大屏显示按钮组件
function BigScreenButton() {
  const { user } = useAuth()
  const { settings, loading } = useBigScreenSettings()
  const currentLocale = useCurrentLocale()
  const t = useT('bigScreen')

  // 调试日志
  console.log('🔍 BigScreenButton 调试信息:', {
    user: user,
    userRole: user?.role,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin' || user?.isSuperAdmin === true,
    settings: settings,
    bigScreenButtonEnabled: settings.bigScreenButtonEnabled,
    loading: loading
  })

  // 只有管理员才能看到大屏按钮，且需要启用大屏按钮设置
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.isSuperAdmin === true
  if (!isAdmin || !settings.bigScreenButtonEnabled) {
    console.log('🚫 大屏按钮被隐藏:', {
      reason: !isAdmin ? `非管理员(当前角色: ${user?.role})` : '设置禁用',
      userRole: user?.role,
      bigScreenButtonEnabled: settings.bigScreenButtonEnabled
    })
    return null
  }

  // 如果正在加载设置，显示加载状态
  if (loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="flex items-center space-x-2 text-base py-2 px-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-400/30 text-green-600 dark:text-green-400 transition-all duration-300"
        disabled
      >
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
        <span>{t('button')}</span>
      </Button>
    )
  }

  return (
    <Link href={`/${currentLocale}/big-screen`} target="_blank">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center space-x-2 text-base py-2 px-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 border-green-400/30 hover:border-green-400/60 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300"
        title={t('buttonTitle')}
      >
        <Monitor className="h-4 w-4" />
        <span>{t('button')}</span>
      </Button>
    </Link>
  )
}

// 系统管理菜单组件（可展开/折叠）
function SystemMenu({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const currentLocale = useCurrentLocale()
  const tDashboard = useT('dashboard')
  const tSystem = useT('system')

  // 检查是否有系统管理相关的活跃路径（必须在所有 hooks 之前计算）
  const isSystemActive = pathname.includes('/dashboard/system') || pathname.includes('/dashboard/assets/nodes')
  
  // 所有 hooks 必须在条件返回之前调用
  const [accordionValue, setAccordionValue] = useState<string>(isSystemActive ? "system" : "")

  // 当路径变化时，自动展开/折叠菜单
  useEffect(() => {
    if (isSystemActive && accordionValue !== "system") {
      setAccordionValue("system")
    }
  }, [isSystemActive, pathname])

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.isSuperAdmin === true
  if (!isAdmin) {
    return null
  }

  // 系统管理子菜单项
  const systemSubItems = [
    {
      href: `/${currentLocale}/dashboard/system`,
      label: tSystem('overview'),
      icon: Activity
    },
    {
      href: `/${currentLocale}/dashboard/assets/nodes`,
      label: tDashboard('nodeMonitor'),
      icon: Monitor
    },
    {
      href: `/${currentLocale}/dashboard/system/users`,
      label: tSystem('usersManagement'),
      icon: Users
    },
    {
      href: `/${currentLocale}/dashboard/system/groups`,
      label: tSystem('groupsManagement'),
      icon: Shield
    },
    {
      href: `/${currentLocale}/dashboard/system/applications/management`,
      label: tSystem('hpcAppsManagement'),
      icon: Database
    },
    {
      href: `/${currentLocale}/dashboard/system/permissions/file-permissions`,
      label: tSystem('filePermissionsManagement'),
      icon: Lock
    },
    {
      href: `/${currentLocale}/dashboard/system/announcements`,
      label: tSystem('announcementsManagement'),
      icon: Bell
    },
    {
      href: `/${currentLocale}/dashboard/system/logs`,
      label: tSystem('systemLogs'),
      icon: FileText
    },
    {
      href: `/${currentLocale}/dashboard/system/settings`,
      label: tSystem('settings'),
      icon: Settings
    }
  ]

  // 如果侧边栏折叠，显示简化版本
  if (collapsed) {
    return (
      <div className="p-4 border-t border-green-500/10">
        <Link href={`/${currentLocale}/dashboard/system`}>
          <Button
            variant={isSystemActive ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "w-full justify-center px-2",
              isSystemActive && "bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400 font-medium"
            )}
            title={tSystem('title')}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  // 展开状态：显示可展开的菜单
  return (
    <div className="p-4 border-t border-green-500/10">
      <Accordion 
        type="single" 
        collapsible 
        value={accordionValue}
        onValueChange={setAccordionValue}
        className="w-full"
      >
        <AccordionItem value="system" className="border-none">
          <AccordionTrigger 
            className={cn(
              "py-2 px-3 hover:no-underline rounded-md transition-colors w-full",
              isSystemActive && "bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400"
            )}
          >
            <div className="flex items-center space-x-2 flex-1 text-left">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">{tSystem('title')}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-0 px-0">
            <div className="space-y-1 pl-7 pr-0">
              {systemSubItems.map((item) => {
                const Icon = item.icon
                // 移除语言前缀进行匹配
                const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/')
                const itemHrefWithoutLocale = item.href.replace(/^\/[a-z]{2}\//, '/')
                const isActive = pathWithoutLocale === itemHrefWithoutLocale || pathWithoutLocale.startsWith(itemHrefWithoutLocale + '/')
                
                return (
                  <Link key={item.href} href={item.href} className="block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-xs py-1.5 h-auto transition-colors",
                        isActive 
                          ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400 font-medium" 
                          : "hover:bg-green-500/5 hover:text-green-600 dark:hover:text-green-400"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Button>
                  </Link>
                )
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

// 页面标题组件
function PageTitle() {
  const pathname = usePathname()
  const { settings } = useSystemSettings()
  const t = useT('dashboard')
  const tJobs = useT('jobs')
  const tFiles = useT('files')
  const tSystem = useT('system')
  
  const getPageTitle = () => {
    // 移除语言前缀后匹配路径
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/')
    
    if (pathWithoutLocale === '/dashboard') return t('overview')
    if (pathWithoutLocale.startsWith('/dashboard/jobs')) return tJobs('title')
    if (pathWithoutLocale.startsWith('/dashboard/submit')) return tJobs('submit')
    if (pathWithoutLocale.startsWith('/dashboard/files')) return tFiles('title')
    if (pathWithoutLocale.startsWith('/dashboard/applications/vnc')) return t('systemDesktop')
    if (pathWithoutLocale.startsWith('/dashboard/applications') && settings?.applicationsCenterEnabled) return t('applications')
    if (pathWithoutLocale.startsWith('/dashboard/notifications')) return t('notifications')
    if (pathWithoutLocale.startsWith('/dashboard/system')) return tSystem('title')
    return 'HPC' + t('title')
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
    </div>
  )
}

// 用户菜单组件
function UserMenu() {
  const { user, logout } = useAuth()
  const t = useT('login')
  const tProfile = useT('profile')
  const tDashboard = useT('dashboard')

  if (!user) {
    return (
      <Link href="/">
        <Button variant="outline" className="text-base py-2 px-4">{t('login')}</Button>
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2 text-base py-2 px-4">
          <User className="h-4 w-4" />
          <span>{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {getUserRoleLabel(user)}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile" className="flex items-center cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>{tProfile('title')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{tDashboard('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, authLoaded, isAuthenticated } = useAuth()
  const { settings } = useSystemSettings()
  const currentLocale = useCurrentLocale()
  const t = useT('common')
  const tDashboard = useT('dashboard')
  
  // 身份验证检查
  useEffect(() => {
    if (authLoaded && !isAuthenticated) {
      router.push(`/${currentLocale}`)
    }
  }, [authLoaded, isAuthenticated, router, currentLocale])
  
  // 在验证完成前显示加载状态
  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }
  
  // 如果未登录，不渲染内容（会被useEffect重定向）
  if (!isAuthenticated) {
    return null
  }
  
  // 获取导航项，根据系统设置过滤
  const navItems = getNavItems(currentLocale, settings?.applicationsCenterEnabled, tDashboard)

  return (
    <>
      <SystemFavicon />
      <NotificationProvider>
        <div className="min-h-screen bg-background flex">
      {/* 左侧导航栏 */}
      <aside className={cn(
        "bg-background border-r border-green-500/10 transition-all duration-300 ease-in-out fixed left-0 top-0 h-screen z-50 shadow-sm",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        {/* 左侧装饰条 */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-green-400/30 to-transparent" />
        
        <div className="flex flex-col h-full">
          {/* 导航栏头部 */}
          <div className="flex items-center justify-between p-4 border-b border-green-500/10 relative">
            {/* 顶部装饰条 */}
            <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent" />
            
            <SystemLogo collapsed={sidebarCollapsed} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ml-auto hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400 transition-all duration-300"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* 主导航菜单 */}
          <nav className="flex-1 p-4 space-y-3 overflow-y-auto nav-scrollbar">
            {navItems.map((item) => {
              // 现在 item.href 包含语言前缀，直接与 pathname 比较

              // 精确匹配或子路径匹配（但要排除概览页面的特殊情况）
              const isActive = (() => {
                // 精确匹配
                if (pathname === item.href) return true

                // 概览页面特殊处理：只在精确匹配时激活
                if (item.href === `/${currentLocale}/dashboard` || item.href === `/${currentLocale}/dashboard/`) {
                  return pathname === `/${currentLocale}/dashboard` || pathname === `/${currentLocale}/dashboard/`
                }

                // 其他页面：当前路径以菜单项路径开头（子路径）
                return pathname.startsWith(item.href + '/')
              })()

              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={isActive}
                  collapsed={sidebarCollapsed}
                  showNotificationBadge={false}
                />
              )
            })}
          </nav>

          {/* 系统管理菜单（仅管理员可见） */}
          <Suspense fallback={<div className="p-4"><Skeleton className="h-10 w-full" /></div>}>
            <SystemMenu collapsed={sidebarCollapsed} />
          </Suspense>
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "ml-16" : "ml-64"
      )}>
        {/* 顶部状态栏 */}
        <header className="border-b border-green-500/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 shadow-sm">
          {/* 顶部装饰条 */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />
          <div className="flex items-center justify-between px-6 py-4">
            {/* 左侧：页面标题和面包屑 */}
            <div className="flex items-center space-x-4">
              <PageTitle />
            </div>

            {/* 右侧：工具栏和用户菜单 */}
            <div className="flex items-center space-x-4">
              {/* 大屏显示入口（仅管理员可见） */}
              <Suspense fallback={<Skeleton className="h-10 w-24" />}>
                <BigScreenButton />
              </Suspense>
              {/* 通知下拉菜单 */}
              <Suspense fallback={<Skeleton className="h-10 w-10" />}>
                <NotificationDropdown />
              </Suspense>
              {/* 语言切换器 */}
              <LanguageSwitcher />
              {/* 主题切换器 */}
              <Suspense fallback={<Skeleton className="h-9 w-9" />}>
                <ThemeToggle />
              </Suspense>
              {/* WebShell 全局入口 */}
              <WebShell />
              {/* 用户菜单 */}
              <Suspense fallback={<Skeleton className="h-10 w-24" />}>
                <UserMenu />
              </Suspense>
            </div>
          </div>
        </header>

        {/* 主要内容区域 */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-6">
            <ErrorBoundary>
              <Suspense fallback={<div>{t('loading')}</div>}>
                {children}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>

        {/* 版权信息页脚 */}
        <CopyrightFooter />
        
        {/* 仪表板品牌信息 */}
        <DashboardBranding position="footer" />
      </div>
    </div>
      </NotificationProvider>
    </>
  )
}