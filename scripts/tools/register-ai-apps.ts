#!/usr/bin/env tsx

/**
 * 注册 AI 应用到 HPC 应用管理系统
 *
 * 包含应用:
 * - Jupyter Lab (交互式开发环境)
 * - PyTorch (深度学习框架)
 * - vLLM (大模型推理服务)
 *
 * 使用方法:
 * npx tsx scripts/register-ai-apps.ts
 */

import { config } from 'dotenv'
import { ApplicationRegistry } from '../lib/application-registry'
import { aiApplications, getAIApplicationMetadata } from '../lib/applications/ai'

// 加载环境变量
config()

async function registerAIApps() {
  console.log('====================================')
  console.log('注册 AI 应用到系统')
  console.log('====================================\n')

  try {
    const registry = ApplicationRegistry.getInstance()
    const metadata = getAIApplicationMetadata()

    console.log(`准备注册 ${metadata.total} 个 AI 应用:\n`)
    metadata.applications.forEach((app, index) => {
      console.log(`${index + 1}. ${app.name} (${app.version})`)
      console.log(`   显示名称: ${app.displayNameKey}`)
      console.log(`   分类: ${app.category}`)
      console.log(`   GPU需求: ${app.gpuRequired ? '✓ 必需' : '○ 可选'}`)
      console.log(`   标签: ${app.tags.join(', ')}`)
      console.log('')
    })

    // 验证所有应用定义
    console.log('1. 验证应用定义...')
    let hasValidationErrors = false

    for (const app of aiApplications) {
      const validation = registry.validate(app)

      if (!validation.valid) {
        hasValidationErrors = true
        console.error(`❌ ${app.metadata.name} 验证失败:`)
        validation.errors.forEach(error => console.error(`   - ${error}`))
      } else {
        console.log(`✅ ${app.metadata.name} 验证通过`)
      }

      if (validation.warnings.length > 0) {
        console.warn(`⚠️  ${app.metadata.name} 警告:`)
        validation.warnings.forEach(warning => console.warn(`   - ${warning}`))
      }
    }

    if (hasValidationErrors) {
      console.error('\n❌ 存在验证错误，终止注册')
      process.exit(1)
    }

    console.log('\n✅ 所有应用定义验证通过\n')

    // 批量注册应用
    console.log('2. 批量注册应用到数据库...')
    const startTime = Date.now()

    const result = await registry.registerBatch(aiApplications)

    const duration = Date.now() - startTime

    console.log(`\n注册完成 (耗时: ${duration}ms)`)
    console.log(`✅ 成功: ${result.success}`)
    console.log(`❌ 失败: ${result.failed}`)

    if (result.errors.length > 0) {
      console.error('\n错误详情:')
      result.errors.forEach(err => console.error(`  - ${err}`))
    }

    // 验证注册结果
    console.log('\n3. 验证注册结果...')
    let verificationFailed = false

    for (const app of aiApplications) {
      const registered = await registry.get(app.metadata.name, app.metadata.version)

      if (registered) {
        console.log(`✅ ${app.metadata.name}@${app.metadata.version} 注册验证成功`)
      } else {
        console.error(`❌ ${app.metadata.name}@${app.metadata.version} 注册验证失败`)
        verificationFailed = true
      }
    }

    if (verificationFailed) {
      console.error('\n❌ 部分应用注册验证失败')
      process.exit(1)
    }

    // 显示总结信息
    console.log('\n====================================')
    console.log('✅ AI 应用注册完成!')
    console.log('====================================\n')

    console.log('已注册的应用:')
    for (const app of aiApplications) {
      console.log(`  • ${app.metadata.name} (${app.metadata.version})`)
      console.log(`    类别: ${app.metadata.category}`)
      console.log(`    类型: ${app.metadata.type.join(', ')}`)
      console.log(`    GPU: ${app.requirements.hardware?.gpu?.required ? '必需' : '可选'}`)
      console.log('')
    }

    console.log('下一步操作:')
    console.log('1. 确保 GPU 环境已配置:')
    console.log('   - PyTorch: /opt/software/pytorch-env')
    console.log('   - vLLM: /opt/software/vllm-env')
    console.log('   - Jupyter Lab: /opt/software/jupyter-env')
    console.log('')
    console.log('2. 配置 Slurm GPU 分区:')
    console.log('   sinfo -p gpu')
    console.log('')
    console.log('3. 访问应用中心:')
    console.log('   http://your-hpc-server/dashboard/applications')
    console.log('')
    console.log('4. 查看 AI 工具板块,选择应用提交作业')
    console.log('')

  } catch (error) {
    console.error('\n❌ 注册失败:', error)
    if (error instanceof Error) {
      console.error('错误详情:', error.message)
      if (error.stack) {
        console.error('堆栈信息:', error.stack)
      }
    }
    process.exit(1)
  }
}

// 执行注册
registerAIApps()
  .then(() => {
    console.log('\n脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n脚本执行失败:', error)
    process.exit(1)
  })
