/**
 * 应用模板动态分区更新工具
 * 将现有应用模板从硬编码分区转换为动态分区配置
 */

import { createClient } from '@supabase/supabase-js'
import { getDynamicResourceConfig, generateResourceFields } from './dynamic-partition-config'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function updateApplicationTemplatesWithDynamicPartitions() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing')
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    console.log('=== 开始更新应用模板分区配置 ===')
    
    // 获取动态分区配置
    const config = await getDynamicResourceConfig()
    console.log(`获取到 ${config.partitionOptions.length} 个分区:`)
    config.partitionOptions.forEach(p => {
      console.log(`  - ${p.value}: ${p.label} (${p.description})`)
    })
    console.log(`默认分区: ${config.defaultPartition}`)
    
    // 获取所有需要更新的应用
    const { data: apps, error: fetchError } = await supabase
      .from('hpc_applications')
      .select('*')
      .eq('status', 'active')
    
    if (fetchError) {
      throw new Error(`获取应用失败: ${fetchError.message}`)
    }
    
    console.log(`\n找到 ${apps.length} 个活跃应用需要更新`)
    
    let updateCount = 0
    const updateResults: Array<{ name: string; success: boolean; error?: string }> = []
    
    for (const app of apps) {
      try {
        console.log(`\n处理应用: ${app.metadata.displayName}`)
        
        // 分析现有表单，移除旧的资源配置字段
        const currentForm = app.interface?.form || []
        const nonResourceFields = currentForm.filter(field => 
          !['resourceProfile', 'partition', 'cpus', 'memory', 'walltime'].includes(field.name)
        )
        
        // 获取应用的默认资源配置
        const appDefaults = {
          partition: app.resources?.default?.partition || config.defaultPartition,
          cpus: app.resources?.default?.cpusPerTask || 8,
          memory: app.resources?.default?.memory || '16GB',
          walltime: app.resources?.default?.walltime || '8:00:00'
        }
        
        // 生成动态资源字段
        const dynamicResourceFields = generateResourceFields(config, appDefaults)
        
        // 重新组织表单：应用特定字段 + 动态资源字段
        const updatedForm = [
          ...nonResourceFields,
          ...dynamicResourceFields
        ]
        
        // 更新资源配置，使用动态分区
        const updatedResources = {
          ...app.resources,
          default: {
            ...app.resources.default,
            partition: config.defaultPartition
          },
          // 保留 profiles 但更新分区为实际可用的分区
          profiles: app.resources?.profiles?.map((profile: any) => {
            // 尝试找到最匹配的分区
            let mappedPartition = config.defaultPartition
            
            // 分区映射逻辑
            if (profile.partition === 'bigmem' || profile.partition === 'highmem') {
              const bigmemPartition = config.partitionOptions.find(p => 
                p.value.includes('bigmem') || p.value.includes('highmem') || 
                p.value.includes('large') || p.description?.includes('大内存')
              )
              if (bigmemPartition) mappedPartition = bigmemPartition.value
            } else if (profile.partition === 'gpu' || profile.partition === 'graphics') {
              const gpuPartition = config.partitionOptions.find(p => 
                p.value.includes('gpu') || p.value.includes('graphics') || 
                p.gpuSupport
              )
              if (gpuPartition) mappedPartition = gpuPartition.value
            } else {
              // 对于其他分区，检查是否在可用分区中
              const exactMatch = config.partitionOptions.find(p => p.value === profile.partition)
              if (exactMatch) mappedPartition = profile.partition
            }
            
            return {
              ...profile,
              partition: mappedPartition
            }
          }) || []
        }
        
        // 更新应用
        const { error: updateError } = await supabase
          .from('hpc_applications')
          .update({
            interface: { form: updatedForm },
            resources: updatedResources,
            updated_at: new Date().toISOString()
          })
          .eq('id', app.id)
        
        if (updateError) {
          console.error(`❌ 更新 ${app.metadata.displayName} 失败:`, updateError.message)
          updateResults.push({ 
            name: app.metadata.displayName, 
            success: false, 
            error: updateError.message 
          })
        } else {
          console.log(`✅ ${app.metadata.displayName} 更新完成`)
          console.log(`   - 表单字段数: ${currentForm.length} → ${updatedForm.length}`)
          console.log(`   - 默认分区: ${appDefaults.partition} → ${config.defaultPartition}`)
          updateCount++
          updateResults.push({ 
            name: app.metadata.displayName, 
            success: true 
          })
        }
        
      } catch (error: any) {
        console.error(`❌ 处理应用 ${app.metadata.displayName} 时出错:`, error.message)
        updateResults.push({ 
          name: app.metadata.displayName, 
          success: false, 
          error: error.message 
        })
      }
    }
    
    console.log(`\n=== 更新完成 ===`)
    console.log(`成功更新: ${updateCount}/${apps.length}`)
    console.log(`失败详情:`)
    updateResults.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
    
    return {
      total: apps.length,
      updated: updateCount,
      failed: apps.length - updateCount,
      results: updateResults,
      partitionConfig: config
    }
    
  } catch (error: any) {
    console.error('更新应用模板失败:', error.message)
    throw error
  }
}

// 如果直接运行此文件，执行更新
if (require.main === module) {
  updateApplicationTemplatesWithDynamicPartitions()
    .then((result) => {
      console.log('\n🎉 更新完成:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 更新失败:', error.message)
      process.exit(1)
    })
}