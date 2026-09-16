"use client"
import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { authFetch } from '@/lib/utils'

const COLORS = ['#ff4d4f', '#faad14', '#1890ff', '#52c41a', '#b37feb', '#13c2c2']

export function FailurePie() {
  const [data, setData] = useState<{name: string; value: number}[]>([])
  useEffect(() => {
    authFetch('/api/jobs?stats=failures')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.failures) {
          setData(Object.entries(res.failures).map(([name, value]) => ({ name, value: Number(value) })))
        }
      })
  }, [])
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {data.map((entry, idx) => (
              <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
} 