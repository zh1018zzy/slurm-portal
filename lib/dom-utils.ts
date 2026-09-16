/**
 * 安全的DOM操作工具函数
 */

/**
 * 安全地移除DOM元素
 */
export function safeRemoveChild(parent: Node, child: Node): boolean {
  try {
    if (parent && child && parent.contains(child)) {
      parent.removeChild(child)
      return true
    }
    return false
  } catch (error) {
    console.warn('安全移除DOM元素失败:', error)
    return false
  }
}

/**
 * 安全地添加DOM元素
 */
export function safeAppendChild(parent: Node, child: Node): boolean {
  try {
    if (parent && child) {
      parent.appendChild(child)
      return true
    }
    return false
  } catch (error) {
    console.warn('安全添加DOM元素失败:', error)
    return false
  }
}

/**
 * 安全地创建和操作临时元素
 */
export function createTemporaryElement<T extends HTMLElement>(
  tagName: string,
  operations: (element: T) => void
): boolean {
  try {
    const element = document.createElement(tagName) as T
    operations(element)
    
    // 安全地添加到body
    if (safeAppendChild(document.body, element)) {
      // 安全地移除
      setTimeout(() => {
        safeRemoveChild(document.body, element)
      }, 100)
      return true
    }
    return false
  } catch (error) {
    console.warn('创建临时元素失败:', error)
    return false
  }
}

/**
 * 安全地移除所有匹配的DOM元素
 */
export function safeRemoveAllElements(selector: string): boolean {
  try {
    if (typeof document === 'undefined') {
      return false
    }
    
    const elements = document.querySelectorAll(selector)
    let success = true
    
    elements.forEach(element => {
      if (element.parentNode && element.parentNode.contains(element)) {
        try {
          element.parentNode.removeChild(element)
        } catch (error) {
          console.warn(`移除元素失败: ${selector}`, error)
          success = false
        }
      }
    })
    
    return success
  } catch (error) {
    console.warn('安全移除所有元素失败:', error)
    return false
  }
}

/**
 * 安全地设置元素样式
 */
export function safeSetElementStyle(element: HTMLElement, styles: Record<string, string>): boolean {
  try {
    if (!element) {
      return false
    }
    
    Object.entries(styles).forEach(([property, value]) => {
      element.style.setProperty(property, value)
    })
    
    return true
  } catch (error) {
    console.warn('设置元素样式失败:', error)
    return false
  }
}

/**
 * 安全地添加事件监听器
 */
export function safeAddEventListener(
  element: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): boolean {
  try {
    if (!element) {
      return false
    }
    
    element.addEventListener(event, handler, options)
    return true
  } catch (error) {
    console.warn('添加事件监听器失败:', error)
    return false
  }
}

/**
 * 安全地移除事件监听器
 */
export function safeRemoveEventListener(
  element: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | EventListenerOptions
): boolean {
  try {
    if (!element) {
      return false
    }
    
    element.removeEventListener(event, handler, options)
    return true
  } catch (error) {
    console.warn('移除事件监听器失败:', error)
    return false
  }
}

/**
 * 延迟执行DOM操作，避免路由切换冲突
 */
export function safeDelayedOperation(operation: () => void, delay: number = 100): void {
  setTimeout(() => {
    try {
      operation()
    } catch (error) {
      console.warn('延迟DOM操作失败:', error)
    }
  }, delay)
}

/**
 * 安全地下载文件
 */
export function safeDownloadFile(url: string, filename: string): boolean {
  return createTemporaryElement<HTMLAnchorElement>('a', (link) => {
    link.href = url
    link.download = filename
    link.click()
  })
}

/**
 * 安全地复制到剪贴板
 */
export function safeCopyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => resolve(true))
        .catch(() => {
          // 回退到传统方法
          resolve(createTemporaryElement<HTMLTextAreaElement>('textarea', (textArea) => {
            textArea.value = text
            textArea.style.position = 'fixed'
            textArea.style.left = '-999999px'
            textArea.style.top = '-999999px'
            textArea.focus()
            textArea.select()
            document.execCommand('copy')
          }))
        })
    } else {
      // 传统方法
      resolve(createTemporaryElement<HTMLTextAreaElement>('textarea', (textArea) => {
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
      }))
    }
  })
} 