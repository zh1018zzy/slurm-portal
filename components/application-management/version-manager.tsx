'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Clock as History, 
  Link as GitBranch, 
  Eye, 
  Download, 
  Upload,
  Copy,
  Trash2,
  Plus,
  Check,
  X,
  Clock,
  User,
  FileText
} from 'lucide-react'

interface ApplicationVersion {
  id: string
  version: string
  name: string
  displayName?: string
  description: string
  author: string
  createdAt: string
  status: 'active' | 'draft' | 'deprecated' | 'archived'
  changes: string[]
  isPublic: boolean
  parentVersion?: string
}

interface VersionManagerProps {
  applicationName: string
  currentVersion: string
  versions: ApplicationVersion[]
  onVersionSelect: (version: ApplicationVersion) => void
  onVersionCreate: (baseVersion: string, newVersion: Partial<ApplicationVersion>) => void
  onVersionDelete: (versionId: string) => void
  onVersionPublish: (versionId: string) => void
}

export function VersionManager({ 
  applicationName,
  currentVersion,
  versions,
  onVersionSelect,
  onVersionCreate,
  onVersionDelete,
  onVersionPublish
}: VersionManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedBaseVersion, setSelectedBaseVersion] = useState<string>('')
  const [newVersionData, setNewVersionData] = useState({
    version: '',
    description: '',
    changes: ''
  })

  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const getStatusColor = (status: ApplicationVersion['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'deprecated': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleCreateVersion = () => {
    if (!newVersionData.version || !newVersionData.description) return
    
    const changes = newVersionData.changes
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim())

    onVersionCreate(selectedBaseVersion, {
      version: newVersionData.version,
      description: newVersionData.description,
      changes,
      status: 'draft' as const
    })

    setShowCreateDialog(false)
    setNewVersionData({ version: '', description: '', changes: '' })
    setSelectedBaseVersion('')
  }

  return (
    <div className="space-y-6">
      {/* 版本管理头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5" />
            版本管理
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            管理 {applicationName} 的不同版本，跟踪变更历史
          </p>
        </div>
        
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建新版本
        </Button>
      </div>

      {/* 当前活跃版本 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">
            当前活跃版本: {currentVersion}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {versions.filter(v => v.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">活跃版本</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {versions.filter(v => v.status === 'draft').length}
              </div>
              <div className="text-sm text-gray-600">草稿版本</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {versions.length}
              </div>
              <div className="text-sm text-gray-600">总版本数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 版本列表 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">版本历史</h3>
        
        {sortedVersions.map((version) => (
          <Card key={version.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-lg">
                        {version.displayName || version.name} v{version.version}
                      </span>
                    </div>
                    
                    <Badge className={getStatusColor(version.status)}>
                      {version.status}
                    </Badge>
                    
                    {version.isPublic ? (
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        公开
                      </Badge>
                    ) : (
                      <Badge variant="secondary">私有</Badge>
                    )}
                    
                    {version.version === currentVersion && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        当前版本
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-3">{version.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {version.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(version.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                    {version.parentVersion && (
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-4 w-4" />
                        基于 v{version.parentVersion}
                      </div>
                    )}
                  </div>
                  
                  {version.changes.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        变更记录
                      </h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {version.changes.map((change, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-600 mt-1">•</span>
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onVersionSelect(version)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    查看
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedBaseVersion(version.id)
                      setShowCreateDialog(true)
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </Button>
                  
                  {version.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onVersionPublish(version.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      发布
                    </Button>
                  )}
                  
                  {version.status !== 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onVersionDelete(version.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {versions.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">暂无版本历史</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                创建第一个版本
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 创建版本对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>创建新版本</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedBaseVersion && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    基于版本: {versions.find(v => v.id === selectedBaseVersion)?.version}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">版本号 *</label>
                <Input
                  value={newVersionData.version}
                  onChange={(e) => setNewVersionData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="例如: 1.1.0"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">版本描述 *</label>
                <textarea
                  value={newVersionData.description}
                  onChange={(e) => setNewVersionData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="描述此版本的主要变更..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">变更日志</label>
                <textarea
                  value={newVersionData.changes}
                  onChange={(e) => setNewVersionData(prev => ({ ...prev, changes: e.target.value }))}
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder={`每行一个变更，例如：
• 增加了新的表单字段验证
• 优化了执行脚本模板
• 修复了权限配置问题`}
                />
              </div>
            </CardContent>
            
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateDialog(false)}
              >
                <X className="h-4 w-4 mr-2" />
                取消
              </Button>
              <Button 
                onClick={handleCreateVersion}
                disabled={!newVersionData.version || !newVersionData.description}
              >
                <Check className="h-4 w-4 mr-2" />
                创建版本
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}