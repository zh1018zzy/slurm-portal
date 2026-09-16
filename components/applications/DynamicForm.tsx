'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { Lightbulb, Play, Settings, Upload } from 'lucide-react'
import { HpcApplicationSpec, ApplicationType } from '@/lib/hpc-application-spec'

interface DynamicFormProps {
  application: HpcApplicationSpec
  onSubmit: (data: any) => void
  onRecommend?: (data: any) => void
  recommendation?: ResourceRecommendation
  isSubmitting?: boolean
  isRecommending?: boolean
}

export function DynamicForm({ 
  application, 
  onSubmit, 
  onRecommend, 
  recommendation,
  isSubmitting = false,
  isRecommending = false
}: DynamicFormProps) {
  const [formData, setFormData] = React.useState<Record<string, any>>({})
  const [dynamicOptions, setDynamicOptions] = React.useState<Record<string, any[]>>({})
  const [loadingDynamic, setLoadingDynamic] = React.useState<Record<string, boolean>>({})

  // 获取默认值
  React.useEffect(() => {
    const defaults: Record<string, any> = {}
    application.interface.form.forEach(field => {
      if (field.default !== undefined) {
        defaults[field.name] = field.default
      }
    })
    setFormData(defaults)
  }, [application])

  // 加载动态选项
  React.useEffect(() => {
    const dynamicFields = application.interface.form.filter(field => field.type === 'dynamic')
    
    dynamicFields.forEach(async (field) => {
      if (field.apiEndpoint && !dynamicOptions[field.name]) {
        setLoadingDynamic(prev => ({ ...prev, [field.name]: true }))
        
        try {
          const response = await fetch(field.apiEndpoint)
          const data = await response.json()
          
          if (data.success && data.partitions) {
            const options = data.partitions.map((p: any) => ({
              label: p.name,
              value: p.name
            }))
            
            setDynamicOptions(prev => ({ ...prev, [field.name]: options }))
            
            // 设置默认值
            if (options.length > 0 && !formData[field.name]) {
              const defaultPartition = options.find((opt: any) => opt.value.includes('*'))?.value || 
                                      options.find((opt: any) => opt.value === field.default)?.value ||
                                      options[0].value
              setFormData(prev => ({ ...prev, [field.name]: defaultPartition }))
            }
          }
        } catch (error) {
          console.error(`加载动态选项失败 (${field.name}):`, error)
        } finally {
          setLoadingDynamic(prev => ({ ...prev, [field.name]: false }))
        }
      }
    })
  }, [application, formData, dynamicOptions])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 检查是否有文件需要上传
    const hasFiles = application.interface.form.some(field => 
      field.type === 'file' && formData[field.name]
    )
    
    if (hasFiles) {
      // 如果有文件，使用FormData上传
      const formDataObj = new FormData()
      
      // 添加所有表单数据
      for (const [key, value] of Object.entries(formData)) {
        if (value instanceof File) {
          formDataObj.append(key, value)
        } else if (Array.isArray(value) && value.every(v => v instanceof File)) {
          // 处理多文件上传
          value.forEach((file: File) => {
            formDataObj.append(key, file)
          })
        } else {
          formDataObj.append(key, String(value))
        }
      }
      
      // 调用onSubmit时传递FormData
      onSubmit(formDataObj)
    } else {
      // 没有文件，使用JSON提交
      onSubmit(formData)
    }
  }

  const handleRecommend = () => {
    if (onRecommend) {
      onRecommend(formData)
    }
  }

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* 应用信息卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {application.metadata.displayName || application.metadata.name}
                <Badge variant="outline">{application.metadata.version}</Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                {application.metadata.description}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1">
              {application.metadata.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 简化表单 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 两列布局：作业配置 + 计算资源配置 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左列：作业配置 - 只显示应用特定字段 */}
          <TechCard hover>
            <CardHeader>
              <CardTitle>作业配置</CardTitle>
              <CardDescription>
                配置作业的输入参数和运行选项
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {application.interface.form
                .filter(field => !['partition', 'cpus', 'memory', 'walltime', 'nodes', 'cpusPerTask'].includes(field.name))
                .map(field => (
                <div key={field.name} className="space-y-2">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                    />
                  )}
                  
                  {field.type === 'textarea' && (
                    <textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                      required={field.required}
                    />
                  )}
                  
                  {field.type === 'select' && field.options && (
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                    >
                      <option value="">选择...</option>
                      {field.options.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                    />
                  )}
                  
                  {field.type === 'file' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="relative"
                          onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = field.accept?.join(',') || '*'
                            input.multiple = field.multiple || false
                            input.onchange = (e) => {
                              const files = Array.from((e.target as HTMLInputElement).files || [])
                              if (field.multiple) {
                                handleFieldChange(field.name, files)
                              } else {
                                handleFieldChange(field.name, files[0] || null)
                              }
                            }
                            input.click()
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          选择文件
                        </Button>
                        {field.accept && (
                          <span className="text-sm text-muted-foreground">
                            支持: {field.accept.join(', ')}
                          </span>
                        )}
                      </div>
                      
                      {/* 显示已选择的文件 */}
                      {formData[field.name] && (
                        <div className="space-y-1">
                          {Array.isArray(formData[field.name]) ? (
                            formData[field.name].map((file: File, index: number) => (
                              <div 
                                key={index}
                                className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                              >
                                <span className="flex-1">{file.name}</span>
                                <span className="text-muted-foreground">
                                  {(file.size / 1024).toFixed(1)} KB
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newFiles = [...formData[field.name]]
                                    newFiles.splice(index, 1)
                                    handleFieldChange(field.name, newFiles)
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                              <span className="flex-1">{formData[field.name].name}</span>
                              <span className="text-muted-foreground">
                                {(formData[field.name].size / 1024).toFixed(1)} KB
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFieldChange(field.name, null)}
                              >
                                ×
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {field.description && (
                    <p className="text-sm text-gray-600">{field.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </TechCard>

          {/* 右列：计算资源配置 - 显示应用表单中的资源字段 */}
          <Card>
            <CardHeader>
              <CardTitle>计算资源配置</CardTitle>
              <CardDescription>
                配置作业所需的计算资源
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 渲染应用表单中的资源配置字段 */}
              {application.interface.form
                .filter(field => ['partition', 'cpus', 'memory', 'walltime', 'nodes', 'cpusPerTask'].includes(field.name))
                .map(field => (
                <div key={field.name} className="space-y-2">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'select' && field.options && (
                    <select
                      value={formData[field.name] || field.default || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                    >
                      <option value="">选择...</option>
                      {field.options.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'dynamic' && (
                    <select
                      value={formData[field.name] || field.default || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                      disabled={loadingDynamic[field.name]}
                    >
                      {loadingDynamic[field.name] ? (
                        <option value="">正在加载分区...</option>
                      ) : dynamicOptions[field.name]?.length > 0 ? (
                        <>
                          <option value="">选择分区...</option>
                          {dynamicOptions[field.name].map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value="" disabled>暂无可用分区</option>
                      )}
                    </select>
                  )}
                  
                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={formData[field.name] || field.default || ''}
                      onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                    />
                  )}
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={formData[field.name] || field.default || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                    />
                  )}
                  
                  {field.description && (
                    <p className="text-sm text-gray-600">{field.description}</p>
                  )}
                </div>
              ))}

              {/* GPU配置（如果应用支持GPU） */}
              {application.metadata.type.includes(ApplicationType.GPU) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">GPU数量</label>
                  <input
                    type="number"
                    value={formData.gpus || 0}
                    onChange={(e) => handleFieldChange('gpus', Number(e.target.value))}
                    min={0}
                    max={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}

              {/* 操作按钮 */}
              <div className="pt-4 space-y-3">
                {onRecommend && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleRecommend}
                    disabled={isRecommending}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Lightbulb className="h-4 w-4" />
                    {isRecommending ? '获取推荐中...' : '获取资源推荐'}
                  </Button>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isSubmitting ? '提交中...' : '提交作业'}
                </Button>
              </div>

              {/* 预设配置 - 暂时隐藏 */}
              {/* {application.resources.profiles && application.resources.profiles.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-medium">预设配置</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {application.resources.profiles.map((profile, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          // 根据实际字段名称设置值
                          if (profile.nodes) handleFieldChange('nodes', profile.nodes)
                          if (profile.cpusPerTask) {
                            // 优先使用 cpus 字段，如果不存在则使用 cpusPerTask
                            const cpusField = application.interface.form.find(f => f.name === 'cpus')
                            const cpusPerTaskField = application.interface.form.find(f => f.name === 'cpusPerTask')
                            if (cpusField) {
                              handleFieldChange('cpus', profile.cpusPerTask)
                            } else if (cpusPerTaskField) {
                              handleFieldChange('cpusPerTask', profile.cpusPerTask)
                            }
                          }
                          if (profile.memory) handleFieldChange('memory', profile.memory)
                          if (profile.walltime) handleFieldChange('walltime', profile.walltime)
                          if (profile.partition) handleFieldChange('partition', profile.partition)
                        }}
                        className="p-3 border rounded-lg text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-sm">{profile.name}</div>
                        <div className="text-xs text-gray-600">{profile.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {profile.nodes && `${profile.nodes}节点 | `}
                          {profile.cpusPerTask}核心 | {profile.memory}
                          {profile.partition && ` | ${profile.partition}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )} */}
            </CardContent>
          </Card>
        </div>

        {/* 推荐展示区域 */}
        {recommendation && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                资源推荐
                <Badge variant="outline">
                  置信度: {Math.round(recommendation.confidence * 100)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {recommendation.profile.nodes && (
                  <div>
                    <div className="text-xs text-gray-500">节点数</div>
                    <div className="font-mono font-medium">{recommendation.profile.nodes}</div>
                  </div>
                )}
                {recommendation.profile.cpusPerTask && (
                  <div>
                    <div className="text-xs text-gray-500">CPU核心</div>
                    <div className="font-mono font-medium">{recommendation.profile.cpusPerTask}</div>
                  </div>
                )}
                {recommendation.profile.memory && (
                  <div>
                    <div className="text-xs text-gray-500">内存</div>
                    <div className="font-mono font-medium">{recommendation.profile.memory}</div>
                  </div>
                )}
                {recommendation.profile.walltime && (
                  <div>
                    <div className="text-xs text-gray-500">运行时间</div>
                    <div className="font-mono font-medium">{recommendation.profile.walltime}</div>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">推荐理由</div>
                <ul className="space-y-1">
                  {recommendation.reasoning.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-600">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button 
                type="button"
                onClick={() => {
                  // 应用推荐配置到表单
                  const newFormData = { ...formData }
                  if (recommendation.profile.nodes) newFormData.nodes = recommendation.profile.nodes
                  if (recommendation.profile.cpusPerTask) newFormData.cpusPerTask = recommendation.profile.cpusPerTask
                  if (recommendation.profile.memory) newFormData.memory = recommendation.profile.memory
                  if (recommendation.profile.walltime) newFormData.walltime = recommendation.profile.walltime
                  setFormData(newFormData)
                }}
              >
                应用推荐配置
              </Button>
            </CardContent>
          </Card>
        )}
      </form>

      {/* 帮助信息 - 暂时禁用，等待接口完善 */}
      {/* {application.interface.help && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">帮助信息</CardTitle>
          </CardHeader>
          <CardContent>
            {application.interface.help.general && (
              <p className="text-gray-600 mb-4">
                {application.interface.help.general}
              </p>
            )}
            
            {application.interface.help.documentation && (
              <div className="mb-4">
                <a 
                  href={application.interface.help.documentation} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  查看官方文档 →
                </a>
              </div>
            )}

            {application.interface.help.examples && (
              <div>
                <h4 className="font-medium mb-2">示例代码</h4>
                <div className="space-y-3">
                  {application.interface.help.examples?.map((example: { title: string; code: string; description?: string }, index: number) => (
                    <div key={index} className="border rounded-md p-3">
                      <div className="font-medium text-sm mb-2">
                        {example.title}
                      </div>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        <code>{example.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )} */}
    </div>
  )
}

// 帮助内容接口
interface HelpContent {
  general?: string
  documentation?: string
  examples?: Array<{
    title: string
    code: string
    description?: string
  }>
}

// 资源推荐接口
export interface ResourceRecommendation {
  profile: {
    nodes?: number
    cpusPerTask?: number
    memory?: string
    walltime?: string
    partition?: string
    gpu?: {
      count?: number
      type?: string
    }
  }
  confidence: number
  reasoning: string[]
  source: string
}