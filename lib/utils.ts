import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 带认证的 fetch 函数
 * 自动添加 Authorization 头
 */
export async function authFetch(url: string, options: RequestInit = {}) {
  let token: string | null = null
  
  // 检查是否在浏览器环境
  if (typeof window !== 'undefined') {
    // 优先从 localStorage 获取
    token = localStorage.getItem('token')
    
    // 如果 localStorage 中没有，尝试从 sessionStorage 获取
    if (!token) {
      token = sessionStorage.getItem('token')
    }
    
    // 如果都没有，尝试从 URL 参数获取（用于测试）
    if (!token) {
      const urlParams = new URLSearchParams(window.location.search)
      token = urlParams.get('token')
    }
  }
  
  // 检查是否是FormData，如果是则不设置Content-Type（让浏览器自动设置）
  const isFormData = options.body instanceof FormData
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  
  // 只有在非FormData的情况下才设置Content-Type
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    console.log('使用token进行API调用:', url)
  } else {
    console.warn('没有找到token，API调用可能失败:', url)
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  })
  
  // 如果是401错误，清除无效token
  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
  }
  
  return response
}

/**
 * 时区转换工具函数
 */

/**
 * 将UTC时间转换为CST时间（北京时间，UTC+8）
 * @param utcTime UTC时间字符串或Date对象
 * @returns CST时间的Date对象
 */
export function utcToCst(utcTime: string | Date): Date {
  if (typeof utcTime === 'string') {
    // 如果是字符串，先转换为Date对象
    const utcDate = new Date(utcTime)
    if (isNaN(utcDate.getTime())) {
      throw new Error(`无效的时间格式: ${utcTime}`)
    }
    // 转换为CST时间（UTC+8）
    return new Date(utcDate.getTime() + (8 * 60 * 60 * 1000))
  } else {
    // 如果已经是Date对象，直接转换
    return new Date(utcTime.getTime() + (8 * 60 * 60 * 1000))
  }
}

/**
 * 智能时区转换：自动检测并转换时间
 * @param time 时间字符串或Date对象
 * @returns 转换后的CST时间Date对象
 */
export function smartTimeConversion(time: string | Date): Date | null {
  if (!time) return null
  
  try {
    let inputDate: Date
    
    if (typeof time === 'string') {
      inputDate = new Date(time)
      if (isNaN(inputDate.getTime())) {
        console.warn(`无效的时间格式: ${time}`)
        return null
      }
    } else {
      inputDate = time
    }
    
    // 改进的时区检测逻辑
    const now = new Date()
    const timeDiff = inputDate.getTime() - now.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    
    // 更智能的时区判断
    if (hoursDiff > 6) {
      // 时间在未来，可能是UTC时间需要转换
      console.log(`检测到未来时间，可能是UTC: ${time} (差异: +${hoursDiff.toFixed(1)}小时)`)
      return utcToCst(inputDate)
    } else if (hoursDiff < -6) {
      // 时间在过去，可能是UTC时间需要转换
      console.log(`检测到过去时间，可能是UTC: ${time} (差异: ${hoursDiff.toFixed(1)}小时)`)
      return utcToCst(inputDate)
    } else {
      // 时间差异在合理范围内，假设已经是CST时间
      console.log(`时间差异正常，假设是CST: ${time} (差异: ${hoursDiff.toFixed(1)}小时)`)
      return inputDate
    }
  } catch (error) {
    console.error('智能时区转换失败:', error)
    return null
  }
}

/**
 * 更安全的时区转换：基于时间格式判断
 * @param time 时间字符串或Date对象
 * @returns 转换后的CST时间Date对象
 */
export function safeTimeConversion(time: string | Date): Date | null {
  if (!time) return null
  
  try {
    let inputDate: Date
    
    if (typeof time === 'string') {
      inputDate = new Date(time)
      if (isNaN(inputDate.getTime())) {
        console.warn(`无效的时间格式: ${time}`)
        return null
      }
    } else {
      inputDate = time
    }
    
    // 基于时间格式的智能判断
    const timeStr = inputDate.toISOString()
    
    // 检查是否为典型的UTC时间格式（如从Slurm返回的）
    if (timeStr.includes('T') && timeStr.includes('Z')) {
      // 标准UTC格式，转换为CST
      console.log(`检测到标准UTC格式: ${time} -> 转换为CST`)
      return utcToCst(inputDate)
    }
    
    // 检查时间差异，但更保守
    const now = new Date()
    const timeDiff = inputDate.getTime() - now.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    
    // 非常保守的判断：只有明显是UTC时间才转换
    if (Math.abs(hoursDiff) > 20) {
      // 差异超过20小时，很可能是UTC时间
      console.log(`检测到明显UTC时间: ${time} (差异: ${hoursDiff.toFixed(1)}小时) -> 转换为CST`)
      return utcToCst(inputDate)
    } else {
      // 差异在合理范围内，保持原样
      console.log(`时间差异合理，保持原样: ${time} (差异: ${hoursDiff.toFixed(1)}小时)`)
      return inputDate
    }
  } catch (error) {
    console.error('安全时区转换失败:', error)
    return null
  }
}

/**
 * 将CST时间转换为UTC时间
 * @param cstTime CST时间字符串或Date对象
 * @returns UTC时间的Date对象
 */
export function cstToUtc(cstTime: string | Date): Date {
  if (typeof cstTime === 'string') {
    const cstDate = new Date(cstTime)
    if (isNaN(cstDate.getTime())) {
      throw new Error(`无效的时间格式: ${cstTime}`)
    }
    // 转换为UTC时间（CST-8）
    return new Date(cstDate.getTime() - (8 * 60 * 60 * 1000))
  } else {
    return new Date(cstTime.getTime() - (8 * 60 * 60 * 1000))
  }
}

/**
 * 标准化时间字符串，确保时区一致性
 * @param time 时间字符串或Date对象
 * @param targetTimezone 目标时区 ('CST' | 'UTC')
 * @returns 标准化后的时间字符串
 */
export function normalizeTime(time: string | Date | null | undefined, targetTimezone: 'CST' | 'UTC' = 'CST'): string | null {
  if (!time) return null
  
  try {
    let date: Date
    
    if (typeof time === 'string') {
      date = new Date(time)
      if (isNaN(date.getTime())) {
        console.warn(`无效的时间格式: ${time}`)
        return null
      }
    } else {
      date = time
    }
    
    // 根据目标时区转换
    if (targetTimezone === 'CST') {
      // 假设输入是UTC时间，转换为CST
      const cstDate = utcToCst(date)
      return cstDate.toISOString()
    } else {
      // 假设输入是CST时间，转换为UTC
      const utcDate = cstToUtc(date)
      return utcDate.toISOString()
    }
  } catch (error) {
    console.error('时间标准化失败:', error)
    return null
  }
}

/**
 * 检查时间是否为UTC时间（通过比较与当前时间的差异）
 * @param time 时间字符串或Date对象
 * @returns 是否为UTC时间
 */
export function isUtcTime(time: string | Date): boolean {
  try {
    const inputDate = typeof time === 'string' ? new Date(time) : time
    if (isNaN(inputDate.getTime())) return false
    
    const now = new Date()
    const timeDiff = Math.abs(inputDate.getTime() - now.getTime())
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    
    // 如果时间差异超过6小时，可能是时区问题
    // UTC时间与CST时间差异8小时
    return hoursDiff > 6
  } catch (error) {
    return false
  }
}
