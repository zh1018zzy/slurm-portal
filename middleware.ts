import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n'

// 创建国际化中间件
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // 总是在URL中显示语言前缀
})

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 跳过 API 路由、静态文件等，这些不需要国际化
  const shouldSkipI18n =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/);

  if (shouldSkipI18n) {
    // 对于 /uploads/ 目录下的文件，禁用缓存以支持实时更新
    if (pathname.startsWith('/uploads/')) {
      const response = NextResponse.next()
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      return response
    }

    return NextResponse.next()
  }

  // 对于需要国际化的路径，应用国际化中间件
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
