'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TechCard } from '@/components/ui/tech-card'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useT } from '@/lib/i18n-utils'

// 模拟数据
const clusterData = {
  totalMachines: 100,
  onlineMachines: 85
}

const COLORS = ['#0088FE', '#00C49F']

const devices = [
  { id: 1, ibmcIp: '192.168.1.1', managementStatus: 'normal', healthStatus: 'good', model: 'Model A', serialNumber: 'SN001', vendor: 'Vendor X', group: 'Group 1', scope: 'Scope A', tags: 'Tag1, Tag2' },
  // ... 添加更多设备数据
]

// 模拟告警数据
const alerts = [
  { id: 1, type: 'hardwareFailure', message: 'cpuOverheat' },
  { id: 2, type: 'networkAbnormal', message: 'networkDisconnected' },
  // 添加更多告警数据
]

export default function AssetsPage() {
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const t = useT('assets')

  const totalPages = Math.ceil(devices.length / pageSize)
  const paginatedDevices = devices.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-foreground">{t('title')}</h1>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <TechCard hover>
          <CardHeader>
            <CardTitle>{t('clusterStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-left flex-1">
                <p className="text-2xl font-bold mb-2">{t('totalMachines')}: {clusterData.totalMachines}</p>
                <p className="text-2xl font-bold">{t('onlineMachines')}: {clusterData.onlineMachines}</p>
              </div>
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: t('online'), value: clusterData.onlineMachines },
                        { name: t('offline'), value: clusterData.totalMachines - clusterData.onlineMachines }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </TechCard>

        <TechCard hover>
          <CardHeader>
            <CardTitle>{t('alerts')}</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Alert key={alert.id} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t(alert.type)}</AlertTitle>
                    <AlertDescription>{t(alert.message)}</AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">{t('noAlerts')}</p>
            )}
          </CardContent>
        </TechCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('deviceList')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10{t('itemsPerPage')}</SelectItem>
                <SelectItem value="30">30{t('itemsPerPage')}</SelectItem>
                <SelectItem value="50">50{t('itemsPerPage')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ibmcIp')}</TableHead>
                <TableHead>{t('managementStatus')}</TableHead>
                <TableHead>{t('healthStatus')}</TableHead>
                <TableHead>{t('model')}</TableHead>
                <TableHead>{t('serialNumber')}</TableHead>
                <TableHead>{t('vendor')}</TableHead>
                <TableHead>{t('group')}</TableHead>
                <TableHead>{t('scope')}</TableHead>
                <TableHead>{t('deviceTags')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.ibmcIp}</TableCell>
                  <TableCell>{t(device.managementStatus)}</TableCell>
                  <TableCell>{t(device.healthStatus)}</TableCell>
                  <TableCell>{device.model}</TableCell>
                  <TableCell>{device.serialNumber}</TableCell>
                  <TableCell>{device.vendor}</TableCell>
                  <TableCell>{device.group}</TableCell>
                  <TableCell>{device.scope}</TableCell>
                  <TableCell>{device.tags}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              {t('previousPage')}
            </button>
            <span>{t('pageInfo', { current: currentPage, total: totalPages })}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              {t('nextPage')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}