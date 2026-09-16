import { Suspense } from 'react'
import { PartitionTable } from './PartitionTable'
import { PartitionTableSkeleton } from './PartitionTableSkeleton'
import { useT } from '@/lib/i18n-utils'

export default function PartitionsPage() {
  const t = useT('partitions')

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
      <Suspense fallback={<PartitionTableSkeleton />}>
        <PartitionTable />
      </Suspense>
    </div>
  )
}