'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TechCard } from '@/components/ui/tech-card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Settings, 
  FileText, 
  Users, 
  Zap,
  Save,
  Eye
} from 'lucide-react'
import { HpcApplicationSpec, ApplicationCategory, ApplicationType } from '@/lib/hpc-application-spec'

interface ApplicationWizardProps {
  application?: HpcApplicationSpec
  onSave: (app: HpcApplicationSpec) => void
  onCancel: () => void
  isNewApplication?: boolean
}

export function ApplicationWizard({ 
  application, 
  onSave, 
  onCancel,
  isNewApplication = false 
}: ApplicationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<HpcApplicationSpec>(
    application || createDefaultApplication()
  )

  const steps = [
    {
      id: 'basic',
      title: '基本信息',
      icon: FileText,
      description: '设置应用的基本元数据'
    },
    {
      id: 'interface',
      title: '用户界面',
      icon: Settings,
      description: '配置表单字段和用户交互'
    },
    {
      id: 'execution',
      title: '执行配置',
      icon: Zap,
      description: '设置执行脚本和资源配置'
    },
    {
      id: 'permissions',
      title: '权限设置',
      icon: Users,
      description: '配置可见性和访问权限'
    }
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  const updateFormData = (section: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section as keyof typeof prev], ...data }
    }))
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 进度指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">
            {isNewApplication ? '创建新应用' : '编辑应用配置'}
          </h1>
          <Badge variant="outline">
            步骤 {currentStep + 1} / {steps.length}
          </Badge>
        </div>
        
        <Progress value={progress} className="h-2 mb-4" />
        
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const IconComponent = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center cursor-pointer ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}
                onClick={() => setCurrentStep(index)}
              >
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 ${
                  isActive 
                    ? 'border-blue-600 bg-blue-50' 
                    : isCompleted 
                    ? 'border-green-600 bg-green-50' 
                    : 'border-gray-300'
                }`}>
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <IconComponent className="h-5 w-5" />
                  )}
                </div>
                <span className="text-sm font-medium">{step.title}</span>
                <span className="text-xs text-center max-w-20">{step.description}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 步骤内容 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(steps[currentStep].icon, { className: "h-5 w-5" })}
            {steps[currentStep].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <BasicInfoStep 
              data={formData.metadata} 
              onUpdate={(data) => updateFormData('metadata', data)}
            />
          )}
          {currentStep === 1 && (
            <InterfaceStep 
              data={formData.interface} 
              onUpdate={(data) => updateFormData('interface', data)}
            />
          )}
          {currentStep === 2 && (
            <ExecutionStep 
              data={formData.execution} 
              onUpdate={(data) => updateFormData('execution', data)}
            />
          )}
          {currentStep === 3 && (
            <PermissionsStep 
              data={formData.visibility} 
              onUpdate={(data) => updateFormData('visibility', data)}
            />
          )}
        </CardContent>
      </Card>

      {/* 导航按钮 */}
      <div className="flex justify-between mt-6">
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              上一步
            </Button>
          )}
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
        </div>
        
        <div className="flex gap-2">
          {currentStep < steps.length - 1 ? (
            <Button onClick={nextStep}>
              下一步
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              保存应用
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// 基本信息步骤
function BasicInfoStep({ data, onUpdate }: { data: any, onUpdate: (data: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">应用名称 *</label>
          <Input
            value={data.name || ''}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="例如: matlab, abaqus"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">显示名称</label>
          <Input
            value={data.displayName || ''}
            onChange={(e) => onUpdate({ displayName: e.target.value })}
            placeholder="例如: MATLAB R2023a"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">版本 *</label>
          <Input
            value={data.version || ''}
            onChange={(e) => onUpdate({ version: e.target.value })}
            placeholder="例如: 2023.1.0"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">应用分类</label>
          <select
            value={data.category || ''}
            onChange={(e) => onUpdate({ category: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">选择分类</option>
            <option value="scientific-computing">科学计算</option>
            <option value="machine-learning">机器学习</option>
            <option value="bioinformatics">生物信息学</option>
            <option value="cad-cae">CAD/CAE</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium">应用描述</label>
        <textarea
          value={data.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="详细描述这个应用的功能和用途..."
        />
      </div>
    </div>
  )
}

// 界面配置步骤
function InterfaceStep({ data, onUpdate }: { data: any, onUpdate: (data: any) => void }) {
  const addField = () => {
    const newField = {
      name: `field_${Date.now()}`,
      label: '新字段',
      type: 'text',
      required: false
    }
    const updatedForm = [...(data.form || []), newField]
    onUpdate({ form: updatedForm })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">表单字段配置</h3>
        <Button onClick={addField} size="sm">
          添加字段
        </Button>
      </div>
      
      <div className="space-y-4">
        {(data.form || []).map((field: any, index: number) => (
          <TechCard key={index} className="p-4" hover>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="字段名"
                value={field.name}
                onChange={(e) => {
                  const updatedForm = [...data.form]
                  updatedForm[index] = { ...field, name: e.target.value }
                  onUpdate({ form: updatedForm })
                }}
              />
              <Input
                placeholder="显示标签"
                value={field.label}
                onChange={(e) => {
                  const updatedForm = [...data.form]
                  updatedForm[index] = { ...field, label: e.target.value }
                  onUpdate({ form: updatedForm })
                }}
              />
              <select
                value={field.type}
                onChange={(e) => {
                  const updatedForm = [...data.form]
                  updatedForm[index] = { ...field, type: e.target.value }
                  onUpdate({ form: updatedForm })
                }}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="text">文本</option>
                <option value="number">数字</option>
                <option value="select">下拉选择</option>
                <option value="file">文件</option>
              </select>
            </div>
          </TechCard>
        ))}
        
        {(!data.form || data.form.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            暂无表单字段，点击&ldquo;添加字段&rdquo;开始配置
          </div>
        )}
      </div>
    </div>
  )
}

// 执行配置步骤
function ExecutionStep({ data, onUpdate }: { data: any, onUpdate: (data: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium">执行脚本模板</label>
        <textarea
          value={data.templates?.[0]?.template || ''}
          onChange={(e) => {
            const template = {
              name: 'default',
              description: '默认执行模板',
              template: e.target.value
            }
            onUpdate({ templates: [template] })
          }}
          rows={12}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          placeholder={`#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --nodes={{nodes}}
