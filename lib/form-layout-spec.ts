/**
 * 表单布局规范
 * 用于定制化应用界面的表单布局
 */

export interface FormLayoutSpec {
  /** 布局模式 */
  mode: 'single-column' | 'two-column' | 'tabs' | 'accordion' | 'wizard' | 'custom'
  
  /** 表单区域定义 */
  sections: FormSection[]
  
  /** 全局布局配置 */
  config?: {
    /** 响应式断点 */
    breakpoints?: {
      sm?: number
      md?: number
      lg?: number
    }
    /** 默认列数 */
    defaultColumns?: number
    /** 区域间距 */
    spacing?: 'compact' | 'normal' | 'relaxed'
    /** 是否显示区域边框 */
    showSectionBorder?: boolean
  }
}

export interface FormSection {
  /** 区域唯一标识 */
  id: string
  
  /** 区域标题 */
  title: string
  
  /** 区域描述 */
  description?: string
  
  /** 区域图标 */
  icon?: string
  
  /** 区域类型 */
  type: 'card' | 'fieldset' | 'tab' | 'accordion-item' | 'step'
  
  /** 布局配置 */
  layout: {
    /** 列数 */
    columns?: number
    /** 字段排列方向 */
    direction?: 'row' | 'column'
    /** 是否可折叠 */
    collapsible?: boolean
    /** 默认展开状态 */
    defaultExpanded?: boolean
  }
  
  /** 包含的字段组 */
  fieldGroups: FormFieldGroup[]
  
  /** 显示条件 */
  condition?: {
    field: string
    operator: 'equals' | 'not-equals' | 'includes' | 'not-includes'
    value: any
  }
  
  /** 排序权重 */
  order?: number
}

export interface FormFieldGroup {
  /** 字段组唯一标识 */
  id: string
  
  /** 字段组标题 */
  title?: string
  
  /** 字段组描述 */
  description?: string
  
  /** 布局配置 */
  layout: {
    /** 字段排列方式 */
    arrangement: 'horizontal' | 'vertical' | 'grid'
    /** 网格列数（仅grid模式） */
    gridColumns?: number
    /** 字段间距 */
    gap?: 'sm' | 'md' | 'lg'
    /** 字段宽度配置 */
    fieldWidths?: Record<string, 'auto' | 'full' | 'half' | 'quarter' | 'three-quarters'>
  }
  
  /** 包含的字段名称列表 */
  fields: string[]
  
  /** 显示条件 */
  condition?: {
    field: string
    operator: 'equals' | 'not-equals' | 'includes' | 'not-includes'
    value: any
  }
  
  /** 排序权重 */
  order?: number
}

/** 预设布局模板 */
export const LAYOUT_TEMPLATES = {
  /** 传统两列布局 */
  'two-column': {
    mode: 'two-column' as const,
    sections: [
      {
        id: 'job-config',
        title: '作业配置',
        description: '配置作业的输入参数和运行选项',
        type: 'card' as const,
        layout: { columns: 1 },
        fieldGroups: [
          {
            id: 'basic-params',
            layout: { arrangement: 'vertical' as const },
            fields: [] // 动态填充
          }
        ]
      },
      {
        id: 'resource-config', 
        title: '计算资源配置',
        description: '配置作业所需的计算资源',
        type: 'card' as const,
        layout: { columns: 1 },
        fieldGroups: [
          {
            id: 'compute-resources',
            layout: { arrangement: 'vertical' as const },
            fields: [] // 动态填充
          }
        ]
      }
    ]
  },
  
  /** 标签页布局 */
  'tabs': {
    mode: 'tabs' as const,
    sections: [
      {
        id: 'basic-tab',
        title: '基本配置',
        type: 'tab' as const,
        layout: { columns: 2 },
        fieldGroups: [
          {
            id: 'job-info',
            title: '作业信息',
            layout: { arrangement: 'vertical' as const },
            fields: []
          }
        ]
      },
      {
        id: 'advanced-tab',
        title: '高级配置', 
        type: 'tab' as const,
        layout: { columns: 1 },
        fieldGroups: [
          {
            id: 'advanced-params',
            layout: { arrangement: 'vertical' as const },
            fields: []
          }
        ]
      },
      {
        id: 'resources-tab',
        title: '计算资源',
        type: 'tab' as const,
        layout: { columns: 2 },
        fieldGroups: [
          {
            id: 'compute-resources',
            layout: { arrangement: 'grid' as const, gridColumns: 2 },
            fields: []
          }
        ]
      }
    ]
  },
  
  /** 向导式布局 */
  'wizard': {
    mode: 'wizard' as const,
    sections: [
      {
        id: 'step-1',
        title: '作业基本信息',
        type: 'step' as const,
        layout: { columns: 1 },
        fieldGroups: [
          {
            id: 'basic-info',
            layout: { arrangement: 'vertical' as const },
            fields: []
          }
        ]
      },
      {
        id: 'step-2', 
        title: '输入参数配置',
        type: 'step' as const,
        layout: { columns: 1 },
        fieldGroups: [
          {
            id: 'input-params',
            layout: { arrangement: 'vertical' as const },
            fields: []
          }
        ]
      },
      {
        id: 'step-3',
        title: '资源配置',
        type: 'step' as const,
        layout: { columns: 2 },
        fieldGroups: [
          {
            id: 'compute-resources',
            layout: { arrangement: 'grid' as const, gridColumns: 2 },
            fields: []
          }
        ]
      }
    ]
  },
  
  /** 手风琴布局 */
  'accordion': {
    mode: 'accordion' as const,
    sections: [
      {
        id: 'basic-section',
        title: '基本配置',
        type: 'accordion-item' as const,
        layout: { defaultExpanded: true },
        fieldGroups: [
          {
            id: 'basic-fields',
            layout: { arrangement: 'vertical' as const },
            fields: []
          }
        ]
      },
      {
        id: 'advanced-section',
        title: '高级配置',
        type: 'accordion-item' as const,
        layout: { defaultExpanded: false },
        fieldGroups: [
          {
            id: 'advanced-fields', 
            layout: { arrangement: 'vertical' as const },
            fields: []
          }
        ]
      },
      {
        id: 'resources-section',
        title: '计算资源',
        type: 'accordion-item' as const,
        layout: { defaultExpanded: true },
        fieldGroups: [
          {
            id: 'resource-fields',
            layout: { arrangement: 'grid' as const, gridColumns: 2 },
            fields: []
          }
        ]
      }
    ]
  }
} as const

