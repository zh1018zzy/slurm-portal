'use client'

import { useEffect, useState, useRef } from 'react'
import { safeDelayedOperation } from '@/lib/dom-utils'

interface DynamicFaviconProps {
  logoUrl?: string
}

export default function DynamicFavicon({ logoUrl }: DynamicFaviconProps) {
  const [isClient, setIsClient] = useState(false)
  const currentFaviconRef = useRef<string>('')
  const faviconRefs = useRef<{
    faviconLink: HTMLLinkElement | null
    shortcutLink: HTMLLinkElement | null
    appleLink: HTMLLinkElement | null
  }>({
    faviconLink: null,
    shortcutLink: null,
    appleLink: null
  })

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !logoUrl || logoUrl === '/logo.png') {
      return
    }

    // 如果favicon没有变化，不执行操作
    if (currentFaviconRef.current === logoUrl) {
      return
    }

    // 确保在客户端环境下执行DOM操作
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    console.log('🔄 更新favicon:', logoUrl)

    // 创建新的favicon链接
    const createFaviconLink = (rel: string, href: string, type?: string) => {
      const link = document.createElement('link')
      link.rel = rel
      link.href = href
      if (type) {
        link.type = type
      }
      // 添加标识，便于清理
      link.setAttribute('data-dynamic-favicon', 'true')
      return link
    }

    // 安全地移除现有的favicon链接
    const safeRemoveExistingLinks = () => {
      try {
        const existingLinks = document.querySelectorAll('link[data-dynamic-favicon="true"]')
        existingLinks.forEach(link => {
          if (link.parentNode && link.parentNode.contains(link)) {
            link.parentNode.removeChild(link)
          }
        })
      } catch (error) {
        console.warn('移除现有favicon链接失败:', error)
      }
    }

    // 安全地移除单个链接
    const safeRemoveLink = (link: HTMLLinkElement | null) => {
      if (link && link.parentNode && link.parentNode.contains(link)) {
        try {
          link.parentNode.removeChild(link)
        } catch (error) {
          console.warn('移除favicon链接失败:', error)
        }
      }
    }

    // 根据文件扩展名确定MIME类型
    const getMimeType = (url: string) => {
      const ext = url.split('.').pop()?.toLowerCase()
      switch (ext) {
        case 'png':
          return 'image/png'
        case 'jpg':
        case 'jpeg':
          return 'image/jpeg'
        case 'svg':
          return 'image/svg+xml'
        case 'ico':
          return 'image/x-icon'
        default:
          return 'image/png'
      }
    }

    const mimeType = getMimeType(logoUrl)

    // 延迟执行DOM操作，避免路由切换冲突
    safeDelayedOperation(() => {
      try {
        // 清理之前的链接
        safeRemoveLink(faviconRefs.current.faviconLink)
        safeRemoveLink(faviconRefs.current.shortcutLink)
        safeRemoveLink(faviconRefs.current.appleLink)

        // 移除所有现有的动态favicon链接
        safeRemoveExistingLinks()

        // 添加新的favicon链接
        const faviconLink = createFaviconLink('icon', logoUrl, mimeType)
        const shortcutLink = createFaviconLink('shortcut icon', logoUrl, mimeType)
        const appleLink = createFaviconLink('apple-touch-icon', logoUrl, mimeType)

        if (document.head) {
          document.head.appendChild(faviconLink)
          document.head.appendChild(shortcutLink)
          document.head.appendChild(appleLink)
          
          // 保存引用
          faviconRefs.current = {
            faviconLink,
            shortcutLink,
            appleLink
          }
          
          // 更新引用
          currentFaviconRef.current = logoUrl
          
          console.log('✅ favicon更新成功')
        }
      } catch (error) {
        console.error('❌ favicon更新失败:', error)
      }
    }, 200)

    // 清理函数
    return () => {
      // 延迟清理，避免路由切换时的冲突
      safeDelayedOperation(() => {
        safeRemoveLink(faviconRefs.current.faviconLink)
        safeRemoveLink(faviconRefs.current.shortcutLink)
        safeRemoveLink(faviconRefs.current.appleLink)
        
        // 重置引用
        faviconRefs.current = {
          faviconLink: null,
          shortcutLink: null,
          appleLink: null
        }
        
        // 重置引用
        currentFaviconRef.current = ''
      }, 300)
    }
  }, [logoUrl, isClient])

  return null
} 