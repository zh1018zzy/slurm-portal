# 表单布局定制化系统使用指南

> 适用范围：研发流程、开发约定、本地开发与协作规范
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

HPC应用管理系统现在支持完全可定制化的表单布局设计，管理员可以：

- 创建多种布局模式（两列、标签页、向导、手风琴等）
- 可视化拖拽设计表单区域和字段分组
- 自动字段分类和智能布局推荐
- 实时预览和响应式设计

## 功能特性

### 1. 多种布局模式

#### 两列布局（推荐）
- **左列**：作业配置 - 应用特定参数、输入输出文件
- **右列**：计算资源配置 - CPU、内存、分区、运行时间
- **优点**：符合用户习惯，清晰分离关注点

#### 标签页布局
- **基本配置**：常用参数
- **高级配置**：专业参数
- **计算资源**：资源分配
- **优点**：节省空间，分层清晰

#### 向导布局
- **步骤1**：作业基本信息
- **步骤2**：输入参数配置  
- **步骤3**：资源配置
- **优点**：引导用户，适合复杂应用

#### 手风琴布局
- 可折叠的区域
- 默认展开重要区域
- **优点**：灵活展示，适合字段较多的应用

### 2. 智能字段分类

系统会自动根据字段名称和标签进行分类：

- **作业配置** (`job`): 包含 job, name, script, input, output, params, analysis, data 等关键词
- **计算资源** (`resource`): 包含 partition, cpu, memory, walltime, node, gpu, queue 等关键词  
- **高级配置** (`advanced`): 包含 advanced, expert, config, environment, module 等关键词
- **输入输出** (`io`): 包含 file, input, output, data, upload, download 等关键词

### 3. 可视化设计器

提供完整的可视化界面：
- **区域管理**：添加、删除、配置表单区域
- **字段分组**：灵活的字段分组和排列
- **实时预览**：所见即所得的布局预览
- **模板应用**：快速应用预设布局模板

## 使用方法

### 1. 访问布局设计器

1. 进入 **系统管理 → 应用管理**
2. 选择要编辑的应用
3. 点击 **"布局设计器"** 按钮

### 2. 设计表单布局

#### 基本操作流程：

1. **选择布局模式**
   - 在左侧面板选择合适的布局模式
   - 系统会自动分配字段到相应区域

2. **配置表单区域**  
   - 点击区域进行编辑
   - 设置区域标题、描述和图标
   - 调整区域的列数和排列方式

3. **管理字段分组**
   - 在区域中创建字段组
   - 拖拽字段到不同分组
   - 设置字段的排列和宽度

4. **实时预览**
   - 切换到 "预览" 标签查看效果
   - 测试不同屏幕尺寸的响应式显示

5. **保存布局**
   - 确认布局无误后点击 "保存布局"
   - 系统会将布局配置存储到应用规范中

### 3. 布局配置示例

#### 生信应用（R语言分析）- 标签页布局

```typescript
{
  mode: 'tabs',
  sections: [
    {
      id: 'basic-tab',
      title: '基本配置', 
      type: 'tab',
      fieldGroups: [{
        id: 'job-info',
        title: '作业信息',
        fields: ['jobName', 'analysisType', 'description']
      }]
    },
    {
      id: 'params-tab', 
      title: '分析参数',
      type: 'tab',
      fieldGroups: [{
        id: 'script-config',
        title: 'R脚本配置',
        fields: ['script', 'packages', 'inputFiles']
      }]
    },
    {
      id: 'resources-tab',
      title: '计算资源',
      type: 'tab', 
      fieldGroups: [{
        id: 'compute-resources',
        fields: ['partition', 'cpus', 'memory', 'walltime']
      }]
    }
  ]
}
```

#### 机器学习应用 - 向导布局

```typescript
{
  mode: 'wizard',
  sections: [
    {
      id: 'step-1',
      title: '数据准备',
      type: 'step',
      fieldGroups: [{
        fields: ['jobName', 'datasetPath', 'dataFormat']
      }]
    },
    {
      id: 'step-2', 
      title: '模型配置',
      type: 'step',
      fieldGroups: [{
        fields: ['modelType', 'hyperParams', 'epochs']
      }]
    },
    {
      id: 'step-3',
      title: '资源配置', 
      type: 'step',
      fieldGroups: [{
        layout: { arrangement: 'grid', gridColumns: 2 },
        fields: ['partition', 'cpus', 'memory', 'gpus']
      }]
    }
  ]
}
```

## 最佳实践

### 1. 布局选择建议

- **简单应用**（<10个字段）: 使用两列布局
- **中等复杂度**（10-20个字段）: 使用标签页布局  
- **复杂应用**（>20个字段）: 使用向导或手风琴布局
- **新手友好**：优先考虑向导布局

### 2. 字段分组原则

- **按功能分组**：相关的参数放在同一组
- **按使用频率分组**：常用参数优先显示
- **按依赖关系分组**：有条件依赖的字段放在一起
- **控制组大小**：每组建议不超过8个字段

### 3. 用户体验优化

- **合理的默认值**：为所有字段提供合理的默认值
- **清晰的标签**：使用用户友好的字段标签
- **有用的帮助信息**：为复杂字段提供描述和示例
- **渐进式披露**：将高级选项放在折叠区域或后续步骤

### 4. 响应式设计

- **移动端适配**：确保在手机上也能正常使用
- **合理的字段宽度**：避免字段过宽或过窄
- **灵活的布局**：在小屏幕上自动切换为单列布局

## 技术实现

### 1. 布局规范结构

```typescript
interface FormLayoutSpec {
  mode: 'single-column' | 'two-column' | 'tabs' | 'accordion' | 'wizard' | 'custom'
  sections: FormSection[]
  config?: {
    breakpoints?: { sm?: number, md?: number, lg?: number }
    defaultColumns?: number
    spacing?: 'compact' | 'normal' | 'relaxed'
  }
}
```

### 2. 自动布局生成

```typescript
// 根据字段自动生成默认布局
const layout = generateDefaultLayout(fields, 'two-column')

// 智能字段分类
const category = autoClassifyField('cpusPerTask', 'CPU核心数') 
// 返回: 'resource'
```

### 3. 布局渲染器

```typescript
<DynamicLayoutForm
  application={application}
  layout={customLayout}
  onSubmit={handleSubmit}
  editMode={false}
/>
```

## 故障排除

### 常见问题

1. **字段没有显示**
   - 检查字段是否正确分配到字段组
   - 确认字段名称拼写正确

2. **布局显示异常**
   - 检查浏览器兼容性
   - 清除浏览器缓存

3. **保存失败**
   - 检查网络连接
   - 确认管理员权限

### 调试技巧

1. 使用浏览器开发工具检查元素
2. 查看控制台错误信息
3. 在预览模式测试不同屏幕尺寸
4. 验证JSON配置格式

## 扩展开发

### 自定义布局模式

```typescript
// 添加新的布局模式
const CUSTOM_TEMPLATE = {
  mode: 'custom' as const,
  sections: [
    // 自定义区域配置
  ]
}
```

### 自定义字段分类

```typescript
// 扩展字段分类规则
const CUSTOM_CATEGORIES = {
  'database': {
    keywords: ['db', 'sql', 'database', 'connection']
  }
}
```

这个通用的表单布局定制化方案为HPC应用管理系统提供了强大的灵活性，管理员可以为不同类型的应用创建最适合的用户界面，从而大大提升用户体验和工作效率。
