/**
 * 文件列表缓存管理器
 * 用于在文件操作后清除缓存，确保文件列表立即更新
 */

// 简单的内存缓存
const fileListCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 30 * 1000 // 30秒缓存

/**
 * 获取缓存键
 */
function getCacheKey(dirPath: string, username?: string, options?: { showHidden?: boolean; filter?: string }): string {
  return `${dirPath}-${username}-${options?.showHidden}-${options?.filter}`
}

/**
 * 获取缓存
 */
export function getCache(dirPath: string, username?: string, options?: { showHidden?: boolean; filter?: string }): any | null {
  const cacheKey = getCacheKey(dirPath, username, options)
  const cached = fileListCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  return null
}

/**
 * 设置缓存
 */
export function setCache(dirPath: string, data: any, username?: string, options?: { showHidden?: boolean; filter?: string }): void {
  const cacheKey = getCacheKey(dirPath, username, options)
  fileListCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  })
}

/**
 * 清除指定路径的缓存
 * @param dirPath 目录路径
 * @param username 用户名（可选）
 */
export function clearCacheForPath(dirPath: string, username?: string): void {
  // 清除所有与该路径相关的缓存键
  const keysToDelete: string[] = []
  for (const key of fileListCache.keys()) {
    if (username) {
      // 如果指定了用户名，只清除该用户的缓存
      if (key.startsWith(`${dirPath}-${username}-`)) {
        keysToDelete.push(key)
      }
    } else {
      // 如果没有指定用户名，清除所有该路径的缓存
      if (key.startsWith(`${dirPath}-`)) {
        keysToDelete.push(key)
      }
    }
  }
  
  keysToDelete.forEach(key => fileListCache.delete(key))
  
  if (keysToDelete.length > 0) {
    console.log(`[FileCache] 清除缓存: ${keysToDelete.length} 个缓存项，路径: ${dirPath}${username ? `，用户: ${username}` : ''}`)
  }
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  const count = fileListCache.size
  fileListCache.clear()
  console.log(`[FileCache] 清除所有缓存: ${count} 个缓存项`)
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): { size: number; duration: number } {
  return {
    size: fileListCache.size,
    duration: CACHE_DURATION
  }
}

