'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton } from '@/components/ui/primary-button'
import { Play } from 'lucide-react'
import { HpcApplicationSpec } from '@/lib/hpc-application-spec'
import { FormLayoutSpec, generateDefaultLayout } from '@/lib/simple-form-layout'
import { useTranslations } from 'next-intl'
import { getFieldText, getOptionText } from '@/lib/i18n-utils'

interface SimpleFormProps {
  application: HpcApplicationSpec
  layout?: FormLayoutSpec | any // Allow old format
  onSubmit: (data: any) => void
  isSubmitting?: boolean
}

export function SimpleForm({
  application,
  layout: customLayout,
  onSubmit,
  isSubmitting = false
}: SimpleFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})

  // 翻译函数
  const t = useTranslations()
  const tCommon = useTranslations('common')

  // 生成或使用自定义布局，处理旧格式兼容性
  const layout = useMemo(() => {
    if (customLayout) {
      // 检查是否是新的简化格式
      if (customLayout.sections && Array.isArray(customLayout.sections)) {
        // 检查 sections 是否有 fields 属性（新格式）
        const firstSection = customLayout.sections[0]
        if (firstSection && Array.isArray(firstSection.fields)) {
          return customLayout as FormLayoutSpec
        }
      }
    }
    // 如果没有自定义布局或格式不兼容，生成默认布局
    return generateDefaultLayout(application.interface.form || [])
  }, [customLayout, application.interface.form])

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

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 检查是否有文件需要上传
    const hasFiles = application.interface.form.some(field => 
      field.type === 'file' && formData[field.name]
    )
    
    if (hasFiles) {
      const formDataObj = new FormData()
      for (const [key, value] of Object.entries(formData)) {
        if (value instanceof File) {
          formDataObj.append(key, value)
        } else if (Array.isArray(value) && value.every(v => v instanceof File)) {
          value.forEach((file: File) => {
            formDataObj.append(key, file)
          })
        } else {
          formDataObj.append(key, String(value))
        }
      }
      onSubmit(formDataObj)
    } else {
      onSubmit(formData)
    }
  }

  // 渲染单个字段
  const renderField = (field: any) => {
    // 获取字段的显示文本,优先使用翻译键
    const label = getFieldText(field, 'label', t)
    const description = getFieldText(field, 'description', t)
    const placeholder = getFieldText(field, 'placeholder', t)

    return (
      <div key={field.name} className="space-y-2">
        <label className="text-sm font-medium">
          {label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.type === 'text' && (
          <input
            type="text"
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={field.required}
          />
        )}

        {field.type === 'textarea' && (
          <textarea
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={placeholder}
            rows={field.rows || 3}
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
            <option value="">{tCommon('select') || '选择...'}</option>
            {field.options.map((option: any) => (
              <option key={option.value} value={option.value}>
                {getOptionText(option, 'label', t)}
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
          <input
            type="file"
            accept={field.accept?.join(',') || '*'}
            multiple={field.multiple || false}
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              if (field.multiple) {
                handleFieldChange(field.name, files)
              } else {
                handleFieldChange(field.name, files[0] || null)
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={field.required}
          />
        )}

        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 应用信息头部 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {application.metadata.displayName || application.metadata.name}
                <Badge variant="outline">{application.metadata.version}</Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                {getFieldText(application.metadata, 'description', t)}
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

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 区域布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {layout.sections
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(section => (
            <TechCard key={section.id} hover>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {section.fields.map(fieldName => {
                  const field = application.interface.form.find(f => f.name === fieldName)
                  if (!field) return null
                  return renderField(field)
                })}
              </CardContent>
            </TechCard>
          ))}
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-end">
          <PrimaryButton type="submit" disabled={isSubmitting} loading={isSubmitting} icon={<Play className="w-4 h-4" />} iconPosition="left">
            {isSubmitting ? (tCommon('submitting') || '提交中...') : (tCommon('submit') || '提交作业')}
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}