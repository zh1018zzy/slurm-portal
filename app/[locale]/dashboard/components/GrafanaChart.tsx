'use client'

import { useState, useEffect } from 'react'

interface GrafanaChartProps {
  panelId: string
  dashboardId: string
}

export function GrafanaChart({ panelId, dashboardId }: GrafanaChartProps) {
  const [iframeUrl, setIframeUrl] = useState('')

  useEffect(() => {
    // 这里应该是您的 Grafana 服务器的 URL
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://192.168.137.91:3000'
    const url = `${grafanaUrl}/d-solo/${dashboardId}/prometheus-2-0-stats?orgId=1&panelId=${panelId}&theme=light&kiosk`
    setIframeUrl(url)
  }, [panelId, dashboardId])

  return (
    <div className="w-full h-64">
      {iframeUrl && (
        <iframe
          src={iframeUrl}
          width="100%"
          height="100%"
          frameBorder="0"
        ></iframe>
      )}
    </div>
  )
}