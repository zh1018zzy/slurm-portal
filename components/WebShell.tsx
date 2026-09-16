'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { Terminal as TerminalIcon } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface WebShellProps {
  className?: string
}

export default function WebShell({ className = '' }: WebShellProps) {
  const { user } = useAuth()
  const [hasWebShellAccess, setHasWebShellAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkWebShellAccess() {
      if (!user) {
        setHasWebShellAccess(false)
        setLoading(false)
        return
      }

      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setHasWebShellAccess(false)
          setLoading(false)
          return
        }

        const response = await fetch('/api/webshell/check-access', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setHasWebShellAccess(data.hasAccess)
        } else {
          setHasWebShellAccess(false)
        }
      } catch (error) {
        console.error('检查WebShell权限失败:', error)
        setHasWebShellAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkWebShellAccess()
  }, [user])

  const handleOpen = () => {
    if (!hasWebShellAccess) {
      toast({ 
        title: '权限不足', 
        description: '您没有WebShell访问权限，请联系管理员', 
        variant: 'destructive' 
      })
      return
    }
    window.open('/dashboard/webshell', '_blank')
  }

  // 如果没有权限，不显示按钮
  if (loading || !hasWebShellAccess) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleOpen}
      disabled={!hasWebShellAccess}
      className={`flex items-center gap-2 ${className}`}
    >
      <TerminalIcon className="w-4 h-4" />
      <span className="hidden sm:inline">WebShell</span>
    </Button>
  )
} 