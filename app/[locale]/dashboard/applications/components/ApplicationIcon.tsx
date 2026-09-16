'use client'

import React from 'react'
import Image from 'next/image'
import {
  Settings,
  Lightbulb,
  BookOpen,
  Monitor,
  Terminal,
  Cpu,
  Zap,
  Upload,
  Dna
} from 'lucide-react'
import { ApplicationCategory } from '@/lib/hpc-application-spec'

interface ApplicationIconProps {
  category: ApplicationCategory
  iconConfig?: any
}

export default function ApplicationIcon({ category, iconConfig }: ApplicationIconProps) {
  const [imageError, setImageError] = React.useState(false)
  
  // 如果应用有自定义图标配置，优先使用
  if (iconConfig && !imageError) {
    switch (iconConfig.type) {
      case 'lucide':
        if (iconConfig.name) {
          try {
            const IconComponent = require('lucide-react')[iconConfig.name]
            if (IconComponent) {
              return React.createElement(IconComponent, {
                className: "h-5 w-5",
                style: { color: iconConfig.color || '#6B7280' }
              })
            }
          } catch (error) {
            console.warn('Failed to load Lucide icon:', iconConfig.name)
          }
        }
        break
      case 'upload':
        if (iconConfig.filePath) {
          return (
            <Image
              src={`/api/files/uploads/${iconConfig.filePath}`}
              alt="应用图标"
              width={20}
              height={20}
              className="h-5 w-5 object-cover rounded"
              onError={() => {
                // 如果图片加载失败，回退到默认图标
                setImageError(true)
              }}
            />
          )
        }
        break
      case 'emoji':
        if (iconConfig.emoji) {
          return <span className="text-xl">{iconConfig.emoji}</span>
        }
        break
    }
  }
  
  // 回退到默认分类图标
  const iconMap: Record<ApplicationCategory, React.ReactElement> = {
    [ApplicationCategory.SCIENTIFIC_COMPUTING]: <Cpu className="h-5 w-5 text-blue-600" />,
    [ApplicationCategory.MACHINE_LEARNING]: <Zap className="h-5 w-5 text-purple-600" />,
    [ApplicationCategory.DEEP_LEARNING]: <Zap className="h-5 w-5 text-purple-600" />,
    [ApplicationCategory.QUANTUM_CHEMISTRY]: <BookOpen className="h-5 w-5 text-indigo-600" />,
    [ApplicationCategory.COMPUTATIONAL_FLUID_DYNAMICS]: <Cpu className="h-5 w-5 text-blue-600" />,
    [ApplicationCategory.BIOINFORMATICS]: <Dna className="h-5 w-5 text-emerald-600" />,
    [ApplicationCategory.CAD_CAE]: <Monitor className="h-5 w-5 text-green-600" />,
    [ApplicationCategory.VISUALIZATION]: <Monitor className="h-5 w-5 text-green-600" />,
    [ApplicationCategory.BIG_DATA]: <Cpu className="h-5 w-5 text-blue-600" />,
    [ApplicationCategory.COMPILERS]: <Terminal className="h-5 w-5 text-orange-600" />,
    [ApplicationCategory.DATABASES]: <Terminal className="h-5 w-5 text-orange-600" />,
    [ApplicationCategory.WEB_SERVICES]: <Terminal className="h-5 w-5 text-orange-600" />,
    [ApplicationCategory.DEVELOPMENT_TOOLS]: <Terminal className="h-5 w-5 text-orange-600" />,
    [ApplicationCategory.SYSTEM_UTILITIES]: <Terminal className="h-5 w-5 text-orange-600" />,
    [ApplicationCategory.STRUCTURAL_ANALYSIS]: <Monitor className="h-5 w-5 text-cyan-600" />,
    [ApplicationCategory.CFD]: <Cpu className="h-5 w-5 text-sky-600" />,
    [ApplicationCategory.MULTIPHYSICS]: <Zap className="h-5 w-5 text-violet-600" />,
    [ApplicationCategory.MOLECULAR_SIMULATION]: <Dna className="h-5 w-5 text-pink-600" />
  }
  return iconMap[category] || <Settings className="h-5 w-5 text-gray-600" />
}