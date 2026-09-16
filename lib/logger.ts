import fs from 'fs'
import path from 'path'

// 日志等级枚举
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

// 日志等级名称映射
const LOG_LEVEL_NAMES = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.TRACE]: 'TRACE'
}

// 日志颜色配置（终端输出）
const LOG_COLORS = {
  [LogLevel.ERROR]: '\x1b[31m', // 红色
  [LogLevel.WARN]: '\x1b[33m',  // 黄色
  [LogLevel.INFO]: '\x1b[36m',  // 青色
  [LogLevel.DEBUG]: '\x1b[32m', // 绿色
  [LogLevel.TRACE]: '\x1b[90m'  // 灰色
}

const RESET_COLOR = '\x1b[0m'

// 日志配置接口
interface LoggerConfig {
  level: LogLevel
  logDir: string
  maxFileSize: number // MB
  maxFiles: number
  enableConsole: boolean
  enableFile: boolean
  dateFormat: string
}

// 默认配置
const DEFAULT_CONFIG: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  logDir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
  maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10'), // MB
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE !== 'false',
  dateFormat: 'YYYY-MM-DD HH:mm:ss'
}

// 日志条目接口
interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: any
  error?: Error
}

class Logger {
  private config: LoggerConfig
  private currentLogFile: string
  private fileWriteStream?: fs.WriteStream

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    // 从环境变量读取日志等级
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase()
    if (envLogLevel && envLogLevel in LogLevel) {
      this.config.level = LogLevel[envLogLevel as keyof typeof LogLevel]
    }

    this.currentLogFile = this.generateLogFileName()
    this.ensureLogDirectory()
    this.initFileStream()
  }

  private generateLogFileName(): string {
    const date = new Date().toISOString().split('T')[0]
    return path.join(this.config.logDir, `app-${date}.log`)
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true })
    }
  }

  private initFileStream(): void {
    if (!this.config.enableFile) return

    try {
      this.fileWriteStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' })
      this.fileWriteStream.on('error', (err) => {
        console.error('日志文件写入错误:', err)
      })
    } catch (error) {
      console.error('初始化日志文件流失败:', error)
    }
  }

  private formatTimestamp(): string {
    return new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelName = LOG_LEVEL_NAMES[entry.level].padEnd(5)
    let message = `[${entry.timestamp}] [${levelName}] [${entry.module}] ${entry.message}`
    
    if (entry.data) {
      message += ` | Data: ${JSON.stringify(entry.data)}`
    }
    
    if (entry.error) {
      message += ` | Error: ${entry.error.message}`
      if (entry.error.stack) {
        message += `\nStack: ${entry.error.stack}`
      }
    }
    
    return message
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return

    const color = LOG_COLORS[entry.level]
    const levelName = LOG_LEVEL_NAMES[entry.level]
    const coloredMessage = `${color}[${entry.timestamp}] [${levelName}] [${entry.module}]${RESET_COLOR} ${entry.message}`
    
    console.log(coloredMessage)
    
    if (entry.data) {
      console.log('  Data:', entry.data)
    }
    
    if (entry.error) {
      console.error('  Error:', entry.error)
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.config.enableFile || !this.fileWriteStream) return

    try {
      const logLine = this.formatLogEntry(entry) + '\n'
      this.fileWriteStream.write(logLine)
      
      // 检查文件大小并轮转
      this.checkFileRotation()
    } catch (error) {
      console.error('写入日志文件失败:', error)
    }
  }

  private checkFileRotation(): void {
    try {
      const stats = fs.statSync(this.currentLogFile)
      const fileSizeMB = stats.size / (1024 * 1024)
      
      if (fileSizeMB > this.config.maxFileSize) {
        this.rotateLogFile()
      }
    } catch (error) {
      console.error('检查日志文件大小失败:', error)
    }
  }

  private rotateLogFile(): void {
    try {
      // 关闭当前文件流
      if (this.fileWriteStream) {
        this.fileWriteStream.end()
      }

      // 重命名当前文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const rotatedFile = this.currentLogFile.replace('.log', `-${timestamp}.log`)
      fs.renameSync(this.currentLogFile, rotatedFile)

      // 创建新的日志文件
      this.currentLogFile = this.generateLogFileName()
      this.initFileStream()

      // 清理旧日志文件
      this.cleanupOldLogs()
      
      this.info('Logger', '日志文件已轮转', { rotatedFile })
    } catch (error) {
      console.error('日志文件轮转失败:', error)
    }
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.config.logDir)
      const logFiles = files
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDir, file),
          mtime: fs.statSync(path.join(this.config.logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

      // 保留最新的 maxFiles 个文件，删除其余的
      if (logFiles.length > this.config.maxFiles) {
        const filesToDelete = logFiles.slice(this.config.maxFiles)
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path)
            console.log(`已删除旧日志文件: ${file.name}`)
          } catch (error) {
            console.error(`删除日志文件失败: ${file.name}`, error)
          }
        })
      }
    } catch (error) {
      console.error('清理旧日志文件失败:', error)
    }
  }

  private log(level: LogLevel, module: string, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      module,
      message,
      data,
      error
    }

    this.writeToConsole(entry)
    this.writeToFile(entry)
  }

  // 公共日志方法
  error(module: string, message: string, error?: Error | any, data?: any): void {
    const err = error instanceof Error ? error : undefined
    const errorData = error instanceof Error ? data : error
    this.log(LogLevel.ERROR, module, message, errorData, err)
  }

  warn(module: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, module, message, data)
  }

  info(module: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, module, message, data)
  }

  debug(module: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, module, message, data)
  }

  trace(module: string, message: string, data?: any): void {
    this.log(LogLevel.TRACE, module, message, data)
  }

  // 关闭日志系统
  close(): void {
    if (this.fileWriteStream) {
      this.fileWriteStream.end()
    }
  }

  // 获取当前配置
  getConfig(): LoggerConfig {
    return { ...this.config }
  }

  // 更新配置
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.logDir && newConfig.logDir !== this.config.logDir) {
      this.ensureLogDirectory()
      this.currentLogFile = this.generateLogFileName()
      this.initFileStream()
    }
  }
}

// 创建全局日志实例
export const logger = new Logger()

// 进程退出时关闭日志系统
process.on('exit', () => {
  logger.close()
})

process.on('SIGINT', () => {
  logger.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.close()
  process.exit(0)
})

// 兼容旧的日志函数
export function logAppEvent(message: string) {
  logger.info('App', message)
}

export default logger 