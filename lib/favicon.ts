import { SystemSettings } from './metadata'

/**
 * 获取favicon配置
 * 根据系统设置的Logo生成合适的favicon配置
 */
export function getFaviconConfig(settings: SystemSettings) {
  const logoUrl = settings.logoUrl
  
  // 如果没有自定义Logo或使用默认Logo，使用默认favicon
  if (!logoUrl || logoUrl === '/logo.png') {
    return {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
      apple: '/favicon.ico',
    }
  }

  // 如果有自定义Logo，使用它作为favicon
  return {
    icon: logoUrl,
    shortcut: logoUrl,
    apple: logoUrl,
  }
}

/**
 * 生成favicon的HTML标签
 * 用于在页面中动态插入favicon标签
 */
export function generateFaviconTags(settings: SystemSettings): string {
  const logoUrl = settings.logoUrl
  
  if (!logoUrl || logoUrl === '/logo.png') {
    return `
      <link rel="icon" type="image/x-icon" href="/favicon.ico">
      <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico">
      <link rel="apple-touch-icon" href="/favicon.ico">
    `
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
  
  return `
    <link rel="icon" type="${mimeType}" href="${logoUrl}">
    <link rel="shortcut icon" type="${mimeType}" href="${logoUrl}">
    <link rel="apple-touch-icon" href="${logoUrl}">
  `
}

/**
 * 检查Logo是否适合作为favicon
 * favicon通常需要是正方形且尺寸适中
 */
export function isLogoFaviconCompatible(logoUrl: string): boolean {
  if (!logoUrl || logoUrl === '/logo.png') {
    return false
  }
  
  // 检查文件扩展名
  const ext = logoUrl.split('.').pop()?.toLowerCase()
  const supportedFormats = ['png', 'jpg', 'jpeg', 'svg', 'ico']
  
  return supportedFormats.includes(ext || '')
} 