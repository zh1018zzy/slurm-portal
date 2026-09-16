'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import AdminProtected from '@/components/AdminProtected';
import { useToast } from '@/hooks/use-toast';
import { getAdminToken } from '@/lib/admin-config';
import { useT } from '@/lib/i18n-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TechCard } from '@/components/ui/tech-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  File, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Share, 
  Users,
  Loader2,
  Copy,
  CheckSquare,
  Square,
  User
} from 'lucide-react';

interface FilePermission {
  id: string;
  userId: string;
  permissionType: 'file_upload' | 'file_download' | 'file_preview' | 'file_delete' | 'file_share' | 'file_export' | 'file_copy';
  isEnabled: boolean;
}

interface User {
  id: string;
  username: string;
  real_name?: string;
  role?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  gid_number: number;
}

const PERMISSION_TYPES = [
  { value: 'file_upload', label: '文件上传', icon: Upload },
  { value: 'file_download', label: '文件下载', icon: Download },
  { value: 'file_preview', label: '文件预览', icon: Eye },
  { value: 'file_delete', label: '文件删除', icon: Trash2 },
  { value: 'file_share', label: '文件分享', icon: Share },
  { value: 'file_export', label: '文件导出', icon: File },
  { value: 'file_copy', label: '文件复制', icon: Copy }
];

// 获取管理员token
async function getAdminTokenForClient(): Promise<string> {
  try {
    // 携带当前登录用户 token 请求，后端仅向已登录的管理员签发
    const userToken = localStorage.getItem('token')
    if (!userToken) {
      console.error('未登录，无法获取管理员token')
      return ''
    }
    const response = await fetch('/api/admin/token', {
      headers: { 'Authorization': `Bearer ${userToken}` }
    })
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        return data.token
      }
    }
  } catch (error) {
    console.error('获取管理员token失败:', error)
  }
  
  // API 获取失败时不内置硬编码凭据，交由调用方错误分支处理
  return '' // 安全: 禁止硬编码管理员token, API 不可用时由调用方错误分支处理
}

