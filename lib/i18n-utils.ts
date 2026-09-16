import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

/**
 * 客户端组件中使用翻译的 Hook
 * @example
 * const t = useT('common');
 * <button>{t('submit')}</button>
 */
export function useT(namespace: string) {
  return useTranslations(namespace);
}

/**
 * 服务端组件中使用翻译的函数
 * @example
 * const t = await getT('common');
 * <button>{t('submit')}</button>
 */
export async function getT(namespace: string) {
  return await getTranslations(namespace);
}

/**
 * 格式化日期时间
 * @param date 日期对象或字符串
 * @param locale 语言代码
 * @param options 格式化选项
 */
export function formatDateTime(
  date: Date | string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', defaultOptions).format(
    dateObj
  );
}

/**
 * 格式化数字
 * @param number 数字
 * @param locale 语言代码
 * @param options 格式化选项
 */
export function formatNumber(
  number: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', options).format(number);
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param locale 语言代码
 */
export function formatFileSize(bytes: number, locale: string): string {
  const units = locale === 'zh' ? ['字节', 'KB', 'MB', 'GB', 'TB'] : ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return `0 ${units[0]}`;
  
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * 智能翻译函数 - 自动检测是翻译键还是普通文本
 * 如果文本以 "hpcApps." 或其他已知前缀开头,则作为翻译键处理
 * 否则直接返回原文本(向后兼容)
 */
export function useSmartTranslate(namespace?: string) {
  const t = useTranslations(namespace)

  return (textOrKey: string | undefined, fallback: string = ''): string => {
    if (!textOrKey) return fallback

    // 检查是否是翻译键格式
    const isTranslationKey = (
      textOrKey.startsWith('hpcApps.') ||
      textOrKey.startsWith('common.') ||
      textOrKey.startsWith('dashboard.') ||
      textOrKey.includes('.') // 简单检测,包含点号很可能是翻译键
    )

    if (isTranslationKey) {
      try {
        // 尝试翻译
        const translated = t(textOrKey as any)
        // 如果翻译结果等于键本身,说明没找到翻译,返回fallback或原文
        return translated === textOrKey ? (fallback || textOrKey) : translated
      } catch (e) {
        // 翻译失败,返回fallback或原文
        return fallback || textOrKey
      }
    }

    // 不是翻译键,直接返回原文(向后兼容旧的硬编码文本)
    return textOrKey
  }
}

/**
 * 从字段定义中获取显示文本
 * 优先使用 xxxKey,如果没有则使用 xxx (向后兼容)
 */
export function getFieldText(
  field: any,
  textType: 'label' | 'description' | 'placeholder',
  t: (key: string) => string
): string | undefined {
  const keyField = `${textType}Key` as keyof typeof field
  const valueField = textType as keyof typeof field

  // 优先使用翻译键
  if (field[keyField]) {
    const translationKey = field[keyField] as string
    try {
      const translated = t(translationKey)
      // 如果翻译成功且不是返回键本身，使用翻译结果
      if (translated && translated !== translationKey) {
        return translated
      }
    } catch (e) {
      // 翻译失败，继续尝试硬编码文本
    }
  }

  // 向后兼容:使用硬编码文本
  return field[valueField] as string | undefined
}

/**
 * 从选项中获取显示文本
 */
export function getOptionText(
  option: any,
  textType: 'label' | 'description',
  t: (key: string) => string
): string | undefined {
  const keyField = `${textType}Key` as keyof typeof option
  const valueField = textType as keyof typeof option

  // 优先使用翻译键
  if (option[keyField]) {
    const translationKey = option[keyField] as string
    try {
      const translated = t(translationKey)
      // 如果翻译成功且不是返回键本身，使用翻译结果
      if (translated && translated !== translationKey) {
        return translated
      }
    } catch (e) {
      // 翻译失败，继续尝试硬编码文本
    }
  }

  // 向后兼容:使用硬编码文本
  return option[valueField] as string | undefined
}

