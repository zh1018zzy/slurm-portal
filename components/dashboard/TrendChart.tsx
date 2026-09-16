"use client"
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { authFetch } from '@/lib/utils'

export function TrendChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    // 延迟加载：等待页面其他内容加载完成后再加载趋势数据
    const timer = setTimeout(() => {
      setShouldLoad(true)
    }, 500) // 500毫秒后开始加载，减少等待时间

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!shouldLoad) return

    setLoading(true)
    setError('')
    
    authFetch('/api/jobs/trend')
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.trend || [])
        } else {
          console.error('趋势数据API返回错误:', res.error)
          setError(res.error || '获取数据失败')
          // 回退到旧API
          return authFetch('/api/jobs?stats=trend')
            .then(res2 => res2.json())
            .then(res2 => {
              if (res2.success) {
                setData(res2.trend || [])
              } else {
                setError('所有API都失败了')
              }
            })
        }
      })
      .catch(error => {
        console.error('获取趋势数据失败:', error)
        setError('网络错误')
        // 回退到旧API
        return authFetch('/api/jobs?stats=trend')
          .then(res => res.json())
          .then(res => {
            if (res.success) {
              setData(res.trend || [])
            } else {
              setError('所有API都失败了')
            }
          })
          .catch(() => {
            setError('所有API都失败了')
          })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [shouldLoad])
  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">加载趋势数据中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">加载失败</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">暂无趋势数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="submitted" stroke="#8884d8" name="提交" />
          <Line type="monotone" dataKey="completed" stroke="#82ca9d" name="完成" />
          <Line type="monotone" dataKey="failed" stroke="#ff4d4f" name="失败" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
} 