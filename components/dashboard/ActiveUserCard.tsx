"use client"
import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/utils'

export function ActiveUserCard() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    authFetch('/api/users?stats=active')
      .then(res => res.json())
      .then(res => res.success && setCount(res.activeUsers || 0))
  }, [])
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded shadow text-center">
      <div className="text-2xl font-bold text-blue-600">{count}</div>
      <div className="text-sm text-muted-foreground">24小时活跃用户</div>
    </div>
  )
} 