#SBATCH --cpus-per-task={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}

# 加载环境模块
{{#modules}}
module load {{{.}}}
{{/modules}}

# 执行应用
echo "Starting application..."
# 在此添加具体的应用执行命令`}
        />
      </div>
    </div>
  )
}

// 权限设置步骤
function PermissionsStep({ data, onUpdate }: { data: any, onUpdate: (data: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <h4 className="font-medium">公开应用</h4>
          <p className="text-sm text-gray-600">所有用户都可以看到并使用此应用</p>
        </div>
        <input
          type="checkbox"
          checked={data?.isPublic !== false}
          onChange={(e) => onUpdate({ isPublic: e.target.checked })}
          className="rounded"
        />
      </div>
      
      {data?.isPublic === false && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">允许的用户</label>
            <Input
              placeholder="用户名列表，用逗号分隔"
              value={data?.allowedUsers?.join(', ') || ''}
              onChange={(e) => {
                const users = e.target.value.split(',').map(u => u.trim()).filter(Boolean)
                onUpdate({ allowedUsers: users })
              }}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">允许的部门</label>
            <Input
              placeholder="部门列表，用逗号分隔"
              value={data?.allowedDepartments?.join(', ') || ''}
              onChange={(e) => {
                const depts = e.target.value.split(',').map(d => d.trim()).filter(Boolean)
                onUpdate({ allowedDepartments: depts })
              }}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function createDefaultApplication(): HpcApplicationSpec {
  return {
    metadata: {
      name: '',
      version: '',
      description: '',
      category: ApplicationCategory.SCIENTIFIC_COMPUTING,
      type: [ApplicationType.BATCH],
      tags: [],
      author: '',
      license: ''
    },
    resources: {
      default: {
        name: 'default',
        nodes: 1,
        cpusPerTask: 1,
        memory: '8GB',
        walltime: '1:00:00',
        partition: 'compute'
      }
    },
    execution: {
      templates: []
    },
    interface: {
      form: []
    },
    requirements: {
      modules: [],
      software: [],
      containers: [],
      installPath: '',
      executablePath: '',
      pathDirs: [],
      environmentVars: {}
    },
    visibility: {
      isPublic: true,
      allowedUsers: [],
      allowedGroups: [],
      allowedDepartments: []
    }
  }
}