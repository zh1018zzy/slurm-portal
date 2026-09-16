import type { Metadata } from "next";
import "../globals.css";
import { generateMetadata as generateSystemMetadata } from "@/lib/metadata";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";
import { ClientErrorHandler } from "@/components/ClientErrorHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteProtection } from "@/components/RouteProtection";
import { globalRequestManager } from '@/lib/global-request-manager'
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';

// 使用本地字体，避免网络依赖
const fontClass = "font-sans";

// 禁用metadata缓存，确保系统设置更新后能立即反映到页面head
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return await generateSystemMetadata();
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // 等待 params Promise 解析
  const { locale } = await params;

  // 验证 locale 参数
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // 获取翻译消息
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={fontClass} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ErrorBoundary>
            <ClientErrorHandler>
              <RouteProtection>
                <GlobalErrorHandler />
                <ThemeProvider defaultTheme={{ mode: 'light', auto: false }}>
                  {children}
                  <Toaster />
                </ThemeProvider>
              </RouteProtection>
            </ClientErrorHandler>
          </ErrorBoundary>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
