import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
export const dynamic = 'force-dynamic'


// GET /api/system-logs 获取系统日志
export async function GET(req: NextRequest) {
  // Define log sources in priority order
  const logSources = [
    {
      name: 'PM2 Combined Logs',
      paths: [path.resolve(process.cwd(), 'logs/pm2-combined.log')]
    },
    {
      name: 'PM2 Error Logs', 
      paths: [path.resolve(process.cwd(), 'logs/pm2-error.log')]
    },
    {
      name: 'Combined Service Logs',
      paths: [
        path.resolve(process.cwd(), 'logs/combined-1.log'),
        path.resolve(process.cwd(), 'logs/combined-2.log'),
        path.resolve(process.cwd(), 'logs/combined-3.log')
      ]
    },
    {
      name: 'System Logs',
      paths: ['/var/log/syslog', '/var/log/messages']
    }
  ]

  let lastError = null
  
  for (const source of logSources) {
    for (const logPath of source.paths) {
      try {
        const data = await fs.readFile(logPath, 'utf-8')
        const lines = data.trim().split('\n').filter(line => line.length > 0)
        const lastLines = lines.slice(-200) // Show last 200 lines
        
        return Response.json({ 
          success: true, 
          logs: lastLines,
          logSource: source.name,
          logFile: path.basename(logPath),
          totalLines: lines.length
        })
      } catch (e: any) {
        lastError = e
        
        // Special handling for permission issues
        if (e.code === 'EACCES') {
          // Try next file instead of failing immediately
          continue
        }
        
        // For other errors besides "file not found", try next source
        if (e.code !== 'ENOENT') {
          continue
        }
      }
    }
  }
  
  // If we reach here, no logs were found
  const errorMsg = lastError?.code === 'EACCES' 
    ? '没有权限读取系统日志文件。请以适当权限运行应用程序或检查文件权限设置。'
    : `未找到可用的系统日志文件。错误: ${lastError?.message || '未知错误'}`
  
  return Response.json({ 
    success: false, 
    error: errorMsg,
    logs: [],
    suggestion: '建议检查日志文件路径和权限设置。'
  }, { status: 500 })
} 