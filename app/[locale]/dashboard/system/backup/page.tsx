'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database } from 'lucide-react'
import { useT } from '@/lib/i18n-utils'

export default function BackupAndRestorePage() {
  const t = useT('system.backup')

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-6 h-6" />
            <span>{t('title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full mb-2">{t('createBackup')}</Button>
          <Button className="w-full">{t('restoreSystem')}</Button>
        </CardContent>
      </Card>
    </div>
  )
}