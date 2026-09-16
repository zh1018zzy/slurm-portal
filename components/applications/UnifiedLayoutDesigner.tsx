'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TechCard } from '@/components/ui/tech-card'
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
  RotateCcw,
  Edit,
  Eye
} from 'lucide-react'
import { HpcApplicationSpec } from '@/lib/hpc-application-spec'
import { FormLayoutSpec, FormSection, generateDefaultLayout } from '@/lib/simple-form-layout'
import { SimpleForm } from './SimpleForm'

interface UnifiedLayoutDesignerProps {
  application: HpcApplicationSpec
  onFieldsChange: (fields: any[]) => void
  onLayoutChange?: (layout: FormLayoutSpec) => void
  mode: 'view' | 'edit'
}

export function UnifiedLayoutDesigner({
  application,
  onFieldsChange,
  onLayoutChange,
  mode
}: UnifiedLayoutDesignerProps) {
  const [layout, setLayout] = useState<FormLayoutSpec>(() => {
    if (application.interface.layout) {
      // 检查是否是新的简化格式
      if (application.interface.layout.sections && Array.isArray(application.interface.layout.sections)) {
        const firstSection = application.interface.layout.sections[0]
        if (firstSection && Array.isArray(firstSection.fields)) {
          return application.interface.layout as FormLayoutSpec
        }
      }
    }
    // 如果没有初始布局或格式不兼容，生成默认布局
    return generateDefaultLayout(application.interface.form || [])
  })
  
  const [activeTab, setActiveTab] = useState('design')
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  // 未分配的字段
  const assignedFields = new Set(
    layout.sections.flatMap(section => section.fields)
  )
  const unassignedFields = application.interface.form.filter(
    field => !assignedFields.has(field.name)
  )

  // 更新布局并通知父组件
  const updateLayout = (newLayout: FormLayoutSpec) => {
    setLayout(newLayout)
    if (onLayoutChange) {
      onLayoutChange(newLayout)
    }
  }

  // 添加新字段
  const addField = () => {
    const newField = {
      name: `field_${Date.now()}`,
      label: '新字段',
      type: 'text' as const,
      required: false,
      description: '',
      placeholder: ''
    }
    
    const newFields = [...application.interface.form, newField]
    onFieldsChange(newFields)
    
    // 将新字段添加到第一个区域
    if (layout.sections.length > 0) {
      const newLayout = {
        ...layout,
        sections: layout.sections.map((section, index) =>
          index === 0 
            ? { ...section, fields: [...section.fields, newField.name] }
            : section
        )
      }
      updateLayout(newLayout)
    }
  }

  // 删除字段
  const deleteField = (fieldName: string) => {
    const newFields = application.interface.form.filter(f => f.name !== fieldName)
    onFieldsChange(newFields)
    
    // 从所有区域中移除该字段
    const newLayout = {
      ...layout,
      sections: layout.sections.map(section => ({
        ...section,
        fields: section.fields.filter(f => f !== fieldName)
      }))
    }
    updateLayout(newLayout)
    
    if (selectedField === fieldName) {
      setSelectedField(null)
    }
  }

  // 更新字段
  const updateField = (fieldName: string, updates: any) => {
    const newFields = application.interface.form.map(field =>
      field.name === fieldName ? { ...field, ...updates } : field
    )
    onFieldsChange(newFields)
    
    // 如果更新了字段名，需要更新布局中的引用
    if (updates.name && updates.name !== fieldName) {
      const newLayout = {
        ...layout,
        sections: layout.sections.map(section => ({
          ...section,
          fields: section.fields.map(f => f === fieldName ? updates.name : f)
        }))
      }
      updateLayout(newLayout)
      setSelectedField(updates.name)
    }
  }

  // 添加新区域
  const addSection = () => {
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      title: '新区域',
      description: '',
      fields: [],
      order: layout.sections.length + 1
    }
    
    updateLayout({
      ...layout,
      sections: [...layout.sections, newSection]
    })
  }

  // 删除区域
  const deleteSection = (sectionId: string) => {
    updateLayout({
      ...layout,
      sections: layout.sections.filter(s => s.id !== sectionId)
    })
    
    if (selectedSection === sectionId) {
      setSelectedSection(null)
    }
  }

  // 更新区域
  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    updateLayout({
      ...layout,
      sections: layout.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    })
  }

  // 添加字段到区域
  const addFieldToSection = (sectionId: string, fieldName: string) => {
    updateLayout({
      ...layout,
      sections: layout.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: [...section.fields, fieldName] }
          : { ...section, fields: section.fields.filter(f => f !== fieldName) } // 从其他区域移除
      )
    })
  }

  // 从区域中移除字段
  const removeFieldFromSection = (sectionId: string, fieldName: string) => {
    updateLayout({
      ...layout,
      sections: layout.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: section.fields.filter(f => f !== fieldName) }
          : section
      )
    })
  }

  // 重置到默认布局
  const resetToDefault = () => {
    const defaultLayout = generateDefaultLayout(application.interface.form || [])
    updateLayout(defaultLayout)
    setSelectedField(null)
    setSelectedSection(null)
  }

  if (mode === 'view') {
    return (
      <TechCard className="h-full" hover>
        <CardHeader>
          <CardTitle>表单预览</CardTitle>
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
      </TechCard>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">统一界面设计器</h2>
          
          {/* Tab 切换 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-4 py-2 rounded text-sm transition-colors ${
                activeTab === 'design' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('design')}
            >
              设计
            </button>
            <button
              className={`px-4 py-2 rounded text-sm transition-colors ${
                activeTab === 'preview' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('preview')}
            >
              预览
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addField}>
            <Plus className="w-4 h-4 mr-1" />
            新增字段
          </Button>
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RotateCcw className="w-4 h-4 mr-1" />
            重置布局
          </Button>
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'design' ? renderDesignTab() : renderPreviewTab()}
      </div>
    </div>
  )

  // 渲染设计标签页
  function renderDesignTab() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 h-full">
        {/* 左侧：字段库和分组管理 */}
        <div className="space-y-4">
          {/* 所有字段列表 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">字段库</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {application.interface.form.map(field => (
                <div 
                  key={field.name}
                  className={`
                    p-2 border rounded cursor-pointer text-sm transition-colors
                    ${selectedField === field.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                    ${!assignedFields.has(field.name) ? 'bg-yellow-50 border-yellow-300' : ''}
                  `}
                  onClick={() => setSelectedField(field.name)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', field.name)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{field.label || field.name}</div>
                      <div className="text-xs text-gray-500">{field.type}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteField(field.name)
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {!assignedFields.has(field.name) && (
                    <div className="text-xs text-yellow-600 mt-1">未分配到区域</div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 区域管理 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">表单区域</CardTitle>
                <Button size="sm" onClick={addSection}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {layout.sections
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(section => (
                <div 
                  key={section.id}
                  className={`
                    p-2 border rounded cursor-pointer text-sm transition-colors
                    ${selectedSection === section.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                  `}
                  onClick={() => setSelectedSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Menu className="w-3 h-3 text-gray-400" />
                      <span className="font-medium">{section.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs px-1">
                        {section.fields.length}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSection(section.id)
                        }}
                        className="h-5 w-5 p-0"
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
        </div>

        {/* 右侧：编辑器 - 现在占用更多空间 */}
        <div className="lg:col-span-2 space-y-4">
          {selectedField ? renderFieldEditor() : selectedSection ? renderSectionEditor() : renderWelcome()}
        </div>
      </div>
    )
  }

  // 渲染预览标签页
  function renderPreviewTab() {
    return (
      <div className="p-6 h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <h3 className="text-lg font-semibold mb-2">表单预览</h3>
            <p className="text-gray-600">这是用户在提交作业时看到的界面效果</p>
          </div>
          
          <SimpleForm
            application={application}
            layout={layout}
            onSubmit={() => {}}
            isSubmitting={false}
          />
        </div>
      </div>
    )
  }

  // 渲染字段编辑器
  function renderFieldEditor() {
    const field = application.interface.form.find(f => f.name === selectedField)
    if (!field) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Edit className="w-4 h-4" />
            编辑字段: {field.label || field.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 基本属性 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>字段名称</Label>
              <Input
                value={field.name}
                onChange={(e) => updateField(field.name, { name: e.target.value })}
                placeholder="field_name"
              />
            </div>
            <div>
              <Label>显示标签</Label>
              <Input
                value={field.label || ''}
                onChange={(e) => updateField(field.name, { label: e.target.value })}
                placeholder="显示名称"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>字段类型</Label>
              <select
                value={field.type}
                onChange={(e) => updateField(field.name, { type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="text">文本输入</option>
                <option value="number">数字输入</option>
                <option value="textarea">多行文本</option>
                <option value="select">下拉选择</option>
                <option value="file">文件上传</option>
                <option value="checkbox">复选框</option>
              </select>
            </div>
            <div>
              <Label>默认值</Label>
              <Input
                value={field.default || ''}
                onChange={(e) => updateField(field.name, { default: e.target.value })}
                placeholder="默认值"
              />
            </div>
          </div>

          <div>
            <Label>占位符</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => updateField(field.name, { placeholder: e.target.value })}
              placeholder="输入提示"
            />
          </div>

          <div>
            <Label>描述说明</Label>
            <textarea
              value={field.description || ''}
              onChange={(e) => updateField(field.name, { description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="字段的详细说明"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.required || false}
                onChange={(e) => updateField(field.name, { required: e.target.checked })}
              />
              必填字段
            </label>

            {field.type === 'number' && (
              <>
                <div>
                  <Label className="text-xs">最小值</Label>
                  <Input
                    type="number"
                    value={field.min || ''}
                    onChange={(e) => updateField(field.name, { min: Number(e.target.value) })}
                    className="w-16"
                  />
                </div>
                <div>
                  <Label className="text-xs">最大值</Label>
                  <Input
                    type="number"
                    value={field.max || ''}
                    onChange={(e) => updateField(field.name, { max: Number(e.target.value) })}
                    className="w-16"
                  />
                </div>
              </>
            )}
          </div>

          {field.type === 'select' && (
            <div>
              <Label>选项配置</Label>
              <textarea
                value={(field.options || []).map(opt => `${opt.value}:${opt.label}`).join('\n')}
                onChange={(e) => {
                  const options = e.target.value.split('\n')
                    .filter(line => line.trim())
                    .map(line => {
                      const [value, label] = line.split(':')
                      return { value: value?.trim() || '', label: label?.trim() || value?.trim() || '' }
                    })
                  updateField(field.name, { options })
                }}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                placeholder="每行一个选项，格式: value:label&#10;例如:&#10;option1:选项1&#10;option2:选项2"
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // 渲染区域编辑器
  function renderSectionEditor() {
    const section = layout.sections.find(s => s.id === selectedSection)
    if (!section) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">编辑区域: {section.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 区域基本设置 */}
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

          {/* 字段拖拽区域 */}
          <div className="space-y-3">
            <Label>包含的字段</Label>
            
            <div 
              className="min-h-[120px] border-2 border-dashed border-gray-300 rounded-lg p-3 space-y-2"
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
                <div className="text-center text-gray-500 py-6">
                  <p className="text-sm">拖拽字段到这里或点击字段添加</p>
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
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
            
            {/* 快速添加字段 */}
            <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
              {application.interface.form
                .filter(field => !section.fields.includes(field.name))
                .map(field => (
                  <button
                    key={field.name}
                    className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm flex items-center justify-between"
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

  // 渲染欢迎界面
  function renderWelcome() {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">统一界面设计器</h3>
            <p className="text-gray-600 mb-4">选择左侧的字段或区域开始编辑</p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• 点击字段可编辑其属性</p>
              <p>• 点击区域可管理字段分组</p>
              <p>• 拖拽字段到区域进行分组</p>
              <p>• 右侧实时预览界面效果</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
}