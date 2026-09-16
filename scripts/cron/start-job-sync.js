#!/usr/bin/env node

/**
 * 作业同步服务启动脚本
 * 启动作业状态同步定时任务
 */

const { spawn, exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')

const execAsync = promisify(exec)

// 配置
const SYNC_INTERVAL = 60 * 1000 // 1分钟同步一次 (更频繁的同步便于测试)
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const PID_FILE = path.join(__dirname, '../..', 'data', 'job-sync.pid')

/**
 * 同步作业状态
 */
async function syncJobs() {
  try {
    console.log(`[${new Date().toISOString()}] 开始同步作业状态...`)
    
    // 调用同步API
    const response = await fetch(`${API_BASE_URL}/api/jobs/persistent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`同步API返回错误: ${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.success) {
      console.log(`[${new Date().toISOString()}] 同步成功:`, {
        message: result.message,
        stats: result.stats
      })
    } else {
      console.error(`[${new Date().toISOString()}] 同步失败:`, result.error)
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 同步作业状态失败:`, error.message)
  }
}

/**
 * 检查系统健康状态
 */
async function checkSystemHealth() {
  try {
    console.log(`[${new Date().toISOString()}] 检查系统健康状态...`)
    
    // 检查Slurm服务状态
    try {
      await execAsync('sinfo --version')
      console.log(`[${new Date().toISOString()}] Slurm服务正常`)
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Slurm服务异常:`, error.message)
    }
    
    // 检查API服务状态
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SYSTEM_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        console.log(`[${new Date().toISOString()}] API服务正常`)
      } else {
        console.error(`[${new Date().toISOString()}] API服务异常:`, response.status)
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] API服务连接失败:`, error.message)
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 系统健康检查失败:`, error.message)
  }
}

/**
 * 写入PID文件
 */
function writePidFile() {
  try {
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true })
    fs.writeFileSync(PID_FILE, process.pid.toString())
    console.log(`[${new Date().toISOString()}] PID文件已创建: ${PID_FILE}`)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 无法创建PID文件:`, error.message)
  }
}

/**
 * 清理PID文件
 */
function cleanupPidFile() {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE)
      console.log(`[${new Date().toISOString()}] PID文件已清理`)
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 清理PID文件失败:`, error.message)
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(`[${new Date().toISOString()}] 🚀 启动作业同步服务...`)
  console.log(`[${new Date().toISOString()}] API地址: ${API_BASE_URL}`)
  console.log(`[${new Date().toISOString()}] 同步间隔: ${SYNC_INTERVAL / 1000} 秒`)
  
  // 写入PID文件
  writePidFile()
  
  // 启动时立即执行一次健康检查
  await checkSystemHealth()
  
  // 启动时立即执行一次同步
  await syncJobs()
  
  // 设置定时任务
  const syncTimer = setInterval(syncJobs, SYNC_INTERVAL)
  
  // 每5分钟检查一次系统健康状态
  const healthTimer = setInterval(checkSystemHealth, 5 * 60 * 1000)
  
  console.log(`[${new Date().toISOString()}] ✅ 作业同步服务已启动，进程ID: ${process.pid}`)
  
  // 处理进程退出
  const cleanup = () => {
    console.log(`[${new Date().toISOString()}] 🛑 正在停止作业同步服务...`)
    clearInterval(syncTimer)
    clearInterval(healthTimer)
    cleanupPidFile()
    console.log(`[${new Date().toISOString()}] ✅ 作业同步服务已停止`)
    process.exit(0)
  }
  
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
  process.on('uncaughtException', (error) => {
    console.error(`[${new Date().toISOString()}] 未捕获的异常:`, error)
    cleanup()
  })
}

// 启动应用
if (require.main === module) {
  main().catch(error => {
    console.error(`[${new Date().toISOString()}] 启动失败:`, error)
    process.exit(1)
  })
}

module.exports = {
  syncJobs,
  checkSystemHealth,
  main
}