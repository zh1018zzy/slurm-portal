'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFileOperations } from '@/hooks/use-file-operations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Folder,
  File,
  Upload,
  Download,
  Trash2,
  Eye,
  ArrowLeft,
  Home,
  RefreshCw,
  Edit
} from 'lucide-react';
import dynamic from 'next/dynamic';
import FileUploader from './FileUploader';
import { NewFolderDialog } from './FileDialogs';
import { useT } from '@/lib/i18n-utils';
import { useLocale } from 'next-intl';
import { TechCard } from '@/components/ui/tech-card';
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// 懒加载FilePreview组件
const FilePreview = dynamic(() => import('./FilePreview'), {
  loading: () => <div className="flex justify-center items-center p-8"><Skeleton className="h-64 w-full" /></div>,
  ssr: false
});

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

interface FileListResponse {
  currentPath: string;
  homePath: string;
  files: FileInfo[];
}

interface FilePermission {
  id: string;
  userId: string;
  permissionType: 'file_upload' | 'file_download' | 'file_preview' | 'file_delete' | 'file_share' | 'file_export' | 'file_copy';
  isEnabled: boolean;
}

export default function FilesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const locale = useLocale();
  const t = useT('files');
  const tCommon = useT('common');
  const [uploading, setUploading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  // 权限状态
  const [permissions, setPermissions] = useState<FilePermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  
  // 过滤功能
  const [showHidden, setShowHidden] = useState(false);
  const [filterText, setFilterText] = useState('');
  
  // 使用文件操作hook
  const {
    files,
    currentPath,
    homePath,
    loading,
    fetchFiles,
    deleteFile,
    renameFile,
    createDirectory,
    navigateToDirectory,
    navigateToParent,
    navigateToHome,
    setFiles
  } = useFileOperations({ showHidden, filterText });
  
  // 防抖机制
  const [fetchTimeout, setFetchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // 对话框状态
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [editingFile, setEditingFile] = useState<FileInfo | null>(null);
  const [editingName, setEditingName] = useState('');

  // 获取用户权限
  const fetchUserPermissions = useCallback(async () => {
    if (!user?.username) return;
    
    setPermissionsLoading(true);
    try {
      // 获取token，优先使用useAuth中的token
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('未找到用户token，可能需要重新登录');
        toast({
          title: t('authError'),
          description: t('pleaseRelogin'),
          variant: 'destructive'
        });
        return;
      }

      const response = await fetch('/api/permissions/file-permissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPermissions(data.permissions || []);
        }
      } else if (response.status === 401) {
        console.warn('Token无效，需要重新登录');
        toast({
          title: t('authExpired'),
          description: t('pleaseRelogin'),
          variant: 'destructive'
        });
        // 清除无效token
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('获取用户权限失败:', error);
    } finally {
      setPermissionsLoading(false);
    }
  }, [user?.username, toast]);

  // 检查权限 - 优化版本，减少重复检查
  const hasPermission = useCallback((permissionType: string): boolean => {
    // 如果权限还在加载中，默认拒绝（更安全）
    if (permissionsLoading) {
      return false;
    }
    
    const permission = permissions.find(p => p.permissionType === permissionType);
    // 如果找不到权限记录，默认拒绝（更安全）
    return permission ? permission.isEnabled : false;
  }, [permissions, permissionsLoading]);

  // 清除指定路径的缓存
  const clearPathCache = useCallback((path: string) => {
    // This function will be replaced with hook's cache management
    fetchFiles(path, { showHidden, filterText });
  }, [fetchFiles, showHidden, filterText]);

  // 防抖获取文件列表
  const debouncedFetchFiles = useCallback((path: string = '') => {
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
    }
    
    const timeout = setTimeout(() => {
      fetchFiles(path, { showHidden, filterText });
    }, 300);
    
    setFetchTimeout(timeout);
  }, [fetchFiles, fetchTimeout, showHidden, filterText]);

  // 批量下载文件
  const downloadSelectedFiles = useCallback(async () => {
    if (!hasPermission('file_download')) {
      toast({
        title: t('insufficientPermission'),
        description: t('noDownloadPermission'),
        variant: 'destructive'
      });
      return;
    }

    if (selectedFiles.size === 0) {
      toast({
        title: tCommon('info'),
        description: t('selectFilesFirst'),
        variant: 'destructive'
      });
      return;
    }

    try {
      const pathsArray = Array.from(selectedFiles);

      // 如果只选择了一个文件夹或文件，使用单文件下载API
      if (pathsArray.length === 1) {
        const response = await fetch(`/api/files/download?username=${user?.username}&path=${encodeURIComponent(pathsArray[0])}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(t('downloadFailed'));
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // 从响应头获取文件名，或者生成默认文件名
        const contentDisposition = response.headers.get('content-disposition');
        let fileName = 'download';
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match && match[1]) {
            fileName = decodeURIComponent(match[1].replace(/['"]/g, ''));
          }
        } else {
          const pathName = pathsArray[0];
          const baseName = pathName.split('/').pop() || 'download';
          // 检查是否是文件夹（通过查找对应的file对象）
          const fileObj = files.find(f => f.path === pathName);
          fileName = fileObj?.isDirectory ? `${baseName}.zip` : baseName;
        }
        
        const { safeDownloadFile } = await import('@/lib/dom-utils');
        safeDownloadFile(url, fileName);
        window.URL.revokeObjectURL(url);
      } else {
        // 多文件下载，使用批量下载API
        const response = await fetch('/api/files/download-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            username: user?.username,
            paths: pathsArray
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || t('batchDownloadFailed'));
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // 生成下载文件名
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const fileName = `batch_download_${timestamp}.zip`;

        const { safeDownloadFile } = await import('@/lib/dom-utils');
        safeDownloadFile(url, fileName);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: tCommon('success'),
        description: t('startDownload', { count: selectedFiles.size })
      });

      // 清除选择
      setSelectedFiles(new Set());

    } catch (error) {
      console.error('下载失败:', error);
      toast({
        title: tCommon('error'),
        description: error instanceof Error ? error.message : t('downloadFailed'),
        variant: 'destructive'
      });
    }
  }, [selectedFiles, user?.username, hasPermission, toast, files, t, tCommon]);

  // 下载文件
  const downloadFile = useCallback(async (file: FileInfo) => {
    if (!hasPermission('file_download')) {
      toast({
        title: t('insufficientPermission'),
        description: t('noDownloadPermission'),
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(`/api/files/download?username=${user?.username}&path=${encodeURIComponent(file.path)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(t('downloadFailed'));
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const { safeDownloadFile } = await import('@/lib/dom-utils');
      safeDownloadFile(url, file.name);
      window.URL.revokeObjectURL(url);

      toast({
        title: tCommon('success'),
        description: t('downloadSuccess')
      });
    } catch (error) {
      console.error('下载文件失败:', error);
      toast({
        title: tCommon('error'),
        description: t('downloadFailed'),
        variant: 'destructive'
      });
    }
  }, [user?.username, hasPermission, toast, t, tCommon]);

  // 删除文件 - 使用hook的实现
  const handleDeleteFile = useCallback(async (file: FileInfo) => {
    if (!hasPermission('file_delete')) {
      toast({
        title: t('insufficientPermission'),
        description: t('noDeletePermission'),
        variant: 'destructive'
      });
      return;
    }

    if (!confirm(t('confirmDelete', { name: file.name }))) return;

    await deleteFile(file);
  }, [deleteFile, hasPermission, toast, t]);

  // 预览文件
  const handlePreviewFile = useCallback((file: FileInfo) => {
    if (!hasPermission('file_preview')) {
      toast({
        title: t('insufficientPermission'),
        description: t('noPreviewPermission'),
        variant: 'destructive'
      });
      return;
    }
    setPreviewFile(file);
  }, [hasPermission, toast]);

  // 开始重命名
  const startRename = useCallback((file: FileInfo) => {
    setEditingFile(file);
    setEditingName(file.name);
  }, []);

  // 取消重命名
  const cancelRename = useCallback(() => {
    setEditingFile(null);
    setEditingName('');
  }, []);

  // 确认重命名
  const confirmRename = useCallback(async () => {
    if (!editingFile || !editingName.trim() || editingName.trim() === editingFile.name) {
      cancelRename();
      return;
    }

    try {
      await renameFile(editingFile, editingName.trim());
      cancelRename();
    } catch (error) {
      // 错误已在hook中处理
    }
  }, [editingFile, editingName, renameFile, cancelRename]);

  // 新建文件夹处理
  const handleNewFolder = useCallback(async (folderName: string) => {
    try {
      await createDirectory(folderName);
      setNewFolderDialog(false);
    } catch (error) {
      // 错误已在hook中处理
    }
  }, [createDirectory]);

  // 格式化文件大小 - 使用useMemo优化
  const formatFileSize = useMemo(() => (bytes: number | null): string => {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // 格式化时间 - 使用useMemo优化
  const formatTime = useMemo(() => (timeStr: string): string => {
    return new Date(timeStr).toLocaleString('zh-CN');
  }, []);

  // 获取文件图标 - 使用useMemo优化
  const getFileIcon = useMemo(() => {
    const FileIcon = (file: FileInfo) => {
      if (file.isDirectory) {
        return <Folder className="w-5 h-5 text-blue-500" />;
      }
      
      const ext = file.name.split('.').pop()?.toLowerCase();
      const iconClass = "w-5 h-5 text-gray-500";
    
      switch (ext) {
        case 'pdf': return <File className={iconClass} />;
        case 'txt': return <File className={iconClass} />;
        case 'md': return <File className={iconClass} />;
        case 'json': return <File className={iconClass} />;
        case 'js': return <File className={iconClass} />;
        case 'ts': return <File className={iconClass} />;
        case 'jsx': return <File className={iconClass} />;
        case 'tsx': return <File className={iconClass} />;
        case 'html': return <File className={iconClass} />;
        case 'css': return <File className={iconClass} />;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'svg': return <File className={iconClass} />;
        default: return <File className={iconClass} />;
      }
    };
    FileIcon.displayName = 'FileIcon';
    return FileIcon;
  }, []);

  // 初始化 - 只在用户登录时触发一次
  useEffect(() => {
    if (user?.username) {
      fetchFiles('', { showHidden, filterText });
    }
  }, [user?.username, fetchFiles, showHidden, filterText]);

  useEffect(() => {
    if (user?.username) {
      fetchUserPermissions();
    }
  }, [user?.username, fetchUserPermissions]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
    };
  }, [fetchTimeout]);

  // 过滤文件列表 - 只进行搜索文本过滤，隐藏文件过滤由服务器端处理
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // 只应用搜索文本过滤，隐藏文件过滤由服务器端的showHidden参数处理
      if (filterText && !file.name.toLowerCase().includes(filterText.toLowerCase())) return false;
      return true;
    });
  }, [files, filterText]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t('pleaseLogin')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>
      {/* 面包屑导航和操作按钮同一行 */}
      <TechCard hover>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToHome}
              className="h-6 px-2"
            >
              <Home className="w-3 h-3 mr-1" />
              {/* 家目录 */}
            </Button>
            {/* <span>/</span> */}
            <input
              type="text"
              className="bg-gray-800 text-gray-200 rounded px-2 py-1 text-xs border border-gray-700 w-full max-w-xs truncate cursor-default select-all"
              value={currentPath ? `${homePath}/${currentPath}` : homePath}
              readOnly
              tabIndex={-1}
              aria-label={t('currentPath')}
            />
            {currentPath && (
              <>
                <span>/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateToParent}
                  className="h-6 px-2"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  {t('backToParent')}
                </Button>
              </>
            )}
          </div>
          {/* 操作按钮组 */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchFiles(currentPath, { showHidden, filterText });
              }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {tCommon('refresh')}
            </Button>
            {hasPermission('file_upload') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewFolderDialog(true)}
                >
                  <Folder className="w-4 h-4 mr-2" />
                  {t('newFolder')}
                </Button>
                <Button
                  onClick={() => setShowUploader(true)}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t('upload')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </TechCard>

      {/* 文件列表 */}
      <TechCard hover glowEffect>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-green-600 dark:text-green-400" />
            {t('fileList')}
          </CardTitle>

          {/* 过滤控件 */}
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            {/* 搜索框 */}
            <div className="flex-1">
              <Input
                placeholder={t('searchPlaceholder')}
                value={filterText}
                onChange={(e) => {
                  setFilterText(e.target.value);
                  // 使用防抖重新获取
                  debouncedFetchFiles(currentPath);
                }}
                className="max-w-xs"
              />
            </div>
            
            {/* 隐藏文件开关 */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showHidden}
                  onChange={(e) => {
                    const newShowHidden = e.target.checked;
                    setShowHidden(newShowHidden);
                    // 立即重新获取文件列表，使用新的showHidden状态
                    fetchFiles(currentPath, { 
                      showHidden: newShowHidden, 
                      filterText,
                      skipPathUpdate: true 
                    });
                  }}
                  className="w-4 h-4"
                />
                {t('showHidden')}
              </label>
            </div>
          </div>

          {/* 批量操作按钮区块 */}
          <div className="flex gap-2 mt-2">
            <SecondaryButton
              size="sm"
              onClick={() => {
                if (selectedFiles.size === files.length) setSelectedFiles(new Set());
                else setSelectedFiles(new Set(files.map(f => f.path)));
              }}
            >
              {selectedFiles.size === files.length ? t('deselectAll') : t('selectAll')}
            </SecondaryButton>
            {hasPermission('file_download') && (
              <SecondaryButton
                size="sm"
                disabled={selectedFiles.size === 0}
                onClick={downloadSelectedFiles}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                {t('downloadSelected')} ({selectedFiles.size})
              </SecondaryButton>
            )}
            {hasPermission('file_delete') && (
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedFiles.size === 0}
                onClick={async () => {
                  if (selectedFiles.size === 0) return;
                  if (!confirm(t('confirmDeleteSelected', { count: selectedFiles.size }))) return;
                  for (const path of Array.from(selectedFiles)) {
                    await fetch(`/api/files?username=${user.username}&path=${encodeURIComponent(path)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                  }
                  setSelectedFiles(new Set());
                  // 重新获取文件
                  fetchFiles(currentPath);
                  toast({ title: t('batchDeleteComplete') });
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {t('deleteSelected')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text={t('loading') || '加载中...'} />
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                  <Folder className="h-12 w-12 text-green-400/50" />
                  <p>{t('emptyDirectory')}</p>
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-1 p-1 hover:bg-green-500/5 rounded transition-colors text-sm min-h-[22px] group"
                    onClick={(e) => {
                      // 防止行点击干扰导航
                      e.stopPropagation();
                    }}
                  >
                    {/* 多选复选框 */}
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.path)}
                      onChange={e => {
                        const newSet = new Set(selectedFiles);
                        if (e.target.checked) newSet.add(file.path);
                        else newSet.delete(file.path);
                        setSelectedFiles(newSet);
                      }}
                      className="mr-2"
                    />
                    <div className="flex items-center gap-0.5 flex-1 min-w-0">
                      {getFileIcon(file)}
                      {editingFile?.path === file.path ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              confirmRename();
                            } else if (e.key === 'Escape') {
                              cancelRename();
                            }
                          }}
                          onBlur={confirmRename}
                          className="h-6 px-1 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className={`font-semibold truncate max-w-[400px] ${file.isDirectory ? 'cursor-pointer hover:text-blue-600' : 'cursor-default'}`}
                          title={file.name}
                          onClick={(e) => {
                            if (file.isDirectory) {
                              e.preventDefault();
                              e.stopPropagation();
                              navigateToDirectory(file.name);
                            }
                          }}
                        >
                          {file.name}
                        </span>
                      )}
                      {file.isDirectory && (
                        <Badge variant="secondary" className="text-xs ml-0.5">{t('directory')}</Badge>
                      )}
                      <span className="flex-1 text-xs text-gray-500 text-right truncate ml-0.5">
                        {formatFileSize(file.size)} • {formatTime(file.modified)}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {!file.isDirectory && hasPermission('file_preview') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0.5"
                          onClick={() => handlePreviewFile(file)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {hasPermission('file_download') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0.5"
                          onClick={() => downloadFile(file)}
                          title={file.isDirectory ? t('downloadFolderZip') : t('downloadFile')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {hasPermission('file_delete') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0.5"
                          onClick={() => startRename(file)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {hasPermission('file_delete') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0.5 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteFile(file)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </TechCard>

      {/* 文件上传器（居中弹窗+遮罩） */}
      {showUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <FileUploader
            currentPath={currentPath}
            onUploadComplete={() => {
              setShowUploader(false);
              // 重新获取文件列表
              fetchFiles(currentPath, { showHidden, filterText });
            }}
            onCancel={() => setShowUploader(false)}
          />
        </div>
      )}

      {/* 文件预览 */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* 新建文件夹对话框 */}
      {newFolderDialog && (
        <NewFolderDialog
          onConfirm={handleNewFolder}
          onCancel={() => setNewFolderDialog(false)}
        />
      )}
    </div>
  );
}