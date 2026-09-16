import { Card, CardContent } from '@/components/ui/card'
import { NotificationStats } from '@/lib/notification-types'
import { Bell, Eye, Archive, AlertTriangle } from 'lucide-react'

interface StatsCardsProps {
  stats: NotificationStats | null
}

export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-3">
            <CardContent className="p-0">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statsItems = [
    {
      title: '总通知',
      value: stats.total,
      icon: Bell,
      color: 'text-blue-600'
    },
    {
      title: '未读',
      value: stats.unread,
      icon: Eye,
      color: 'text-green-600'
    },
    {
      title: '已读',
      value: stats.total - stats.unread,
      icon: Eye,
      color: 'text-gray-600'
    },
    {
      title: '已归档',
      value: 0, // 暂时设为0，因为NotificationStats中没有archived属性
      icon: Archive,
      color: 'text-yellow-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {statsItems.map((item, index) => {
        const Icon = item.icon
        return (
          <Card key={index} className="p-3">
            <CardContent className="p-0">
              <div className="flex items-center space-x-2">
                <Icon className={`h-5 w-5 ${item.color}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}