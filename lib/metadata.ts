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
      platformName: 'slurm-portal',
      websiteTitle: 'slurm-portal',
      websiteDescription: 'HPC cluster web management platform (Slurm)',
      copyright: {
        companyName: '',
        companyUrl: '',
        copyrightText: '© slurm-portal contributors',
        poweredBy: 'Powered by slurm-portal',
        showPoweredBy: false
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
    return settings.copyright?.copyrightText || '© slurm-portal contributors';
  };

  // 确定公司名称
  const getCompanyName = () => {
    if (settings.client?.enabled && settings.client.clientName) {
      return settings.client.clientName;
    }
    if (settings.channel?.enabled && settings.channel.channelName) {
      return settings.channel.channelName;
    }
    return settings.copyright?.companyName || 'slurm-portal';
  };
  
  return {
    title: settings.websiteTitle || settings.platformName || 'slurm-portal',
    description: settings.websiteDescription || 'HPC cluster web management platform (Slurm)',
    keywords: ['Slurm', '集群管理', '作业调度', 'WebShell', 'VNC'],
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
      title: settings.websiteTitle || settings.platformName || 'Slurm 门户',
      description: settings.websiteDescription || '面向 SchedMD Slurm 集群的 Web 作业与资源管理门户',
      type: 'website',
      locale: 'zh_CN',
      siteName: settings.platformName || 'Slurm 门户',
      images: settings.logoUrl && settings.logoUrl !== '/logo.png' ? [{
        url: settings.logoUrl,
        width: 1200,
        height: 630,
        alt: settings.platformName || 'Slurm 门户',
      }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.websiteTitle || settings.platformName || 'Slurm 门户',
      description: settings.websiteDescription || '面向 SchedMD Slurm 集群的 Web 作业与资源管理门户',
      images: settings.logoUrl && settings.logoUrl !== '/logo.png' ? [{
        url: settings.logoUrl,
        width: 1200,
        height: 630,
        alt: settings.platformName || 'Slurm 门户',
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