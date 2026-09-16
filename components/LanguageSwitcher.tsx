'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

// 语言显示名称映射
const languageNames: Record<string, { native: string; english: string }> = {
  zh: { native: '中文', english: 'Chinese' },
  en: { native: 'English', english: 'English' },
};

/**
 * 语言切换器组件
 * 用于在支持的语言之间切换
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  // 切换语言函数
  const switchLanguage = (newLocale: string) => {
    // 获取当前路径，去除语言前缀
    const currentPath = pathname.replace(/^\/[a-z]{2}/, '');
    // 构建新的路径
    const newPath = `/${newLocale}${currentPath}`;
    router.push(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Globe className="h-5 w-5" />
          <span className="sr-only">切换语言 / Switch Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLanguage(loc)}
            className={`cursor-pointer ${
              locale === loc ? 'bg-accent font-medium' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              {languageNames[loc]?.native}
              {locale === loc && (
                <span className="text-xs text-muted-foreground">✓</span>
              )}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

