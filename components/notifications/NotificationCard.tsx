import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, EyeOff, Archive, Trash2 } from 'lucide-react'
import { Notification } from '@/lib/notification-types'
import { typeIcons, priorityColors, statusColors } from '@/lib/notification-constants'

interface NotificationCardProps {
  notification: Notification
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onToggleStatus: () => void
  onArchive: () => void
  onDelete: () => void
}

export function NotificationCard({
  notification,
  isSelected,
  onSelect,
  onToggleStatus,
  onArchive,
  onDelete
}: NotificationCardProps) {
  const Icon = typeIcons[notification.type] || typeIcons.system_announcement
  
  return (
    <Card className={`p-4 border transition-colors ${
      notification.status === 'unread' ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'
    }`}>
      <CardContent className="p-0">
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
          />
          
          <div className="flex-shrink-0 mt-1">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <Badge className={priorityColors[notification.priority]}>
                {notification.priority}
              </Badge>
              <Badge className={statusColors[notification.status]}>
                {notification.status}
              </Badge>
              <span className="text-sm text-gray-500">
                {new Date(notification.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
            
            <h3 className="font-medium text-gray-900 mb-1">
              {notification.title}
            </h3>
            
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {notification.message}
            </p>
            
            {notification.metadata && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(notification.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleStatus}
              title={notification.status === 'read' ? '标记为未读' : '标记为已读'}
            >
              {notification.status === 'read' ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            
            {notification.status !== 'archived' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onArchive}
                title="归档"
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}