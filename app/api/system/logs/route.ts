import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { logger } from '@/lib/logger'
import fs from 'fs'
import path from 'path'
export const dynamic = 'force-dynamic'


// 验证管理员权限
function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  const userInfo = verifyJwt(token)
  
  if (!userInfo?.username || userInfo.role !== 'admin') {
    return null
  }
  
  return userInfo
}

// GET /api/system/logs - 获取日志文件列表和配置
export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req)
    if (!admin) {
      return Response.json({ error: '需要管理员权限' }, { status: 403 })
    }

    const config = logger.getConfig()
    const logFiles: Array<{
      name: string
      size: number
      mtime: string
      path: string
    }> = []

    try {
      const files = fs.readdirSync(config.logDir)
      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(config.logDir, file)
          const stats = fs.statSync(filePath)
          logFiles.push({
            name: file,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            path: filePath
          })
        }
      }
      logFiles.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
    } catch (error) {
      logger.error('System-Logs', '读取日志目录失败', error as Error)
    }

    return Response.json({
      success: true,
      config: {
        level: config.level,
        logDir: config.logDir,
        maxFileSize: config.maxFileSize,
        maxFiles: config.maxFiles,
        enableConsole: config.enableConsole,
        enableFile: config.enableFile
      },
      logFiles
    })

  } catch (error) {
    logger.error('System-Logs', 'GET请求失败', error as Error)
    return Response.json({ error: '获取日志信息失败' }, { status: 500 })
  }
}

// POST /api/system/logs - 更新日志配置
export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(req)
    if (!admin) {
      return Response.json({ error: '需要管理员权限' }, { status: 403 })
    }

    const body = await req.json()
    const { level, maxFileSize, maxFiles, enableConsole, enableFile } = body

    // 验证日志等级
    const validLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']
    if (level && !validLevels.includes(level)) {
      return Response.json({ error: '无效的日志等级' }, { status: 400 })
    }

    // 更新配置
    const updateConfig: any = {}
    if (level !== undefined) updateConfig.level = parseInt(level)
    if (maxFileSize !== undefined) updateConfig.maxFileSize = parseInt(maxFileSize)
    if (maxFiles !== undefined) updateConfig.maxFiles = parseInt(maxFiles)
    if (enableConsole !== undefined) updateConfig.enableConsole = enableConsole
    if (enableFile !== undefined) updateConfig.enableFile = enableFile

    logger.updateConfig(updateConfig)
    
    logger.info('System-Logs', '日志配置已更新', { 
      updatedBy: admin.username,
      newConfig: updateConfig 
    })

    return Response.json({
      success: true,
      message: '日志配置更新成功',
      config: logger.getConfig()
    })

  } catch (error) {
    logger.error('System-Logs', 'POST请求失败', error as Error)
    return Response.json({ error: '更新日志配置失败' }, { status: 500 })
  }
}

// DELETE /api/system/logs?file=filename - 删除指定日志文件
export async function DELETE(req: NextRequest) {
  try {
    const admin = requireAdmin(req)
    if (!admin) {
      return Response.json({ error: '需要管理员权限' }, { status: 403 })
    }

    const url = new URL(req.url)
    const filename = url.searchParams.get('file')
    
    if (!filename) {
      return Response.json({ error: '缺少文件名参数' }, { status: 400 })
    }

    const config = logger.getConfig()
    const filePath = path.join(config.logDir, filename)
    
    // 安全检查：确保文件在日志目录内
    if (!filePath.startsWith(config.logDir) || !filename.endsWith('.log')) {
      return Response.json({ error: '无效的文件路径' }, { status: 400 })
    }

    try {
      fs.unlinkSync(filePath)
      logger.info('System-Logs', '日志文件已删除', { 
        filename,
        deletedBy: admin.username 
      })
      
      return Response.json({
        success: true,
        message: `日志文件 ${filename} 删除成功`
      })
    } catch (error) {
      logger.error('System-Logs', '删除日志文件失败', error as Error, { filename })
      return Response.json({ error: '删除文件失败' }, { status: 500 })
    }

  } catch (error) {
    logger.error('System-Logs', 'DELETE请求失败', error as Error)
    return Response.json({ error: '删除日志文件失败' }, { status: 500 })
  }
}