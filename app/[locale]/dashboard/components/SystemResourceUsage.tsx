'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CpuIcon, MemoryStickIcon } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useT } from '@/lib/i18n-utils'

// Mock CPU data
const cpuData = {
  totalCores: 1024,
  usedCores: 768,
}

// Mock memory data
const memoryData = {
  totalSpace: 128, // GB
  usedSpace: 64, // GB
  usageHistory: [
    { time: '00:00', usage: 40 },
    { time: '04:00', usage: 30 },
    { time: '08:00', usage: 55 },
    { time: '12:00', usage: 50 },
    { time: '16:00', usage: 65 },
    { time: '20:00', usage: 60 },
    { time: '24:00', usage: 48 },
  ]
}

export function SystemResourceUsage({ type }: { type: 'cpu' | 'memory' }) {
  const t = useT('dashboard')

  if (type === 'cpu') {
    const usagePercentage = (cpuData.usedCores / cpuData.totalCores) * 100

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CpuIcon className="w-6 h-6" />
            <span>{t('systemResource.cpuInfo')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">{t('systemResource.totalCores')}</p>
              <p className="text-2xl font-bold">{cpuData.totalCores}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t('systemResource.usedCores')}</p>
              <p className="text-2xl font-bold">{cpuData.usedCores}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t('systemResource.usageRate')}</p>
              <p className="text-2xl font-bold">{usagePercentage.toFixed(1)}%</p>
              <Progress value={usagePercentage} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  } else {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MemoryStickIcon className="w-6 h-6" />
            <span>{t('systemResource.memoryInfo')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <div>
                <p className="text-sm font-medium">{t('systemResource.totalMemory')}</p>
                <p className="text-2xl font-bold">{memoryData.totalSpace} GB</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{t('systemResource.usedMemory')}</p>
                <p className="text-2xl font-bold">{memoryData.usedSpace} GB</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t('systemResource.usageRate')}</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={memoryData.usageHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="usage" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
}