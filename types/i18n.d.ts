import 'next-intl';

// 扩展 next-intl 类型以支持我们的翻译结构
type Messages = typeof import('../messages/zh.json');

declare global {
  interface IntlMessages extends Messages {}
}

