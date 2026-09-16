'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import WebShellTerminal from '@/components/WebShellTerminal'
import { safeSetElementStyle, safeDelayedOperation } from '@/lib/dom-utils'
import { useT } from '@/lib/i18n-utils'
import { useCurrentLocale } from '@/lib/i18n-client-utils'
import { useLocale } from 'next-intl'

export default function WebShellPage() {
  const { user, token, authLoaded } = useAuth()
  const router = useRouter()
  const currentLocale = useCurrentLocale()
  const t = useT('webshell')
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      if (!authLoaded) {
        return
      }

      if (!user || !token) {
        router.push(`/${currentLocale}`)
        return
      }

      try {
        const response = await fetch('/api/webshell/check-access', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          setHasAccess(true)
        } else {
          router.push(`/${currentLocale}/dashboard`)
        }
      } catch (error) {
        console.error(t('checkAccessFailed'), error)
        router.push(`/${currentLocale}/dashboard`)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [user, token, authLoaded, router, currentLocale, t])

  // 在客户端渲染时隐藏导航栏
  useEffect(() => {
    // 隐藏所有可能的导航栏元素
    const hideElements = () => {
      const elementsToHide = [
        'header',
        'nav',
        '[role="navigation"]',
        '.navbar',
        '.header',
        '.navigation'
      ]
      
      elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach(el => {
          if (el instanceof HTMLElement) {
            safeSetElementStyle(el, { display: 'none' })
          }
        })
      })
      
      // 隐藏 body 的默认样式
      safeSetElementStyle(document.body, {
        margin: '0',
        padding: '0',
        overflow: 'hidden',
        height: '100vh',
        width: '100vw'
      })
      
      // 隐藏 html 的默认样式
      safeSetElementStyle(document.documentElement, {
        overflow: 'hidden',
        height: '100vh',
        width: '100vw'
      })
    }
    
    hideElements()
    
    // 清理函数
    return () => {
      // 延迟恢复元素显示，避免路由切换冲突
      safeDelayedOperation(() => {
        const elementsToShow = [
          'header',
          'nav',
          '[role="navigation"]',
          '.navbar',
          '.header',
          '.navigation'
        ]
        
        elementsToShow.forEach(selector => {
          const elements = document.querySelectorAll(selector)
          elements.forEach(el => {
            if (el instanceof HTMLElement) {
              safeSetElementStyle(el, { display: '' })
            }
          })
        })
        
        // 恢复 body 样式
        safeSetElementStyle(document.body, {
          margin: '',
          padding: '',
          overflow: '',
          height: '',
          width: ''
        })
        
        // 恢复 html 样式
        safeSetElementStyle(document.documentElement, {
          overflow: '',
          height: '',
          width: ''
        })
      }, 150)
    }
  }, [])

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">{t('checkingPermission')}</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-gray-300">{t('insufficientPermission')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-black fixed inset-0 z-50 overflow-hidden" style={{ 
      height: '100vh', 
      width: '100vw',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <style jsx global>{`
        .xterm {
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          height: 100% !important;
          max-height: 100% !important;
          overflow: hidden !important;
        }
        .xterm-viewport {
          overflow-y: auto !important;
          max-height: 100% !important;
        }
        .xterm-screen {
          position: relative !important;
          height: 100% !important;
          max-height: 100% !important;
        }
        .xterm-cursor {
          position: relative !important;
        }
      `}</style>
      <WebShellTerminal />
    </div>
  )
} 