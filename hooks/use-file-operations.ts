import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

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

interface UseFileOperationsOptions {
  showHidden: boolean;
  filterText: string;
}

export function useFileOperations({ showHidden, filterText }: UseFileOperationsOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [homePath, setHomePath] = useState('');
  const [loading, setLoading] = useState(true);
  const [fileCache, setFileCache] = useState(new Map());

  // 缓存时长：5分钟
  const CACHE_DURATION = 5 * 60 * 1000;

  // 获取文件列表
  const fetchFiles = useCallback(async (path: string = '', options?: { showHidden?: boolean; filterText?: string; skipPathUpdate?: boolean }) => {
    if (!user?.username) return;
    
    const currentShowHidden = options?.showHidden ?? showHidden;
    const currentFilterText = options?.filterText ?? filterText;
    
    // 检查缓存
    const cacheKey = `${user.username}-${path}-${currentShowHidden}-${currentFilterText}`;
    
    setLoading(true);
    try {
      // 先检查缓存（同步检查）
      const currentCacheRef = fileCache;
      const cached = currentCacheRef.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Using cached data for:', cacheKey);
        setFiles(cached.data.files);
        if (!options?.skipPathUpdate) {
          setCurrentPath(cached.data.currentPath);
        }
        setHomePath(cached.data.homePath);
        setLoading(false);
        return;
      }
      
      const params = new URLSearchParams({
        username: user.username,
        path: path,
        showHidden: currentShowHidden.toString(),
        filter: currentFilterText
      });
      
      console.log('Fetching files with params:', params.toString());
      
      const response = await fetch(`/api/files?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch failed with error:', errorText);
        throw new Error(`获取文件列表失败: ${response.status} ${response.statusText}`);
      }
      
      const data: FileListResponse = await response.json();
      console.log('Received data:', data);
      
      // 缓存结果
      setFileCache(prev => new Map(prev).set(cacheKey, {
        data,
        timestamp: Date.now()
      }));
      
      setFiles(data.files);
      // 只在没有手动跳过路径更新时才更新路径
      if (!options?.skipPathUpdate) {
        setCurrentPath(data.currentPath);
      }
      setHomePath(data.homePath);
    } catch (error) {
      console.error('获取文件列表失败:', error);
      toast({
        title: '错误',
        description: error instanceof Error ? error.message : '获取文件列表失败',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user?.username, showHidden, filterText, toast]);

  // 稳定的导航函数，不依赖于filter状态
  const navigateToDirectory = useCallback((dirName: string) => {
    const newPath = currentPath ? `${currentPath}/${dirName}` : dirName;
    
    // 立即更新路径状态
    setCurrentPath(newPath);
    
    // 获取文件列表，但不让服务器响应覆盖我们的路径设置
    fetchFiles(newPath, { showHidden, filterText, skipPathUpdate: true });
  }, [currentPath, fetchFiles, showHidden, filterText]);

  const navigateToParent = useCallback(() => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    
    setCurrentPath(parentPath);
    fetchFiles(parentPath, { showHidden, filterText, skipPathUpdate: true });
  }, [currentPath, fetchFiles, showHidden, filterText]);

  const navigateToHome = useCallback(() => {
    setCurrentPath('');
    fetchFiles('', { showHidden, filterText, skipPathUpdate: true });
  }, [fetchFiles, showHidden, filterText]);

  // 删除文件
  const deleteFile = useCallback(async (file: FileInfo) => {
    if (!user?.username) return;
    
    try {
      const params = new URLSearchParams({
        username: user.username,
        path: file.path
      });
      
      console.log('Deleting file with params:', params.toString());
      
      const response = await fetch(`/api/files?${params}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Delete response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete failed with error:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || '删除失败');
      }
      
      // 只有在服务器删除成功后才更新UI
      setFiles(prevFiles => {
        const newFiles = prevFiles.filter(f => f.path !== file.path);
        return newFiles;
      });
      
      // 清除相关缓存
      setFileCache(prev => {
        const newCache = new Map(prev);
        const keysToDelete = Array.from(prev.keys()).filter(key => 
          key.includes(currentPath) || key.includes(file.path)
        );
        keysToDelete.forEach(key => newCache.delete(key));
        return newCache;
      });
      
      toast({
        title: '成功',
        description: `已删除 ${file.name}`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除失败';
      console.error('Delete error:', error);
      toast({
        title: '删除失败',
        description: message,
        variant: 'destructive'
      });
    }
  }, [user?.username, currentPath, toast]);

  // 重命名文件/目录
  const renameFile = useCallback(async (file: FileInfo, newName: string) => {
    if (!user?.username) return;
    
    try {
      console.log('Renaming file:', file.path, 'to:', newName);
      
      const response = await fetch('/api/files/rename', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: user.username,
          oldPath: file.path,
          newName: newName.trim()
        })
      });
      
      console.log('Rename response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Rename failed with error:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || '重命名失败');
      }
      
      const result = await response.json();
      
      // 更新文件列表中的文件信息
      setFiles(prevFiles => {
        return prevFiles.map(f => 
          f.path === file.path ? result.file : f
        );
      });
      
      // 清除相关缓存
      setFileCache(prev => {
        const newCache = new Map(prev);
        const keysToDelete = Array.from(prev.keys()).filter(key => 
          key.includes(currentPath) || key.includes(file.path)
        );
        keysToDelete.forEach(key => newCache.delete(key));
        return newCache;
      });
      
      toast({
        title: '成功',
        description: `已重命名为 ${newName}`
      });
      
      return result.file;
    } catch (error) {
      const message = error instanceof Error ? error.message : '重命名失败';
      console.error('Rename error:', error);
      toast({
        title: '重命名失败',
        description: message,
        variant: 'destructive'
      });
      throw error;
    }
  }, [user?.username, currentPath, toast]);

  // 创建目录
  const createDirectory = useCallback(async (dirName: string) => {
    if (!user?.username) return;
    
    try {
      console.log('Creating directory:', dirName, 'in path:', currentPath);
      
      const response = await fetch('/api/files/mkdir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: user.username,
          parentPath: currentPath,
          dirName: dirName.trim()
        })
      });
      
      console.log('Create directory response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create directory failed with error:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || '创建目录失败');
      }
      
      const result = await response.json();
      
      // 添加新目录到文件列表
      setFiles(prevFiles => {
        const newFiles = [...prevFiles, result.directory];
        // 重新排序：目录在前，文件在后
        return newFiles.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
      });
      
      // 清除相关缓存
      setFileCache(prev => {
        const newCache = new Map(prev);
        const keysToDelete = Array.from(prev.keys()).filter(key => 
          key.includes(currentPath)
        );
        keysToDelete.forEach(key => newCache.delete(key));
        return newCache;
      });
      
      toast({
        title: '成功',
        description: `目录 ${dirName} 创建成功`
      });
      
      return result.directory;
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建目录失败';
      console.error('Create directory error:', error);
      toast({
        title: '创建目录失败',
        description: message,
        variant: 'destructive'
      });
      throw error;
    }
  }, [user?.username, currentPath, toast]);

  return {
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
  };
}