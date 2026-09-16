#!/usr/bin/env node

/**
 * 作业状态同步定时任务
 * 定期同步作业状态并发送通知
 */

const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

// 配置
const SYNC_INTERVAL = 5 * 60 * 1000 // 5分钟同步一次
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

/**
 * 同步作业状态
 */
async function syncJobs() {
  try {
    
    // 调用同步API
    const response = await fetch(`${API_BASE_URL}/api/jobs/sync`, {
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
        totalJobs: result.totalJobs,
        syncedJobs: result.syncedJobs,
        newJobs: result.newJobs,
        changedJobs: result.changedJobs
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
    
    // 检查Slurm服务状态
    try {
      await execAsync('sinfo --version')
    } catch (error) {
      console.error('Slurm服务异常:', error.message)
    }
    
    // 检查数据库连接
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/sync`, {
        method: 'GET'
      })
      
      if (response.ok) {
      } else {
        console.error('数据库连接异常:', response.status)
      }
    } catch (error) {
      console.error('数据库连接失败:', error.message)
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 系统健康检查失败:`, error.message)
  }
}

/**
 * 主函数
 */
async function main() {
  
  // 启动时立即执行一次
  await syncJobs()
  
  // 设置定时任务
  setInterval(syncJobs, SYNC_INTERVAL)
  
  // 每小时检查一次系统健康状态
  setInterval(checkSystemHealth, 60 * 60 * 1000)
  
  // 处理进程退出
  process.on('SIGINT', () => {
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    process.exit(0)
  })
  
}

// 启动应用
if (require.main === module) {
  main().catch(error => {
    console.error('启动失败:', error)
    process.exit(1)
  })
}

module.exports = {
  syncJobs,
  checkSystemHealth
} 