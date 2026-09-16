'use client'

import React, { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useT } from '@/lib/i18n-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Database,
  Activity,
  BarChart3,
  Settings
} from 'lucide-react'
import { bioinformaticsApplications } from '@/lib/bioinformatics-applications'

interface RegistrationResult {
  name: string
  version: string
  status: 'success' | 'error'
  message: string
}

export default function BioinformaticsAppsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const t = useT('system.bioinformatics')

  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationResults, setRegistrationResults] = useState<RegistrationResult[]>([])
  const [registeredApps, setRegisteredApps] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleRegisterApps = async () => {
    try {
      setIsRegistering(true)
      setRegistrationResults([])
      
      const response = await fetch('/api/applications/bioinformatics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setRegistrationResults(result.data.details)
        toast({
          title: t('registrationComplete'),
          description: result.message
        })
        // 刷新已注册应用列表
        await fetchRegisteredApps()
      } else {
        throw new Error(result.message || t('registrationFailed'))
      }
    } catch (error) {
      console.error('注册失败:', error)
      toast({
        title: t('registrationFailed'),
        description: error instanceof Error ? error.message : t('unknownError'),
        variant: 'destructive'
      })
    } finally {
      setIsRegistering(false)
    }
  }

  const fetchRegisteredApps = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/applications/bioinformatics')
      const result = await response.json()
      
      if (result.success) {
        setRegisteredApps(result.data)
      }
    } catch (error) {
      console.error('获取应用列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    fetchRegisteredApps()
  }, [])

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('accessRestricted')}</h1>
          <p className="text-gray-600">{t('adminOnly')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      <Tabs defaultValue="register" className="space-y-6">
        <TabsList>
          <TabsTrigger value="register" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {t('registerApps')}
          </TabsTrigger>
          <TabsTrigger value="installed" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t('installedApps')}
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('statistics')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-6">
          {/* 应用预览 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('predefinedApps')}</CardTitle>
              <CardDescription>
                {t('predefinedAppsDesc', { count: bioinformaticsApplications.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {bioinformaticsApplications.map((app) => (
                  <Card key={`${app.metadata.name}@${app.metadata.version}`} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{app.metadata.displayName || app.metadata.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{app.metadata.version}</Badge>
                        <Badge variant="outline">{app.metadata.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {app.metadata.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {app.metadata.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{t('batchRegisterApps')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('batchRegisterAppsDesc')}
                  </p>
                </div>
                <Button
                  onClick={handleRegisterApps}
                  disabled={isRegistering}
                >
                  {isRegistering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Upload className="h-4 w-4 mr-2" />
                  {isRegistering ? t('registering') : t('registerAllApps')}
                </Button>
              </div>

              {/* 注册结果 */}
              {registrationResults.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-medium">{t('registrationResults')}</h4>
                  {registrationResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {result.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">{result.name}@{result.version}</div>
                          <div className="text-sm text-muted-foreground">{result.message}</div>
                        </div>
                      </div>
                      <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                        {result.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installed" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('installedBioApps')}</CardTitle>
                  <CardDescription>
                    {t('installedBioAppsDesc')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={fetchRegisteredApps}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t('refresh')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>{t('loading')}</span>
                </div>
              ) : registeredApps.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">{t('noInstalledApps')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('pleaseRegisterApps')}
                  </p>
                  <Button onClick={() => handleRegisterApps()}>
                    {t('registerPredefinedApps')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {registeredApps.map((app, index) => (
                    <Card key={index} className="border-l-4 border-l-green-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          {app.metadata.displayName || app.metadata.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{app.metadata.version}</Badge>
                          <Badge variant="default">{t('installed')}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {app.metadata.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {app.metadata.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/dashboard/applications`}>
                              {t('use')}
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{bioinformaticsApplications.length}</div>
                <p className="text-xs text-muted-foreground">{t('predefinedAppsCount')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{registeredApps.length}</div>
                <p className="text-xs text-muted-foreground">{t('installedAppsCount')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {registeredApps.filter(app => app.metadata.type.includes('batch')).length}
                </div>
                <p className="text-xs text-muted-foreground">{t('batchApps')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {registeredApps.filter(app => app.metadata.type.includes('interactive')).length}
                </div>
                <p className="text-xs text-muted-foreground">{t('interactiveApps')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('appDistribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bioinformaticsApplications.map(app => (
                  <div key={app.metadata.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{app.metadata.displayName || app.metadata.name}</div>
                      <div className="text-sm text-muted-foreground">{app.metadata.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.metadata.type.map(type => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}