/** 字段分类规则 */
export const FIELD_CATEGORIES = {
  'job': {
    name: '作业配置',
    description: '作业基本信息和运行参数',
    icon: 'Settings',
    keywords: ['job', 'name', 'script', 'input', 'output', 'params', 'analysis', 'data']
  },
  'resource': {
    name: '计算资源',
    description: '计算资源分配和调度参数', 
    icon: 'Cpu',
    keywords: ['partition', 'cpu', 'memory', 'walltime', 'node', 'gpu', 'queue']
  },
  'advanced': {
    name: '高级配置',
    description: '高级参数和专业配置',
    icon: 'Settings',
    keywords: ['advanced', 'expert', 'config', 'environment', 'module']
  },
  'io': {
    name: '输入输出',
    description: '文件输入输出配置',
    icon: 'Upload',
    keywords: ['file', 'input', 'output', 'data', 'upload', 'download']
  }
} as const

/** 自动字段分类函数 */
export function autoClassifyField(fieldName: string, fieldLabel?: string): keyof typeof FIELD_CATEGORIES {
  const text = `${fieldName} ${fieldLabel || ''}`.toLowerCase()
  
  for (const [category, config] of Object.entries(FIELD_CATEGORIES)) {
    if (config.keywords.some(keyword => text.includes(keyword))) {
      return category as keyof typeof FIELD_CATEGORIES
    }
  }
  
  return 'job' // 默认分类
}

/** 根据字段生成默认布局 */
export function generateDefaultLayout(fields: any[], template: keyof typeof LAYOUT_TEMPLATES | FormLayoutSpec['mode'] = 'two-column'): FormLayoutSpec {
  // 如果模板不在预定义模板中，则使用默认的两列布局
  const templateKey = (template in LAYOUT_TEMPLATES) ? template as keyof typeof LAYOUT_TEMPLATES : 'two-column'
  const layoutTemplate = LAYOUT_TEMPLATES[templateKey]
  const layout = JSON.parse(JSON.stringify(layoutTemplate)) as FormLayoutSpec
  
  // 更新实际的布局模式
  if (template !== templateKey) {
    layout.mode = template as FormLayoutSpec['mode']
  }
  
  // 按分类分组字段
  const fieldsByCategory = fields.reduce((acc, field) => {
    const category = autoClassifyField(field.name, field.label)
    if (!acc[category]) acc[category] = []
    acc[category].push(field.name)
    return acc
  }, {} as Record<string, string[]>)
  
  // 根据模板类型分配字段
  if (template === 'two-column') {
    // 第一列：作业配置
    const jobSection = layout.sections.find(s => s.id === 'job-config')
    if (jobSection) {
      jobSection.fieldGroups[0].fields = [
        ...(fieldsByCategory.job || []),
        ...(fieldsByCategory.io || []),
        ...(fieldsByCategory.advanced || [])
      ]
    }
    
    // 第二列：计算资源
    const resourceSection = layout.sections.find(s => s.id === 'resource-config')
    if (resourceSection) {
      resourceSection.fieldGroups[0].fields = fieldsByCategory.resource || []
    }
  }
  
  return layout
}