"use client"

import * as React from "react"
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon, PaletteIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme, THEME_CONFIG, type ThemeMode, type ThemeSetting } from "@/contexts/ThemeProvider"
import { cn } from "@/lib/utils"

// 主题选择器组件 - 支持多主题切换和自动模式
export function ThemeToggle() {
  const { theme, currentMode, applyTheme, saveThemePreference } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // 只在客户端挂载后再渲染真实UI，避免SSR/CSR不一致
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = async (mode: ThemeMode, auto = false) => {
    const newTheme: ThemeSetting = { mode, auto }
    applyTheme(mode, auto)
    // 保存用户偏好到服务器（如果已登录），传入新主题确保保存正确的状态
    await saveThemePreference(newTheme)
  }

  const getCurrentIcon = () => {
    if (theme.auto) {
      return <MonitorIcon className="h-4 w-4" />
    }
    
    switch (currentMode) {
      case 'light':
        return <SunIcon className="h-4 w-4" />
      case 'dark':
        return <MoonIcon className="h-4 w-4" />
      default:
        return <PaletteIcon className="h-4 w-4" />
    }
  }

  const getCurrentLabel = () => {
    if (theme.auto) return '自动'
    return THEME_CONFIG[currentMode].name
  }

  if (!mounted) {
    // SSR时不渲染真实UI，避免hydration不一致
    return <div className="w-9 h-9" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative h-9 w-9 rounded-full border border-border/40 bg-background/80 backdrop-blur-sm",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "transition-all duration-200"
          )}
          title={`当前主题: ${getCurrentLabel()}`}
        >
          {getCurrentIcon()}
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-56 p-2 bg-popover/95 backdrop-blur-sm border border-border/50"
      >
        <DropdownMenuLabel className="text-sm font-medium text-muted-foreground px-2 py-1.5">
          选择主题
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* 自动模式 */}
        <DropdownMenuItem
          onClick={() => handleThemeChange('light', true)}
          className={cn(
            "flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-md",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            theme.auto && "bg-accent text-accent-foreground"
          )}
        >
          <div className="flex items-center space-x-3">
            <MonitorIcon className="h-4 w-4" />
            <div>
              <div className="font-medium">自动</div>
              <div className="text-xs text-muted-foreground">跟随系统设置</div>
            </div>
          </div>
          {theme.auto && <CheckIcon className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* 所有主题选项 */}
        {(Object.entries(THEME_CONFIG) as [ThemeMode, typeof THEME_CONFIG[ThemeMode]][]).map(([mode, config]) => (
          <DropdownMenuItem
            key={mode}
            onClick={() => handleThemeChange(mode, false)}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-md",
              "hover:bg-accent hover:text-accent-foreground transition-colors",
              !theme.auto && currentMode === mode && "bg-accent text-accent-foreground"
            )}
          >
            <div className="flex items-center space-x-3">
              {/* 主题色彩预览圆点 */}
              <div 
                className="w-4 h-4 rounded-full ring-1 ring-border/50"
                style={{ backgroundColor: config.color }}
              />
              <div>
                <div className="font-medium">{config.name}</div>
                <div className="text-xs text-muted-foreground">{config.description}</div>
              </div>
            </div>
            {!theme.auto && currentMode === mode && <CheckIcon className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 