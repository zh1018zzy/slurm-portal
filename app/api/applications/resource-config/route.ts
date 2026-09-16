import { NextRequest } from 'next/server'
import { getDynamicResourceConfig, generateResourceFields } from '@/lib/dynamic-partition-config'
export const dynamic = 'force-dynamic'


/**
 * GET /api/applications/resource-config
 * 获取动态资源配置，用于应用提交表单
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 获取动态资源配置
    const config = await getDynamicResourceConfig()
    
    // 生成标准表单字段
    const resourceFields = generateResourceFields(config)
    
    const responseTime = Date.now() - startTime
    
    return Response.json({
      success: true,
      config,
      resourceFields,
      responseTime,
      partitionCount: config.partitionOptions.length,
      defaultPartition: config.defaultPartition
    })
    
  } catch (error: any) {
    console.error('获取资源配置失败:', error)
    
    return Response.json({
      success: false,
      error: error.message || '获取资源配置失败',
      responseTime: Date.now() - startTime
    }, { status: 500 })
  }
}