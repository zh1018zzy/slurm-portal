'use client'
import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: number
}

// 轻量级代码编辑器，避免使用重型的语法高亮库
export default function CodeEditor({ 
  value, 
  onChange, 
  placeholder = '',
  className = '',
  minHeight = 120 
}: CodeEditorProps) {
  const [code, setCode] = useState(value)

  useEffect(() => {
    setCode(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setCode(newValue)
    onChange(newValue)
  }

  return (
    <Textarea
      value={code}
      onChange={handleChange}
      placeholder={placeholder}
      className={`font-mono text-sm resize-none ${className}`}
      style={{ minHeight: `${minHeight}px` }}
      rows={8}
    />
  )
}