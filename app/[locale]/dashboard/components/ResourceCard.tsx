'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ReactNode } from 'react'
import { useT } from '@/lib/i18n-utils'

interface CPUInfo {
  totalCores: number
  freeCores: number
  usagePercentage: number
}

interface ResourceCardProps {
  title: string
  value?: number
  cpuInfo?: CPUInfo
  children?: ReactNode
}

export function ResourceCard({ title, value, cpuInfo, children }: ResourceCardProps) {
  const t = useT('dashboard')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {cpuInfo && (
          <div className="mb-4">
            <p>{t('resourceCard.totalCores')}: {cpuInfo.totalCores}</p>
            <p>{t('resourceCard.freeCores')}: {cpuInfo.freeCores}</p>
          </div>
        )}
        {children ? (
          children
        ) : (
          <>
            <Progress value={value} className="w-full" />
            <p className="text-right mt-2">{value?.toFixed(1)}%</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}