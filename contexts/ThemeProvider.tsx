"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// 主题类型定义
export type ThemeMode = 'light' | 'dark' | 'high-contrast'

export type ThemeSetting = {
  mode: ThemeMode
  auto: boolean // 是否跟随系统
}

// 经典主题配置
export const THEME_CONFIG = {
  light: { 
    name: 'Light', 
    className: '', 
    description: '经典亮色主题，清晰简洁',
    color: '#0066cc'
  },
  dark: { 
    name: 'Dark', 
    className: 'dark', 
    description: '经典暗色主题，护眼舒适',
    color: '#4fc3f7'
  },
  'high-contrast': { 
    name: 'High Contrast', 
    className: 'theme-high-contrast', 
    description: '高对比度主题，极佳可读性',
    color: '#ffff00'
  }
} as const

interface ThemeContextType {
  theme: ThemeSetting
  setTheme: (theme: ThemeSetting) => void
  currentMode: ThemeMode
  applyTheme: (mode: ThemeMode, auto?: boolean) => void
  saveThemePreference: (themeToSave?: ThemeSetting) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: ThemeSetting
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeSetting>(
    defaultTheme || { mode: 'light', auto: false }
  )
  const [mounted, setMounted] = useState(false)
  const [systemPrefersDark, setSystemPrefersDark] = useState(false)

  // 计算当前实际应用的主题模式
  const currentMode: ThemeMode = theme.auto 
    ? (systemPrefersDark ? 'dark' : 'light')
    : theme.mode

  // 检测系统主题偏好
  useEffect(() => {
    // 确保在客户端环境下执行
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemPrefersDark(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // 从localStorage和服务器加载主题设置
  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        // 确保在客户端环境下执行
        if (typeof window === 'undefined') {
          setThemeState(defaultTheme || { mode: 'light', auto: false })
          setMounted(true)
          return
        }

        // 首先从localStorage加载（快速显示）
        const stored = localStorage.getItem('theme-setting')
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as ThemeSetting
            // 验证解析的主题设置是否有效
            if (parsed && 
                typeof parsed.mode === 'string' && 
                ['light', 'dark', 'high-contrast'].includes(parsed.mode) &&
                typeof parsed.auto === 'boolean') {
              setThemeState(parsed)
            } else {
              // 如果localStorage中的数据无效，清除它并使用默认主题
              localStorage.removeItem('theme-setting')
              setThemeState(defaultTheme || { mode: 'light', auto: false })
            }
          } catch (parseError) {
            // 如果JSON解析失败，清除localStorage并使用默认主题
            localStorage.removeItem('theme-setting')
            setThemeState(defaultTheme || { mode: 'light', auto: false })
          }
        } else {
          // 如果localStorage中没有主题设置，使用默认主题
          setThemeState(defaultTheme || { mode: 'light', auto: false })
        }

        // 如果用户已登录，从服务器加载偏好设置
        const token = localStorage.getItem('token')
        if (token) {
          try {
            console.log('[ThemeProvider] Loading theme from server...')
            const response = await fetch('/api/users/theme', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            if (response.ok) {
              const data = await response.json()
              console.log('[ThemeProvider] Server response:', data)
              if (data.theme_preference) {
                try {
                  // 处理服务器返回的主题偏好，可能是字符串或对象
                  let serverTheme: ThemeSetting
                  if (typeof data.theme_preference === 'string') {
                    serverTheme = JSON.parse(data.theme_preference) as ThemeSetting
                  } else if (typeof data.theme_preference === 'object') {
                    serverTheme = data.theme_preference as ThemeSetting
                  } else {
                    throw new Error('Invalid theme preference format')
                  }
                  
                  console.log('[ThemeProvider] Parsed server theme:', serverTheme)
                  
                  // 验证服务器返回的主题设置是否有效
                  if (serverTheme && 
                      typeof serverTheme.mode === 'string' && 
                      ['light', 'dark', 'high-contrast'].includes(serverTheme.mode) &&
                      typeof serverTheme.auto === 'boolean') {
                    console.log('[ThemeProvider] Applying server theme:', serverTheme)
                    setThemeState(serverTheme)
                    // 同步到localStorage
                    localStorage.setItem('theme-setting', JSON.stringify(serverTheme))
                  }
                } catch (parseError) {
                  console.warn('[ThemeProvider] Invalid theme preference from server:', parseError)
                }
              }
            } else {
              console.warn('[ThemeProvider] Failed to load theme from server:', response.status)
            }
          } catch (serverError) {
            console.warn('[ThemeProvider] Failed to load theme from server:', serverError)
          }
        }
      } catch (error) {
        console.warn('Failed to load theme settings:', error)
        // 发生任何错误时，使用默认主题
        setThemeState(defaultTheme || { mode: 'light', auto: false })
      } finally {
        setMounted(true)
      }
    }

    loadThemeSettings()
  }, [defaultTheme])

  // 应用主题到DOM
  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return

    const root = document.documentElement
    
    // 清除所有主题类
    Object.values(THEME_CONFIG).forEach(config => {
      if (config.className) {
        root.classList.remove(config.className)
      }
    })

    // 应用当前主题类
    const themeClass = THEME_CONFIG[currentMode].className
    if (themeClass) {
      root.classList.add(themeClass)
    }
  }, [currentMode, mounted])

  // 设置主题
  const setTheme = (newTheme: ThemeSetting) => {
    setThemeState(newTheme)
    
    // 保存到localStorage (仅在客户端)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('theme-setting', JSON.stringify(newTheme))
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error)
      }
    }
  }

  // 快速应用主题模式
  const applyTheme = (mode: ThemeMode, auto = false) => {
    const newTheme: ThemeSetting = { mode, auto }
    setTheme(newTheme)
  }

  // 保存主题偏好到服务器（用户登录后）
  const saveThemePreference = async (themeToSave?: ThemeSetting) => {
    try {
      // 确保在客户端环境下执行
      if (typeof window === 'undefined') {
        console.log('[ThemeProvider] SSR environment, skipping server save')
        return
      }

      const token = localStorage.getItem('token')
      if (!token) {
        console.log('[ThemeProvider] No token found, skipping server save')
        return
      }

      // 使用传入的主题或当前主题
      const themeData = themeToSave || theme
      console.log('[ThemeProvider] Saving theme to server:', themeData)
      
      const response = await fetch('/api/users/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme_preference: JSON.stringify(themeData) })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('[ThemeProvider] Server save failed:', response.status, errorData)
        throw new Error('Failed to save theme preference')
      }
      
      console.log('[ThemeProvider] Theme saved successfully to server')
    } catch (error) {
      console.warn('[ThemeProvider] Failed to save theme preference to server:', error)
    }
  }

  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    currentMode,
    applyTheme,
    saveThemePreference
  }

  // SSR时返回默认主题，避免hydration不匹配
  if (!mounted) {
    return (
      <ThemeContext.Provider value={contextValue}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// Hook用于获取主题配置信息
export function useThemeConfig() {
  const { currentMode } = useTheme()
  return THEME_CONFIG[currentMode]
}

// Hook用于检查是否为暗色主题
export function useIsDarkTheme() {
  const { currentMode } = useTheme()
  return currentMode === 'dark' || currentMode === 'high-contrast'
}