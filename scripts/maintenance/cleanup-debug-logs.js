#!/usr/bin/env node

// 清理调试日志脚本
// 用于批量清理项目中的console.log调试信息

const fs = require('fs')
const path = require('path')

// 要清理的文件类型
const FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

// 要保留的console语句（错误和警告）
const PRESERVE_PATTERNS = [
  /console\.error/,
  /console\.warn/,
  /console\.info/
]

// 要清理的console语句
const CLEANUP_PATTERNS = [
  /console\.log\(/,
  /console\.debug\(/
]

// 递归遍历目录
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath, callback)
    } else if (stat.isFile() && FILE_EXTENSIONS.includes(path.extname(file))) {
      callback(filePath)
    }
  })
}

// 清理文件中的调试日志
function cleanupFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    const originalContent = content
    
    // 按行处理
    const lines = content.split('\n')
    const cleanedLines = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()
      
      // 检查是否是要清理的console语句
      let shouldRemove = false
      
      for (const pattern of CLEANUP_PATTERNS) {
        if (pattern.test(trimmedLine)) {
          // 检查是否是要保留的语句
          let shouldPreserve = false
          for (const preservePattern of PRESERVE_PATTERNS) {
            if (preservePattern.test(trimmedLine)) {
              shouldPreserve = true
              break
            }
          }
          
          if (!shouldPreserve) {
            shouldRemove = true
            break
          }
        }
      }
      
      if (!shouldRemove) {
        cleanedLines.push(line)
      }
    }
    
    const cleanedContent = cleanedLines.join('\n')
    
    // 如果内容有变化，写回文件
    if (cleanedContent !== originalContent) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8')
      return true
    }
    
    return false
  } catch (error) {
    console.error(`❌ 清理失败: ${filePath}`, error.message)
    return false
  }
}

// 主函数
function main() {
  const projectRoot = process.cwd()
  
  let totalFiles = 0
  let cleanedFiles = 0
  
  walkDir(projectRoot, (filePath) => {
    totalFiles++
    if (cleanupFile(filePath)) {
      cleanedFiles++
    }
  })
  
}

// 运行脚本
if (require.main === module) {
  main()
}

module.exports = {
  cleanupFile,
  walkDir
} 