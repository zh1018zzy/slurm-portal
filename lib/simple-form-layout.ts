/**
 * 简化的表单布局规范
 * 专注于区域和字段的自定义
 */

export interface FormLayoutSpec {
  /** 区域列表 */
  sections: FormSection[]
}

export interface FormSection {
  /** 区域唯一标识 */
  id: string
  
  /** 区域标题 */
  title: string
  
  /** 区域描述 */
  description?: string
  
  /** 包含的字段名称列表 */
  fields: string[]
  
  /** 排序权重 */
  order?: number
}

/** 生成默认的两区域布局 - 用户可自定义分组 */
export function generateDefaultLayout(fields: any[]): FormLayoutSpec {
  // 将所有字段默认放到第一个分组中，让用户自己分配
  const allFieldNames = fields.map(field => field.name)
  
  return {
    sections: [
      {
        id: 'basic-config',
        title: '基本配置',
        description: '配置应用的基本参数',
        fields: allFieldNames, // 默认所有字段都在第一个分组
        order: 1
      },
      {
        id: 'advanced-config', 
        title: '高级配置',
        description: '高级选项和资源配置',
        fields: [], // 第二个分组默认为空，用户可以拖拽字段过来
        order: 2
      }
    ]
  }
}