import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { updateAllUsersHomeDirectory } from '@/lib/ldap-user'
import { verifyJwt } from '@/lib/jwt'
import { isSuperAdminUser, isAdminUser } from '@/lib/admin-utils'
export const dynamic = 'force-dynamic'


const CONFIG_PATH = path.resolve(process.cwd(), 'config/system-settings.json')

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface SystemSettings {
  platformName: string
  logoUrl: string
  watermarkText?: string
  watermarkEnabled?: boolean
  webshellCopyPasteEnabled?: boolean
  websiteTitle?: string
  websiteDescription?: string
  applicationsCenterEnabled?: boolean
  bigScreenButtonEnabled?: boolean
  userHomeDirectoryPrefix?: string
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

export async function GET(req: NextRequest) {
  try {
    // 获取用户认证信息
    const authHeader = req.headers.get('authorization')
    let user = null
    let isSuperAdmin = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      user = verifyJwt(token)
      isSuperAdmin = isSuperAdminUser(user)
    }

    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    const settings: SystemSettings = JSON.parse(data)

    // 检查是否为管理员（包括普通管理员和超级管理员）
    const isAdmin = isAdminUser(user)

    // 如果不是超级管理员，过滤敏感字段
    if (!isSuperAdmin) {
      // 移除安全设置敏感字段（这些是内部配置，不应该暴露给普通用户）
      delete settings.watermarkText
      delete settings.watermarkEnabled
      delete settings.webshellCopyPasteEnabled
      // 注意：applicationsCenterEnabled 和 bigScreenButtonEnabled 不应删除
      // 因为前端需要这些字段来控制UI显示，这些是功能开关而非敏感配置
      // delete settings.applicationsCenterEnabled
      // delete settings.bigScreenButtonEnabled

      // 用户家目录前缀：管理员可以查看和修改，所以保留
      // userHomeDirectoryPrefix 字段保留，不删除

      // 版权和品牌信息：仅超级管理员可以修改，但所有用户都可以查看
      // copyright, channel, client, branding 字段保留不删除
    }

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (e) {
    // 默认值
    return NextResponse.json({
      platformName: 'slurm-portal',
      logoUrl: '/logo.png',
      watermarkText: '',
      watermarkEnabled: false,
      webshellCopyPasteEnabled: true,
      websiteTitle: 'slurm-portal',
      websiteDescription: 'HPC cluster web management platform (Slurm)',
      applicationsCenterEnabled: true,
      bigScreenButtonEnabled: true,
      userHomeDirectoryPrefix: '/home',
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
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    // 验证用户权限
    const authHeader = req.headers.get('authorization')
    let user = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      user = verifyJwt(token)
    }

    // 检查用户权限
    const isSuperAdmin = isSuperAdminUser(user)
    const isAdmin = isAdminUser(user)

    // 如果没有认证或不是管理员，拒绝请求
    if (!user || !isAdmin) {
      return NextResponse.json({
        success: false,
        error: '需要管理员权限才能修改系统设置'
      }, { status: 403 })
    }

    const body = await req.json()

    // 检查是否包含敏感字段（需要超级管理员权限）
    const hasSensitiveFields =
      body.watermarkText !== undefined ||
      body.watermarkEnabled !== undefined ||
      body.webshellCopyPasteEnabled !== undefined ||
      body.applicationsCenterEnabled !== undefined ||
      body.bigScreenButtonEnabled !== undefined ||
      body.copyright !== undefined ||
      body.channel !== undefined ||
      body.client !== undefined ||
      body.branding !== undefined

    // 如果包含敏感字段但不是超级管理员，拒绝请求
    if (hasSensitiveFields && !isSuperAdmin) {
      return NextResponse.json({
        success: false,
        error: '仅超级管理员可以修改安全设置和版权信息配置'
      }, { status: 403 })
    }

    // 检查用户家目录前缀修改（需要管理员权限）
    // 注意：管理员可以修改用户家目录前缀，但需要谨慎操作
    // 此操作会影响所有用户的家目录路径

    // 检查是否是用户家目录前缀的更新
    const isHomeDirectoryUpdate = body.userHomeDirectoryPrefix !== undefined
    
    // 如果是家目录前缀更新，需要先读取当前配置
    let currentSettings: SystemSettings = {
      platformName: 'slurm-portal',
      logoUrl: '/logo.png',
      watermarkText: '',
      watermarkEnabled: false,
      webshellCopyPasteEnabled: true,
      websiteTitle: 'slurm-portal',
      websiteDescription: 'HPC cluster web management platform (Slurm)',
      applicationsCenterEnabled: true,
      bigScreenButtonEnabled: true,
      userHomeDirectoryPrefix: '/home',
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
    
    if (isHomeDirectoryUpdate) {
      try {
        const currentData = await fs.readFile(CONFIG_PATH, 'utf-8')
        currentSettings = JSON.parse(currentData)
      } catch (e) {
        // 使用默认值，已经在上面初始化了
      }
    }
    
    const settings: SystemSettings = {
      platformName: body.platformName || 'HPC平台',
      logoUrl: body.logoUrl || '/logo.png',
      watermarkText: body.watermarkText || '',
      watermarkEnabled: body.watermarkEnabled !== false, // 默认启用
      webshellCopyPasteEnabled: body.webshellCopyPasteEnabled !== false, // 默认启用
      websiteTitle: body.websiteTitle || '高性能计算管理平台',
      websiteDescription: body.websiteDescription || '基于Next.js开发的高性能计算环境管理与监控平台',
      applicationsCenterEnabled: body.applicationsCenterEnabled !== false, // 默认启用
      bigScreenButtonEnabled: body.bigScreenButtonEnabled !== false, // 默认启用
      userHomeDirectoryPrefix: body.userHomeDirectoryPrefix || '/home',
      copyright: {
        companyName: body.copyright?.companyName || '',
        companyUrl: body.copyright?.companyUrl || '',
        copyrightText: body.copyright?.copyrightText || '© slurm-portal contributors',
        poweredBy: body.copyright?.poweredBy || 'Powered by slurm-portal',
        showPoweredBy: body.copyright?.showPoweredBy === true
      },
      channel: {
        enabled: body.channel?.enabled || false,
        channelName: body.channel?.channelName || '',
        channelLogo: body.channel?.channelLogo || '',
        channelUrl: body.channel?.channelUrl || '',
        channelCopyright: body.channel?.channelCopyright || ''
      },
      client: {
        enabled: body.client?.enabled || false,
        clientName: body.client?.clientName || '',
        clientLogo: body.client?.clientLogo || '',
        clientUrl: body.client?.clientUrl || '',
        clientCopyright: body.client?.clientCopyright || ''
      },
      branding: {
        showFooter: body.branding?.showFooter !== false,
        footerText: body.branding?.footerText || '',
        showLoginBranding: body.branding?.showLoginBranding !== false,
        showDashboardBranding: body.branding?.showDashboardBranding !== false
      }
    }
    
    // 保存配置文件
    await fs.writeFile(CONFIG_PATH, JSON.stringify(settings, null, 2), 'utf-8')
    
    // 如果是用户家目录前缀更新，同步更新数据库中的用户家目录
    // 注意：即使配置文件中的值相同，也要检查LDAP是否需要同步，因为LDAP可能不一致
    if (isHomeDirectoryUpdate) {
      try {
        // 获取所有用户
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, username')
        
        if (usersError) {
          console.error('获取用户列表失败:', usersError)
        } else if (users && users.length > 0) {
          // 只有当家目录前缀真的发生变化时才更新数据库
          if (body.userHomeDirectoryPrefix !== currentSettings?.userHomeDirectoryPrefix) {
            // 批量更新用户家目录
            for (const user of users) {
              const { error: updateError } = await supabase
                .from('users')
                .update({ home_directory: `${body.userHomeDirectoryPrefix}/${user.username}` })
                .eq('id', user.id)
              
              if (updateError) {
                console.error(`更新用户 ${user.username} 家目录失败:`, updateError)
                return NextResponse.json({ 
                  success: false, 
                  error: `配置文件保存成功，但数据库同步失败: ${updateError.message}` 
                }, { status: 500 })
              }
            }
            console.log(`成功更新 ${users.length} 个用户的数据库家目录前缀`)
          } else {
            console.log('配置文件中的家目录前缀未发生变化，跳过数据库更新')
          }
        }
        
        // 同步更新LDAP中的用户家目录
        console.log('开始同步更新LDAP用户家目录前缀...')
        const ldapResult = await updateAllUsersHomeDirectory(body.userHomeDirectoryPrefix)
        
        if (!ldapResult.success) {
          console.error('LDAP家目录同步失败:', ldapResult.error)
          return NextResponse.json({ 
            success: false, 
            error: `配置文件和数据库更新成功，但LDAP同步失败: ${ldapResult.error}` 
          }, { status: 500 })
        } else {
          console.log(`✅ 成功同步更新 ${ldapResult.updatedCount} 个用户的LDAP家目录`)
        }
      } catch (dbError) {
        console.error('数据库操作失败:', dbError)
        return NextResponse.json({ 
          success: false, 
          error: `配置文件保存成功，但数据库同步失败: ${dbError}` 
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({ success: true, settings })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
} 