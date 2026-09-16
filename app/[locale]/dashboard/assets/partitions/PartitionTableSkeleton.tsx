import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function PartitionTableSkeleton() {
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
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            {[...Array(6)].map((_, j) => (
              <TableCell key={j}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { PartitionTableSkeleton }