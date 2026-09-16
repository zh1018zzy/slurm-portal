'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Upload, File } from 'lucide-react';
import { authFetch } from '@/lib/utils';
import { useT } from '@/lib/i18n-utils';

interface FileUploaderProps {
  currentPath: string;
  onUploadComplete: () => void;
  onCancel: () => void;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function FileUploader({ currentPath, onUploadComplete, onCancel }: FileUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useT('files');
  const tCommon = useT('common');
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const
    }));
    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFilesToServer = async () => {
    if (!user?.username || uploadFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    // 优化：并行上传，但限制并发数
    const batchSize = 3; // 限制并发上传数
    const batches = [];
    
    for (let i = 0; i < uploadFiles.length; i += batchSize) {
      batches.push(uploadFiles.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchPromises = batch.map(async (uploadFile, batchFileIndex) => {
        const globalIndex = batchIndex * batchSize + batchFileIndex;
        
        // 跳过已完成的文件
        if (uploadFile.status === 'completed') {
          successCount++;
          return;
        }

        // 更新状态为上传中
        setUploadFiles(prev => prev.map((file, index) => 
          index === globalIndex ? { ...file, status: 'uploading' } : file
        ));

        try {
          const formData = new FormData();
          formData.append('file', uploadFile.file);
          formData.append('username', user.username);
          formData.append('path', currentPath);

          const response = await authFetch('/api/files', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(t('uploadFailed'));
          }

          // 更新进度和状态
          setUploadFiles(prev => prev.map((file, index) =>
            index === globalIndex ? { ...file, progress: 100, status: 'completed' } : file
          ));
          successCount++;

        } catch (error) {
          console.error('文件上传失败:', error);
          setUploadFiles(prev => prev.map((file, index) =>
            index === globalIndex ? {
              ...file,
              status: 'error',
              error: error instanceof Error ? error.message : t('uploadFailed')
            } : file
          ));
          errorCount++;
        }
      });

      // 等待当前批次完成
      await Promise.all(batchPromises);
    }

    setUploading(false);

    if (successCount > 0) {
      toast({
        title: t('uploadSuccessTitle'),
        description: t('uploadSuccessDesc', { count: successCount })
      });
      onUploadComplete();
    }

    if (errorCount > 0) {
      toast({
        title: t('uploadFailedTitle'),
        description: t('uploadFailedDesc', { count: errorCount }),
        variant: 'destructive'
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('upload')}</span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 拖拽区域 */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          {isDragActive ? (
            <p className="text-blue-600">{t('dragDropHere')}</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">{t('dragDropOrClick')}</p>
              <p className="text-sm text-gray-500">{t('multipleFilesSupported')}</p>
            </div>
          )}
        </div>

        {/* 文件列表 */}
        {uploadFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">{t('filesToUpload')} ({uploadFiles.length})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uploadFiles.map((uploadFile, index) => (
                <div
                  key={`${uploadFile.file.name}-${index}`}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">{uploadFile.file.name}</span>
                      <span className="text-sm text-gray-500">
                        {formatFileSize(uploadFile.file.size)}
                      </span>
                    </div>
                    <Progress 
                      value={uploadFile.progress} 
                      className="h-2"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {uploadFile.status === 'pending' && t('pendingUpload')}
                        {uploadFile.status === 'uploading' && tCommon('uploading')}
                        {uploadFile.status === 'completed' && t('uploadComplete')}
                        {uploadFile.status === 'error' && uploadFile.error}
                      </span>
                      {uploadFile.status === 'completed' && (
                        <span className="text-xs text-green-600">✓</span>
                      )}
                      {uploadFile.status === 'error' && (
                        <span className="text-xs text-red-600">✗</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={uploadFile.status === 'uploading'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={uploadFilesToServer}
            disabled={uploading || uploadFiles.length === 0}
          >
            {uploading ? tCommon('uploading') : t('startUpload')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 