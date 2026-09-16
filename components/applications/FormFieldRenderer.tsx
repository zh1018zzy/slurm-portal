'use client'

import React from 'react'
import { UseFormWatch, UseFormSetValue } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Upload, X, HelpCircle } from 'lucide-react'
import { FormField as HpcFormField } from '@/lib/hpc-application-spec'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslations } from 'next-intl'

interface FormFieldRendererProps {
  field: HpcFormField
  watch: UseFormWatch<any>
  setValue: UseFormSetValue<any>
}

export function FormFieldRenderer({ field, watch, setValue }: FormFieldRendererProps) {
  const value = watch(field.name)
  const t = useTranslations('common')

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <FormField
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                  {field.help && <HelpTooltip help={field.help} />}
                </FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    placeholder={field.placeholder}
                    disabled={formField.disabled}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'number':
        return (
          <FormField
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                  {field.help && <HelpTooltip help={field.help} />}
                </FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    onChange={(e) => formField.onChange(Number(e.target.value))}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'textarea':
        return (
          <FormField
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                  {field.help && <HelpTooltip help={field.help} />}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...formField}
                    placeholder={field.placeholder}
                    rows={6}
                    className="font-mono"
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'select':
        return (
          <FormField
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                  {field.help && <HelpTooltip help={field.help} />}
                </FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div>{option.label}</div>
                          {option.description && (
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'boolean':
        return (
          <FormField
            name={field.name}
            render={({ field: formField }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="flex items-center gap-2">
                    {field.label}
                    {field.help && <HelpTooltip help={field.help} />}
                  </FormLabel>
                  {field.description && (
                    <FormDescription>{field.description}</FormDescription>
                  )}
                </div>
              </FormItem>
            )}
          />
        )

      case 'slider':
        return (
          <FormField
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                  {field.help && <HelpTooltip help={field.help} />}
                </FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    <Slider
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={[formField.value]}
                      onValueChange={(values) => formField.onChange(values[0])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{field.min}</span>
                      <span className="font-medium">{formField.value}</span>
                      <span>{field.max}</span>
                    </div>
                  </div>
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'file':
        return (
          <FormField
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                  {field.help && <HelpTooltip help={field.help} />}
                </FormLabel>
                <FormControl>
                  <FileUpload
                    value={formField.value}
                    onChange={formField.onChange}
                    accept={field.accept}
                    multiple={field.multiple}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'array':
        return (
          <FormField
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                  {field.help && <HelpTooltip help={field.help} />}
                </FormLabel>
                <FormControl>
                  <ArrayInput
                    value={formField.value || []}
                    onChange={formField.onChange}
                    itemType={field.itemType}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      default:
        return (
          <div className="text-red-500">
            Unsupported field type: {field.type}
          </div>
        )
    }
  }

  return <div className="space-y-2">{renderInput()}</div>
}

// Help tooltip component
function HelpTooltip({ help }: { help: any }) {
  const t = useTranslations('common')

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            {help.text && <p>{help.text}</p>}
            {help.example && (
              <div className="mt-2">
                <strong>Example:</strong>
                <code className="block mt-1 text-xs bg-muted p-1 rounded">
                  {help.example}
                </code>
              </div>
            )}
            {help.link && (
              <a
                href={help.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline mt-2 block"
              >
                Learn more →
              </a>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// File upload component
function FileUpload({
  value,
  onChange,
  accept,
  multiple
}: {
  value: File[] | File | null
  onChange: (files: File[] | File | null) => void
  accept?: string[]
  multiple?: boolean
}) {
  const t = useTranslations('common')
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (multiple) {
      onChange(files)
    } else {
      onChange(files[0] || null)
    }
  }

  const removeFile = (index?: number) => {
    if (multiple && Array.isArray(value)) {
      const newFiles = [...value]
      if (index !== undefined) {
        newFiles.splice(index, 1)
      }
      onChange(newFiles)
    } else {
      onChange(null)
    }
  }

  const files = Array.isArray(value) ? value : value ? [value] : []

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative"
        >
          <Upload className="h-4 w-4 mr-2" />
          {t('upload') || 'Upload'}
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept={accept?.join(',')}
            multiple={multiple}
          />
        </Button>
        {accept && (
          <span className="text-sm text-muted-foreground">
            Supported: {accept.join(', ')}
          </span>
        )}
      </div>
      
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, index) => (
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
                onClick={() => removeFile(multiple ? index : undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Array input component
function ArrayInput({
  value,
  onChange,
  itemType
}: {
  value: any[]
  onChange: (value: any[]) => void
  itemType?: HpcFormField
}) {
  const t = useTranslations('common')
  const addItem = () => {
    const newItem = itemType?.default || ''
    onChange([...value, newItem])
  }

  const removeItem = (index: number) => {
    const newValue = [...value]
    newValue.splice(index, 1)
    onChange(newValue)
  }

  const updateItem = (index: number, newValue: any) => {
    const updated = [...value]
    updated[index] = newValue
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder={itemType?.placeholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeItem(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
      >
        Add Item
      </Button>
    </div>
  )
}