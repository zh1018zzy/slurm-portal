'use client'

import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

/**
 * 获取当前URL路径中的语言代码
 * 这个函数从pathname中动态提取语言，避免语言切换后使用旧的locale值
 * @returns 当前路径中的语言代码
 * @example
 * const currentLocale = useCurrentLocale()
 * router.push(`/${currentLocale}/dashboard`)
 */
export function useCurrentLocale(): string {
  const pathname = usePathname();
  const fallbackLocale = useLocale();

  // 从路径中提取语言代码 (格式: /zh/dashboard/... 或 /en/dashboard/...)
  const localeFromPath = pathname.split('/')[1];

  // 验证提取的locale是否有效，如果无效则使用fallback
  return localeFromPath && ['zh', 'en'].includes(localeFromPath)
    ? localeFromPath
    : fallbackLocale;
}
