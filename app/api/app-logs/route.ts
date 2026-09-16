import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
export const dynamic = 'force-dynamic'


export async function GET(req: NextRequest) {
  try {
    const logsDir = path.resolve(process.cwd(), 'logs')
    const today = new Date().toISOString().split('T')[0]
    
    // Try to read today's log file first, then fall back to the most recent one
    const possibleLogFiles = [
      `app-${today}.log`,
      `app.log`
    ]
    
    // Get all app log files and sort by modification time
    const files = await fs.readdir(logsDir)
    const appLogFiles = files
      .filter(file => file.startsWith('app-') && file.endsWith('.log'))
      .map(file => ({ name: file, path: path.join(logsDir, file) }))
    
    // Sort by modification time (newest first)
    const sortedFiles = await Promise.all(
      appLogFiles.map(async file => {
        const stats = await fs.stat(file.path)
        return { ...file, mtime: stats.mtime }
      })
    )
    sortedFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    
    // Try reading files in priority order
    const tryFiles = [
      ...possibleLogFiles.map(name => path.join(logsDir, name)),
      ...sortedFiles.slice(0, 3).map(f => f.path) // Try 3 most recent files
    ]
    
    let lastError = null
    for (const logPath of tryFiles) {
      try {
        const data = await fs.readFile(logPath, 'utf-8')
        const lines = data.trim().split('\n').filter(line => line.length > 0)
        const lastLines = lines.slice(-200) // Increased to 200 lines
        return Response.json({ 
          success: true, 
          logs: lastLines,
          logFile: path.basename(logPath),
          totalLines: lines.length
        })
      } catch (e: any) {
        lastError = e
        if (e.code !== 'ENOENT') break // Only continue on file not found
      }
    }
    
    return Response.json({ 
      success: false, 
      error: `无法读取应用日志文件: ${lastError?.message || '未知错误'}`, 
      logs: [] 
    }, { status: 500 })
  } catch (e: any) {
    return Response.json({ 
      success: false, 
      error: `获取日志文件列表失败: ${e.message}`, 
      logs: [] 
    }, { status: 500 })
  }
} 