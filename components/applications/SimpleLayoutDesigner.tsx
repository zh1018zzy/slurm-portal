'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Trash2, 
  Menu,
  Settings,
  Save,
  RotateCcw
} from 'lucide-react'
import { HpcApplicationSpec } from '@/lib/hpc-application-spec'
import { FormLayoutSpec, FormSection, generateDefaultLayout } from '@/lib/simple-form-layout'
import { SimpleForm } from './SimpleForm'

interface SimpleLayoutDesignerProps {
  application: HpcApplicationSpec
  initialLayout?: FormLayoutSpec | any // Allow old format compatibility
  onSave: (layout: FormLayoutSpec) => void
  onCancel: () => void
}

export function SimpleLayoutDesigner({
  application,
  initialLayout,
  onSave,
  onCancel
}: SimpleLayoutDesignerProps) {
  const [layout, setLayout] = useState<FormLayoutSpec>(() => {
    if (initialLayout) {
      // 检查是否是新的简化格式
      if (initialLayout.sections && Array.isArray(initialLayout.sections)) {
        // 检查 sections 是否有 fields 属性（新格式）
        const firstSection = initialLayout.sections[0]
        if (firstSection && Array.isArray(firstSection.fields)) {
          return initialLayout as FormLayoutSpec
        }
      }
    }
    // 如果没有初始布局或格式不兼容，生成默认布局
    return generateDefaultLayout(application.interface.form || [])
  })
  
  const [activeTab, setActiveTab] = useState('design')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  // 未分配的字段
  const assignedFields = new Set(
    layout.sections.flatMap(section => section.fields)
  )
  const unassignedFields = application.interface.form.filter(
    field => !assignedFields.has(field.name)
  )

  // 添加新区域
  const addSection = () => {
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      title: '新区域',
      description: '',
      fields: [],
      order: layout.sections.length + 1
    }
    
    setLayout(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }))
  }

  // 删除区域
  const deleteSection = (sectionId: string) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }))
    
    if (selectedSection === sectionId) {
      setSelectedSection(null)
    }
  }

  // 更新区域
  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }))
  }

  // 添加字段到区域
  const addFieldToSection = (sectionId: string, fieldName: string) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: [...section.fields, fieldName] }
          : section
      )
    }))
  }

  // 从区域中移除字段
  const removeFieldFromSection = (sectionId: string, fieldName: string) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: section.fields.filter(f => f !== fieldName) }
          : section
      )
    }))
  }

  // 重置到默认布局
  const resetToDefault = () => {
    const defaultLayout = generateDefaultLayout(application.interface.form || [])
    setLayout(defaultLayout)
    setSelectedSection(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-bold">表单布局设计器</h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-3 py-1 rounded text-sm ${activeTab === 'design' ? 'bg-white shadow' : ''}`}
              onClick={() => setActiveTab('design')}
            >
              设计
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${activeTab === 'preview' ? 'bg-white shadow' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              预览
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button onClick={() => onSave(layout)}>
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 p-4">
        {activeTab === 'design' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* 左侧：区域列表 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">表单区域</CardTitle>
                    <Button size="sm" onClick={addSection}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {layout.sections
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map(section => (
                    <div 
                      key={section.id}
                      className={`
                        p-3 border rounded cursor-pointer transition-colors
                        ${selectedSection === section.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                      `}
                      onClick={() => setSelectedSection(section.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Menu className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-sm">{section.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {section.fields.length} 字段
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSection(section.id)
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {section.description && (
                        <p className="text-xs text-gray-600 mt-1">{section.description}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 未分配字段 */}
              {unassignedFields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">未分配字段</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {unassignedFields.map(field => (
                      <div 
                        key={field.name}
                        className="flex items-center justify-between p-2 border rounded bg-yellow-50 border-yellow-200"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', field.name)
                        }}
                      >
                        <span className="text-sm">{field.label || field.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 中间：区域编辑器 */}
            <div className="space-y-6">
              {selectedSection ? (
                renderSectionEditor(layout.sections.find(s => s.id === selectedSection)!)
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Settings className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">请选择一个区域进行编辑</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 右侧：预览 */}
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">实时预览</CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[500px]">
                  <div className="scale-75 origin-top">
                    <SimpleForm
                      application={application}
                      layout={layout}
                      onSubmit={() => {}}
                      isSubmitting={false}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* 预览标签页 */
          <Card className="h-full">
            <CardHeader>
              <CardTitle>完整预览</CardTitle>
              <CardDescription>
                这是用户在提交作业时看到的界面效果
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <SimpleForm
                application={application}
                layout={layout}
                onSubmit={() => {}}
                isSubmitting={false}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )

  // 渲染区域编辑器
  function renderSectionEditor(section: FormSection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">编辑区域: {section.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 基本设置 */}
          <div className="space-y-3">
            <div>
              <Label>区域标题</Label>
              <Input
                value={section.title}
                onChange={(e) => updateSection(section.id, { title: e.target.value })}
              />
            </div>
            
            <div>
              <Label>区域描述</Label>
              <Input
                value={section.description || ''}
                onChange={(e) => updateSection(section.id, { description: e.target.value })}
              />
            </div>
          </div>

          {/* 字段管理 */}
          <div className="space-y-3">
            <Label>包含的字段</Label>
            
            {/* 当前字段列表 */}
            <div 
              className="min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg p-3 space-y-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const fieldName = e.dataTransfer.getData('text/plain')
                if (fieldName && !section.fields.includes(fieldName)) {
                  addFieldToSection(section.id, fieldName)
                }
              }}
            >
              {section.fields.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  <p className="text-sm">拖拽字段到这里</p>
                </div>
              ) : (
                section.fields.map(fieldName => {
                  const field = application.interface.form.find(f => f.name === fieldName)
                  return (
                    <div key={fieldName} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Menu className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{field?.label || fieldName}</span>
                        <Badge variant="outline" className="text-xs">
                          {field?.type}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFieldFromSection(section.id, fieldName)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
            
            {/* 可用字段选择 */}
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded p-2">
              {application.interface.form
                .filter(field => !section.fields.includes(field.name))
                .map(field => (
                  <button
                    key={field.name}
                    className="text-left p-2 hover:bg-gray-100 rounded text-sm flex items-center justify-between"
                    onClick={() => addFieldToSection(section.id, field.name)}
                  >
                    <span>{field.label || field.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                  </button>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
}