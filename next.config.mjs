import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 性能优化
  compress: true,
  poweredByHeader: false,
  
  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天
    // 允许未优化的图片（用于系统 logo 等需要实时更新的图片）
    unoptimized: false,
    // 允许本地图片路径
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // 实验性功能
  experimental: {
    // optimizeCss: true, // 暂时禁用，避免critters问题
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    // 优化客户端路由
    optimizeServerReact: true,
    // 禁用 instrumentation hook 避免构建时连接LDAP
    instrumentationHook: false,
  },

  // 输出配置 - 使用standalone模式用于生产部署
  output: 'standalone',

  // 跳过构建时的静态优化，避免API routes在构建时执行
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // 重定向和重写
  async redirects() {
    return [
      // 注释掉dashboard重定向，让概览页面正常工作
      // {
      //   source: '/dashboard',
      //   destination: '/dashboard/jobs',
      //   permanent: false,
      // },
    ]
  },

  // 错误页面配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // 禁用 /uploads/ 目录的缓存，以支持实时更新系统 logo
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
  
  // Webpack配置
  webpack: (config, { dev, isServer }) => {
    // 生产环境优化
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      }
    }

    // 添加错误处理
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }

    return config
  },

  // 客户端路由优化
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
};

export default withNextIntl(nextConfig);
