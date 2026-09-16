'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/lib/i18n-utils'

interface Alert {
  message: string
}

export default function AlertInfo() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const t = useT('dashboard')

  useEffect(() => {
    // 这里应该是获取告警信息的逻辑
    // 例如：fetchAlerts().then(setAlerts)
    // 模拟获取告警信息
    setTimeout(() => {
      setAlerts([
        { message: `${t('sampleAlert')} 1` },
        { message: `${t('sampleAlert')} 2` },
      ])
    }, 1000)
  }, [t])

  return (
    <div>
      {alerts.length === 0 ? (
        <p>{t('noAlerts')}</p>
      ) : (
        <ul>
          {alerts.map((alert, index) => (
            <li key={index}>{alert.message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}