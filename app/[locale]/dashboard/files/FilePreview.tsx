'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Download, Copy, Check } from 'lucide-react';
import { LightCodeHighlighter } from '@/components/ui/light-code-highlighter';
import { authFetch } from '@/lib/utils';
import Watermark from '@/components/Watermark';
import { useT } from '@/lib/i18n-utils';

interface FileInfo {
  name: string;
  path: string;
  size: number | null;
  isDirectory: boolean;
  modified: string;
  permissions: string;
  owner: number;
  group: number;
}

interface FilePermission {
  id: string;
  userId: string;
  permissionType: 'file_upload' | 'file_download' | 'file_preview' | 'file_delete' | 'file_share' | 'file_export' | 'file_copy';
  isEnabled: boolean;
}

interface FilePreviewProps {
  file: FileInfo;
  onClose: () => void;
}

export default function FilePreview({ file, onClose }: FilePreviewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useT('files');
  const tCommon = useT('common');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // 权限状态
  const [permissions, setPermissions] = useState<FilePermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  
  // 复制状态
  const [copySuccess, setCopySuccess] = useState(false);

  // 获取用户权限
  const fetchUserPermissions = useCallback(async () => {
    if (!user?.username) return;
    
    setPermissionsLoading(true);
    try {
      const response = await fetch('/api/permissions/file-permissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPermissions(data.permissions || []);
        }
      }
    } catch (error) {
      console.error('获取用户权限失败:', error);
    } finally {
      setPermissionsLoading(false);
    }
  }, [user?.username]);

  // 检查权限
  const hasPermission = useCallback((permissionType: string): boolean => {
    if (permissionsLoading) {
      return false; // 默认拒绝
    }
    
    const permission = permissions.find(p => p.permissionType === permissionType);
    return permission ? permission.isEnabled : false;
  }, [permissions, permissionsLoading]);

  // 初始化权限
  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  // 获取文件内容
  useEffect(() => {
    if (!user?.username) return;

    const fetchContent = async () => {
      setLoading(true);
      setError('');
      
      try {
        // 对于大文件，添加大小限制
        const maxSize = 1024 * 1024; // 1MB限制
        if (file.size && file.size > maxSize) {
          setError(t('fileTooLarge'));
          setLoading(false);
          return;
        }

        const response = await authFetch(
          `/api/files/download?username=${user.username}&path=${file.path}&action=preview`
        );

        if (!response.ok) {
          throw new Error(t('fetchContentFailed'));
        }

        const text = await response.text();

        // 限制预览内容长度
        const maxPreviewLength = 50000; // 50KB字符限制
        if (text.length > maxPreviewLength) {
          setContent(text.substring(0, maxPreviewLength) + '\n\n' + t('contentTruncated'));
        } else {
          setContent(text);
        }
      } catch (error) {
        console.error('获取文件内容失败:', error);
        setError(error instanceof Error ? error.message : t('fetchContentFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [file.path, user?.username, file.size]);

  // 复制内容到剪贴板
  const copyToClipboard = async () => {
    setCopySuccess(false);
    
    try {
      // 使用现代 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000); // 2秒后恢复

        toast({
          title: t('copySuccessTitle'),
          description: t('copySuccessDesc')
        });
        return;
      }

      // 使用安全的复制函数
      const { safeCopyToClipboard } = await import('@/lib/dom-utils');
      const successful = await safeCopyToClipboard(content);

      if (successful) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);

        toast({
          title: t('copySuccessTitle'),
          description: t('copySuccessDesc')
        });
      } else {
        throw new Error(t('copyFailedTitle'));
      }
    } catch (error) {
      console.error('复制失败:', error);
      toast({
        title: t('copyFailedTitle'),
        description: t('copyFailedDesc'),
        variant: 'destructive'
      });
    }
  };

  // 下载文件
  const downloadFile = async () => {
    if (!user?.username) return;
    
    const url = `/api/files/download?username=${user.username}&path=${file.path}`;
    const { safeDownloadFile } = await import('@/lib/dom-utils');
    safeDownloadFile(url, file.name);
  };

  // 获取文件类型
  const getFileType = () => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
      return 'image';
    }
    
    if (['pdf'].includes(ext || '')) {
      return 'pdf';
    }
    
    if (['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext || '')) {
      return 'text';
    }
    
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'less', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs', 'swift', 'kt'].includes(ext || '')) {
      return 'code';
    }
    
    return 'text';
  };

  // 获取代码语言
  const getCodeLanguage = () => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown'
    };
    
    return languageMap[ext || ''] || 'text';
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fileType = getFileType();
  const codeLanguage = getCodeLanguage();

  // 禁用右键菜单
  const disableContextMenu = (e: React.MouseEvent) => {
    if (!hasPermission('file_copy')) {
      e.preventDefault();
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{file.name}</span>
              <span className="text-sm text-gray-500">
                ({formatFileSize(file.size)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* 根据权限显示复制和下载按钮 */}
              {hasPermission('file_copy') && (
                <Button 
                  variant={copySuccess ? "default" : "outline"} 
                  size="sm" 
                  onClick={copyToClipboard}
                  className={copySuccess ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                >
                  {copySuccess ? (
                    <Check className="w-4 h-4 mr-1" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  {copySuccess ? t('copied') : tCommon('copy')}
                </Button>
              )}
              {hasPermission('file_download') && (
                <Button variant="outline" size="sm" onClick={downloadFile}>
                  <Download className="w-4 h-4 mr-1" />
                  {tCommon('download')}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-3/4 h-4" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-500 mb-2">{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  {t('retry')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              {fileType === 'image' ? (
                <Watermark username={user?.username || ''}>
                  <div className="flex items-center justify-center h-full relative w-full">
                    <Image
                      src={`/api/files/download?username=${user?.username}&path=${file.path}&action=preview`}
                      alt={file.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </Watermark>
              ) : fileType === 'pdf' ? (
                <Watermark username={user?.username || ''}>
                  <div className="h-full">
                    <iframe
                      src={`/api/files/download?username=${user?.username}&path=${file.path}&action=preview`}
                      className="w-full h-full border-0"
                      title={file.name}
                    />
                  </div>
                </Watermark>
              ) : (
                <Tabs defaultValue="preview" className="h-full">
                  <TabsList>
                    <TabsTrigger value="preview">{t('preview')}</TabsTrigger>
                    {fileType === 'code' && (
                      <TabsTrigger value="raw">{t('rawContent')}</TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="preview" className="h-full">
                    {fileType === 'code' ? (
                      <Watermark username={user?.username || ''}>
                        <div 
                          className="h-full overflow-auto"
                          style={{ 
                            userSelect: hasPermission('file_copy') ? 'auto' : 'none',
                            WebkitUserSelect: hasPermission('file_copy') ? 'auto' : 'none'
                          }}
                          onContextMenu={disableContextMenu}
                        >
                          <LightCodeHighlighter
                            code={content}
                            language={codeLanguage}
                            className="h-full"
                          />
                        </div>
                      </Watermark>
                    ) : (
                      <Watermark username={user?.username || ''}>
                        <div 
                          className="h-full overflow-auto"
                          style={{ 
                            userSelect: hasPermission('file_copy') ? 'auto' : 'none',
                            WebkitUserSelect: hasPermission('file_copy') ? 'auto' : 'none'
                          }}
                          onContextMenu={disableContextMenu}
                        >
                          <pre className="whitespace-pre-wrap font-mono text-sm p-4 bg-gray-50 rounded-lg h-full">
                            {content}
                          </pre>
                        </div>
                      </Watermark>
                    )}
                  </TabsContent>
                  
                  {fileType === 'code' && (
                    <TabsContent value="raw" className="h-full">
                      <Watermark username={user?.username || ''}>
                        <div 
                          className="h-full overflow-auto"
                          style={{ 
                            userSelect: hasPermission('file_copy') ? 'auto' : 'none',
                            WebkitUserSelect: hasPermission('file_copy') ? 'auto' : 'none'
                          }}
                          onContextMenu={disableContextMenu}
                        >
                          <pre className="whitespace-pre-wrap font-mono text-sm p-4 bg-gray-50 rounded-lg h-full">
                            {content}
                          </pre>
                        </div>
                      </Watermark>
                    </TabsContent>
                  )}
                </Tabs>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 