export default function FilePermissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useT('system.filePermissions');
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [permissions, setPermissions] = useState<FilePermission[]>([]);
  const [groupPermissions, setGroupPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  
  // 批量管理状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [batchPermissions, setBatchPermissions] = useState<Record<string, boolean>>({});
  const [batchLoading, setBatchLoading] = useState(false);

  // 获取用户列表
  const fetchUsers = async () => {
    setUserLoading(true);
    try {
      const adminToken = await getAdminTokenForClient();
      const response = await fetch('/api/users?pageSize=100', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.users) {
          setUsers(data.users);
        } else {
          console.error('获取用户列表失败:', data);
          toast({
            title: t('error'),
            description: t('fetchUsersFailed'),
            variant: 'destructive'
          });
        }
      } else {
        console.error('获取用户列表失败:', response.status);
        toast({
          title: t('error'),
          description: t('fetchUsersFailed'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      toast({
        title: t('error'),
        description: t('fetchUsersFailed'),
        variant: 'destructive'
      });
    } finally {
      setUserLoading(false);
    }
  };

  // 获取用户权限
  const fetchUserPermissions = async (userId: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const adminToken = await getAdminTokenForClient();
      const response = await fetch(`/api/admin/file-permissions?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPermissions(data.permissions || []);
        } else {
          console.error('获取用户权限失败:', data);
          toast({
            title: t('error'),
            description: data.error || t('fetchPermissionsFailed'),
            variant: 'destructive'
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('获取用户权限失败:', response.status, errorData);
        toast({
          title: t('error'),
          description: errorData.error || t('fetchPermissionsFailed'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('获取用户权限失败:', error);
      toast({
        title: t('error'),
        description: t('fetchPermissionsFailed'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 切换权限状态
  const togglePermission = async (permissionType: string, isEnabled: boolean) => {
    if (!selectedUser) return;
    
    try {
      const adminToken = await getAdminTokenForClient();
      const response = await fetch('/api/admin/file-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser,
          permissionType,
          updates: { isEnabled }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: t('success'),
            description: t(isEnabled ? 'enableSuccess' : 'disableSuccess')
          });
          fetchUserPermissions(selectedUser);
        } else {
          toast({
            title: t('error'),
            description: data.error || t('operationFailed'),
            variant: 'destructive'
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('切换权限失败:', response.status, errorData);
        toast({
          title: t('error'),
          description: errorData.error || t('operationFailed'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('切换权限失败:', error);
      toast({
        title: t('error'),
        description: t('operationFailed'),
        variant: 'destructive'
      });
    }
  };

  // 批量切换权限
  const toggleBatchPermission = async (permissionType: string, isEnabled: boolean) => {
    if (selectedUsers.size === 0) {
      toast({
        title: t('hint'),
        description: t('selectUsersFirst'),
        variant: 'destructive'
      });
      return;
    }

    setBatchLoading(true);
    try {
      const adminToken = await getAdminTokenForClient();
      const promises = Array.from(selectedUsers).map(userId =>
        fetch('/api/admin/file-permissions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            permissionType,
            updates: { isEnabled }
          })
        })
      );

      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        toast({
          title: t('success'),
          description: t('batchOperationSuccess', {
            count: successCount,
            action: isEnabled ? t('enable') : t('disable'),
            permission: permissionType
          })
        });
        // 更新批量权限状态
        setBatchPermissions(prev => ({
          ...prev,
          [permissionType]: isEnabled
        }));
      } else {
        toast({
          title: t('partialSuccess'),
          description: t('batchOperationPartial', { success: successCount, failed: failCount }),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('批量切换权限失败:', error);
      toast({
        title: t('error'),
        description: t('batchOperationFailed'),
        variant: 'destructive'
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // 切换用户选择
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserPermissions(selectedUser);
    }
  }, [selectedUser]);

  const getPermissionIcon = (type: string) => {
    const permission = PERMISSION_TYPES.find(p => p.value === type);
    const Icon = permission?.icon || File;
    return <Icon className="w-4 h-4" />;
  };

  const getPermissionStatus = (type: string) => {
    const permission = permissions.find(p => p.permissionType === type);
    return permission?.isEnabled || false;
  };

  return (
    <AdminProtected>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/dashboard/system/groups'}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            {t('groupPermissionManagement')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'users' | 'groups')}>
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {t('userPermissions')}
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('groupPermissions')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* 用户选择 */}
          <TechCard hover>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('selectUser')}
            </div>
            <div className="flex gap-2">
              <Button
                variant={batchMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setBatchMode(!batchMode);
                  if (batchMode) {
                    setSelectedUsers(new Set());
                    setSelectedUser('');
                  }
                }}
              >
                {batchMode ? t('exitBatchMode') : t('batchManagement')}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('loadingUserList')}
            </div>
          ) : batchMode ? (
            <div className="space-y-4">
              {/* 批量操作按钮 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedUsers.size === users.length ? (
                    <>
                      <Square className="w-4 h-4 mr-1" />
                      {t('deselectAll')}
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-1" />
                      {t('selectAll')}
                    </>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('selectedCount', { count: selectedUsers.size })}
                </span>
              </div>
              
              {/* 用户列表 */}
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{user.username}</div>
                      {user.real_name && (
                        <div className="text-sm text-muted-foreground">{user.real_name}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {user.role || 'user'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectUserPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span>{user.username}</span>
                      {user.real_name && (
                        <span className="text-muted-foreground">({user.real_name})</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {user.role || 'user'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          </CardContent>
          </TechCard>

          {/* 权限配置 */}
          {((selectedUser && !batchMode) || (batchMode && selectedUsers.size > 0)) && (
            <TechCard hover>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="w-5 h-5" />
              {t('permissionConfig')}
              {!batchMode && selectedUser && (
                <span className="text-sm text-muted-foreground">
                  ({users.find(u => u.id === selectedUser)?.username})
                </span>
              )}
              {batchMode && (
                <span className="text-sm text-muted-foreground">
                  ({t('batchManageUsers', { count: selectedUsers.size })})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading || batchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                {batchMode ? t('batchOperating') : t('loadingPermissions')}
              </div>
            ) : (
              <div className="grid gap-4">
                {PERMISSION_TYPES.map((permissionType) => {
                  const isEnabled = batchMode 
                    ? batchPermissions[permissionType.value] || false
                    : getPermissionStatus(permissionType.value);
                  
                  return (
                    <div key={permissionType.value} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getPermissionIcon(permissionType.value)}
                        <div>
                          <div className="font-medium">{permissionType.label}</div>
                          {batchMode && (
                            <div className="text-sm text-muted-foreground">
                              {t('applyToUsers', { count: selectedUsers.size })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => {
                            if (batchMode) {
                              toggleBatchPermission(permissionType.value, checked);
                            } else {
                              togglePermission(permissionType.value, checked);
                            }
                          }}
                          disabled={batchLoading}
                        />
                        <Badge variant={isEnabled ? "default" : "secondary"}>
                          {isEnabled ? t('enabled') : t('disabled')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
            </TechCard>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <TechCard hover>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('groupFilePermissions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="mx-auto mb-4 w-16 h-16 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">{t('groupPermissionManagement')}</h3>
                <p className="text-gray-500 mb-4">
                  {t('groupPermissionHint')}
                </p>
                <Button
                  onClick={() => window.location.href = '/dashboard/system/groups'}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  {t('goToGroupManagement')}
                </Button>
              </div>
            </CardContent>
          </TechCard>
        </TabsContent>
      </Tabs>
    </div>
    </AdminProtected>
  );
} 