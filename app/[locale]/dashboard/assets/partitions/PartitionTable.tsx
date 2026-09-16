'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { authFetch } from '@/lib/utils'

interface Partition {
  name: string
  jobCount: number
  nodeCount: number
  cpuCount: number
  gpuCount: number
  description: string
}

export function PartitionTable() {
  const [partitions, setPartitions] = useState<Partition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPartitions() {
      setLoading(true)
      try {
        const res = await authFetch('/api/jobs/partitions')
        const data = await res.json()
        setPartitions(data.partitions || [])
      } catch (e) {
        setPartitions([])
      } finally {
        setLoading(false)
      }
    }
    fetchPartitions()
  }, [])

  if (loading) return <div className="p-4 text-center">加载分区信息中...</div>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>分区名称</TableHead>
          <TableHead>当前作业数</TableHead>
          <TableHead>节点数</TableHead>
          <TableHead>CPU 核数</TableHead>
          <TableHead>GPU 数</TableHead>
          <TableHead>描述</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {partitions.map((partition) => (
          <TableRow key={partition.name}>
            <TableCell>{partition.name}</TableCell>
            <TableCell>{partition.jobCount}</TableCell>
            <TableCell>{partition.nodeCount}</TableCell>
            <TableCell>{partition.cpuCount}</TableCell>
            <TableCell>{partition.gpuCount}</TableCell>
            <TableCell>{partition.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}