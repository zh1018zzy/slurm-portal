'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult 
} from '@hello-pangea/dnd'
import {
  Plus,
  Trash2,
  Menu as GripVertical,
  Eye,
  Settings as Code,
  Save,
  Copy,
  Settings,
  FileText,
  Archive as Hash,
  List,
  Upload,
  CheckSquare,
  Menu as MoreHorizontal
} from 'lucide-react'
import { FormField } from '@/lib/hpc-application-spec'

interface TemplateBuilderProps {
  formFields: FormField[]
  onFieldsChange: (fields: FormField[]) => void
  isPreviewMode?: boolean
  onPreviewToggle?: (isPreview: boolean) => void
}

export function TemplateBuilder({ 
  formFields, 
  onFieldsChange, 
  isPreviewMode = false,
  onPreviewToggle 
}: TemplateBuilderProps) {
  const [selectedField, setSelectedField] = useState<number | null>(null)
  const [fieldTemplates] = useState([
    { type: 'text', icon: FileText, label: '文本输入', color: 'blue' },
    { type: 'number', icon: Hash, label: '数字输入', color: 'green' },
    { type: 'textarea', icon: FileText, label: '多行文本', color: 'purple' },
    { type: 'select', icon: List, label: '下拉选择', color: 'orange' },
    { type: 'file', icon: Upload, label: '文件上传', color: 'red' },
    { type: 'boolean', icon: CheckSquare, label: '复选框', color: 'indigo' },
  ])

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(formFields)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    onFieldsChange(items)
  }

  const addField = (type: string) => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      label: `新${fieldTemplates.find(t => t.type === type)?.label || '字段'}`,
      type: type as FormField['type'],
      required: false,
      description: '',
      placeholder: ''
    }
    onFieldsChange([...formFields, newField])
    setSelectedField(formFields.length)
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...formFields]
    newFields[index] = { ...newFields[index], ...updates }
    onFieldsChange(newFields)
  }

  const removeField = (index: number) => {
    const newFields = formFields.filter((_, i) => i !== index)
    onFieldsChange(newFields)
    if (selectedField === index) setSelectedField(null)
  }

  const duplicateField = (index: number) => {
    const field = formFields[index]
    const duplicated = {
      ...field,
      name: `${field.name}_copy_${Date.now()}`,
      label: `${field.label} (副本)`
    }
    const newFields = [...formFields]
    newFields.splice(index + 1, 0, duplicated)
    onFieldsChange(newFields)
  }

  return (
    <div className="flex h-full">
      {/* 左侧：字段模板库 */}
      <div className="w-64 bg-gray-50 border-r p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">字段模板</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPreviewToggle?.(!isPreviewMode)}
            >
              {isPreviewMode ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {fieldTemplates.map((template) => {
              const IconComponent = template.icon
              return (
                <Button
                  key={template.type}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto p-3 hover:bg-white"
                  onClick={() => addField(template.type)}
                >
                  <IconComponent className={`h-4 w-4 mr-2 text-${template.color}-600`} />
                  <span className="text-xs">{template.label}</span>
                </Button>
              )
            })}
          </div>

          {/* 模板操作 */}
          <div className="pt-4 border-t space-y-2">
            <Button size="sm" variant="outline" className="w-full justify-start">
              <Save className="h-4 w-4 mr-2" />
              保存模板
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start">
              <Copy className="h-4 w-4 mr-2" />
              复制模板
            </Button>
          </div>
        </div>
      </div>

      {/* 中间：表单构建器 */}
      <div className="flex-1 p-6">
        {isPreviewMode ? (
          <FormPreview fields={formFields} />
        ) : (
          <FormBuilder 
            fields={formFields}
            selectedField={selectedField}
            onFieldSelect={setSelectedField}
            onDragEnd={handleDragEnd}
            onRemoveField={removeField}
            onDuplicateField={duplicateField}
          />
        )}
      </div>

      {/* 右侧：属性编辑器 */}
      {selectedField !== null && !isPreviewMode && (
        <div className="w-80 bg-gray-50 border-l p-4">
          <FieldEditor
            field={formFields[selectedField]}
            onUpdate={(updates) => updateField(selectedField, updates)}
            onClose={() => setSelectedField(null)}
          />
        </div>
      )}
    </div>
  )
}

