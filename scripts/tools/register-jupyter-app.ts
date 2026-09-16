#!/usr/bin/env tsx

/**
 * 注册 Jupyter Lab 应用到 HPC 应用管理系统
 *
 * 使用方法:
 * npx tsx scripts/register-jupyter-app.ts
 */

import { ApplicationRegistry } from '../lib/application-registry'
import { jupyterApp } from '../lib/applications/ai/jupyter'

async function registerJupyterApp() {
  console.log('====================================')
  console.log('注册 Jupyter Lab 应用到系统')
  console.log('====================================\n')

  try {
    const registry = ApplicationRegistry.getInstance()

    // 验证应用定义
    console.log('1. 验证应用定义...')
    const validation = registry.validate(jupyterApp)

    if (!validation.valid) {
      console.error('❌ 应用定义验证失败:')
      validation.errors.forEach(error => console.error(`  - ${error}`))
      process.exit(1)
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  警告:')
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`))
    }

    console.log('✅ 应用定义验证通过\n')

    // 注册应用
    console.log('2. 注册应用到数据库...')
    await registry.register(jupyterApp)
    console.log('✅ Jupyter Lab 应用注册成功\n')

    // 验证注册结果
    console.log('3. 验证注册结果...')
    const registered = await registry.get('jupyter', jupyterApp.metadata.version)

    if (registered) {
      console.log('✅ 应用注册验证成功')
      console.log('\n应用信息:')
      console.log(`  名称: ${registered.metadata.displayNameKey}`)
      console.log(`  版本: ${registered.metadata.version}`)
      console.log(`  分类: ${registered.metadata.category}`)
      console.log(`  类型: ${registered.metadata.type.join(', ')}`)
      console.log(`  标签: ${registered.metadata.tags.join(', ')}`)
    } else {
      console.error('❌ 应用注册验证失败')
      process.exit(1)
    }

    console.log('\n====================================')
    console.log('✅ Jupyter Lab 应用集成完成!')
    console.log('====================================\n')

    console.log('下一步:')
    console.log('1. 确保 Jupyter Lab 环境已安装:')
    console.log('   - 安装路径: /opt/software/jupyter-env')
    console.log('   - Python: 3.11+')
    console.log('   - JupyterLab: 4.0+')
    console.log('')
    console.log('2. 配置 Slurm 分区:')
    console.log('   - interactive: 用于标准和轻量级配置')
    console.log('   - gpu: 用于GPU加速配置')
    console.log('   - highmem: 用于大内存配置')
    console.log('')
    console.log('3. 访问 Jupyter Lab 页面:')
    console.log('   http://your-hpc-server/dashboard/jupyter')
    console.log('')

  } catch (error) {
    console.error('\n❌ 注册失败:', error)
    if (error instanceof Error) {
      console.error('错误详情:', error.message)
      console.error('堆栈信息:', error.stack)
    }
    process.exit(1)
  }
}

// 执行注册
registerJupyterApp()
  .then(() => {
    console.log('\n脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n脚本执行失败:', error)
    process.exit(1)
  })
