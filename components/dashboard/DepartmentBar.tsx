"use client"
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { authFetch } from '@/lib/utils'

export function DepartmentBar() {
  const [data, setData] = useState<{name: string; value: number}[]>([])
  useEffect(() => {
    authFetch('/api/users?stats=department')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.departmentStats) {
          setData(Object.entries(res.departmentStats).map(([name, value]) => ({ name, value: Number(value) })))
        }
      })
  }, [])
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
} 