// 表单构建器组件
function FormBuilder({ 
  fields, 
  selectedField, 
  onFieldSelect, 
  onDragEnd, 
  onRemoveField, 
  onDuplicateField 
}: {
  fields: FormField[]
  selectedField: number | null
  onFieldSelect: (index: number | null) => void
  onDragEnd: (result: DropResult) => void
  onRemoveField: (index: number) => void
  onDuplicateField: (index: number) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">表单设计器</h2>
        <Badge variant="secondary">
          {fields.length} 个字段
        </Badge>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="form-fields">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`min-h-32 space-y-3 ${
                snapshot.isDraggingOver ? 'bg-blue-50' : ''
              }`}
            >
              {fields.length === 0 ? (
                <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                  从左侧拖拽字段类型来构建表单
                </div>
              ) : (
                fields.map((field, index) => (
                  <Draggable key={index} draggableId={index.toString()} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${
                          selectedField === index 
                            ? 'ring-2 ring-blue-500 border-blue-300' 
                            : 'hover:shadow-md'
                        } ${
                          snapshot.isDragging ? 'shadow-lg rotate-3' : ''
                        } cursor-pointer transition-all duration-200`}
                        onClick={() => onFieldSelect(index)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div 
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                            >
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                  {field.label}
                                </span>
                                {field.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    必填
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {field.type}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 truncate">
                                {field.description || field.placeholder || '暂无描述'}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDuplicateField(index)
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onRemoveField(index)
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}

// 字段属性编辑器
function FieldEditor({ 
  field, 
  onUpdate, 
  onClose 
}: { 
  field: FormField
  onUpdate: (updates: Partial<FormField>) => void
  onClose: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">字段属性</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
          ×
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">字段标识</label>
          <Input
            value={field.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="mt-1"
            placeholder="fieldName"
          />
        </div>

        <div>
          <label className="text-sm font-medium">显示标签</label>
          <Input
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="mt-1"
            placeholder="字段标签"
          />
        </div>

        <div>
          <label className="text-sm font-medium">字段类型</label>
          <select
            value={field.type}
            onChange={(e) => onUpdate({ type: e.target.value as FormField['type'] })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
          <label className="text-sm font-medium">描述信息</label>
          <textarea
            value={field.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            rows={3}
            placeholder="字段的详细说明"
          />
        </div>

        <div>
          <label className="text-sm font-medium">占位符</label>
          <Input
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            className="mt-1"
            placeholder="输入提示"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">必填字段</label>
          <Switch
            checked={field.required || false}
            onCheckedChange={(checked) => onUpdate({ required: checked })}
          />
        </div>

        {/* 数字字段特有属性 */}
        {field.type === 'number' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">最小值</label>
                <Input
                  type="number"
                  value={field.min || ''}
                  onChange={(e) => onUpdate({ min: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">最大值</label>
                <Input
                  type="number"
                  value={field.max || ''}
                  onChange={(e) => onUpdate({ max: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* 选择字段特有属性 */}
        {field.type === 'select' && (
          <div>
            <label className="text-sm font-medium">选项配置</label>
            <textarea
              value={(field.options || []).map(opt => `${opt.value}:${opt.label}`).join('\n')}
              onChange={(e) => {
                const options = e.target.value.split('\n')
                  .filter(line => line.trim())
                  .map(line => {
                    const [value, label] = line.split(':')
                    return { 
                      value: value?.trim() || '', 
                      label: label?.trim() || value?.trim() || '' 
                    }
                  })
                onUpdate({ options })
              }}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              rows={4}
              placeholder="每行一个选项，格式: value:label"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// 表单预览组件
function FormPreview({ fields }: { fields: FormField[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">表单预览</h2>
        <Badge variant="outline">预览模式</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>应用提交表单</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无表单字段
            </div>
          ) : (
            fields.map((field, index) => (
              <div key={index} className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                
                {field.type === 'text' && (
                  <Input placeholder={field.placeholder} disabled />
                )}
                
                {field.type === 'number' && (
                  <Input 
                    type="number" 
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    disabled 
                  />
                )}
                
                {field.type === 'textarea' && (
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder={field.placeholder}
                    rows={3}
                    disabled
                  />
                )}
                
                {field.type === 'select' && (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    disabled
                  >
                    <option value="">请选择...</option>
                    {(field.options || []).map((option, optIndex) => (
                      <option key={optIndex} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                
                {field.type === 'file' && (
                  <Input type="file" disabled />
                )}
                
                {field.type === 'boolean' && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" disabled />
                    <span className="text-sm">{field.description || field.placeholder}</span>
                  </div>
                )}
                
                {field.description && field.type !== 'boolean' && (
                  <p className="text-xs text-gray-600">{field.description}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}