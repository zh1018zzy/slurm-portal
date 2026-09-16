import fs from 'fs/promises'
import path from 'path'
import { Metadata } from 'next'
import { getFaviconConfig } from './favicon'

const CONFIG_PATH = path.resolve(process.cwd(), 'config/system-settings.json')

export interface SystemSettings {
  platformName?: string;
  logoUrl?: string;
  watermarkText?: string;
  watermarkEnabled?: boolean;
  webshellCopyPasteEnabled?: boolean;
  websiteTitle?: string;
  websiteDescription?: string;
  applicationsCenterEnabled?: boolean;
  userHomeDirectoryPrefix?: string;
  copyright?: {
    companyName?: string;
    companyUrl?: string;
    copyrightText?: string;
    poweredBy?: string;
    showPoweredBy?: boolean;
  };
  channel?: {
    enabled?: boolean;
    channelName?: string;
    channelLogo?: string;
    channelUrl?: string;
    channelCopyright?: string;
  };
  client?: {
    enabled?: boolean;
    clientName?: string;
    clientLogo?: string;
    clientUrl?: string;
    clientCopyright?: string;
  };
  branding?: {
    showFooter?: boolean;
    footerText?: string;
    showLoginBranding?: boolean;
    showDashboardBranding?: boolean;
  };
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const configPath = path.join(process.cwd(), 'config', 'system-settings.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    // 如果配置文件不存在或读取失败，返回默认配置
    return {
      platformName: 'HPC平台',
      websiteTitle: '高性能计算管理平台',
      websiteDescription: '基于Next.js开发的高性能计算环境管理与监控平台',
      copyright: {
        companyName: '您的公司名称',
        companyUrl: 'https://yourcompany.com',
        copyrightText: '© 2024 您的公司名称. 保留所有权利.',
        poweredBy: 'Powered by HPC Platform',
        showPoweredBy: true
      },
      channel: {
        enabled: false,
        channelName: '',
        channelLogo: '',
        channelUrl: '',
        channelCopyright: ''
      },
      client: {
        enabled: false,
        clientName: '',
        clientLogo: '',
        clientUrl: '',
        clientCopyright: ''
      },
      branding: {
        showFooter: true,
        footerText: '',
        showLoginBranding: true,
        showDashboardBranding: true
      }
    }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSystemSettings()
  
  // 确定版权信息
  const getCopyrightInfo = () => {
    if (settings.client?.enabled && settings.client.clientCopyright) {
      return settings.client.clientCopyright;
    }
    if (settings.channel?.enabled && settings.channel.channelCopyright) {
      return settings.channel.channelCopyright;
    }
    return settings.copyright?.copyrightText || '© 2024 HPC Platform. 保留所有权利.';
  };

  // 确定公司名称
  const getCompanyName = () => {
    if (settings.client?.enabled && settings.client.clientName) {
      return settings.client.clientName;
    }
    if (settings.channel?.enabled && settings.channel.channelName) {
      return settings.channel.channelName;
    }
    return settings.copyright?.companyName || 'HPC Platform';
  };
  
  return {
    title: settings.websiteTitle || settings.platformName || '高性能计算管理平台',
    description: settings.websiteDescription || '基于Next.js开发的高性能计算环境管理与监控平台',
    keywords: ['HPC', '高性能计算', '集群管理', '作业调度', '文件管理'],
    authors: [{ name: getCompanyName() }],
    creator: getCompanyName(),
    publisher: getCompanyName(),
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
    icons: getFaviconConfig(settings),
    openGraph: {
      title: settings.websiteTitle || settings.platformName || '高性能计算管理平台',
      description: settings.websiteDescription || '基于Next.js开发的高性能计算环境管理与监控平台',
      type: 'website',
      locale: 'zh_CN',
      siteName: settings.platformName || 'HPC平台',
      images: settings.logoUrl && settings.logoUrl !== '/logo.png' ? [{
        url: settings.logoUrl,
        width: 1200,
        height: 630,
        alt: settings.platformName || 'HPC平台',
      }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.websiteTitle || settings.platformName || '高性能计算管理平台',
      description: settings.websiteDescription || '基于Next.js开发的高性能计算环境管理与监控平台',
      images: settings.logoUrl && settings.logoUrl !== '/logo.png' ? [{
        url: settings.logoUrl,
        width: 1200,
        height: 630,
        alt: settings.platformName || 'HPC平台',
      }] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'copyright': getCopyrightInfo(),
      'author': getCompanyName(),
    }
  }
} 