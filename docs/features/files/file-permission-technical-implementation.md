# 文件权限系统技术实现详细文档

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 📁 文件结构

```
my-hpcapp/
├── lib/
│   ├── file-permission-checker.ts    # 文件权限检查器
│   ├── permission-checker.ts         # 通用权限检查器
│   └── jwt.ts                       # JWT工具
├── app/
│   ├── api/
│   │   ├── files/route.ts           # 文件API（已集成权限检查）
│   │   └── admin/
│   │       └── file-permissions/
│   │           └── route.ts         # 管理员权限管理API
│   └── dashboard/
│       └── system/
│           └── permissions/
│               ├── layout.tsx       # 权限管理布局
│               └── file-permissions/
│                   └── page.tsx     # 文件权限管理页面
├── db/
│   └── create_permissions_tables.sql # 权限表创建脚本
├── docs/
│   ├── file-permission-management.md # 功能说明文档
│   ├── file-permission-system-summary.md # 系统总结文档
│   └── file-permission-technical-implementation.md # 技术实现文档
└── scripts/
    └── test-admin-permissions.js    # 权限测试脚本
```

## 🔧 核心代码实现

### 1. 文件权限检查器 (`lib/file-permission-checker.ts`)

#### 接口定义
```typescript
export interface FilePermission {
  id: string
  userId: string
  permissionType: 'file_upload' | 'file_download' | 'file_preview' | 'file_delete' | 'file_share' | 'file_export'
  isEnabled: boolean
  isActive: boolean
  fileTypes?: string[]
  maxFileSize?: number
  allowedPaths?: string[]
  deniedPaths?: string[]
  quotaLimit?: number
  timeRestrictions?: any
  expiresAt?: string
}

export interface FileOperationRequest {
  userId: string
  username: string
  operationType: 'file_upload' | 'file_download' | 'file_preview' | 'file_delete' | 'file_share' | 'file_export'
  filePath?: string
  fileSize?: number
  fileType?: string
  ipAddress?: string
}

export interface FilePermissionResult {
  hasPermission: boolean
  reason?: string
  quotaUsed?: number
  quotaRemaining?: number
}
```

#### 主要函数实现

##### 权限检查主函数
```typescript
export async function checkFilePermission(request: FileOperationRequest): Promise<FilePermissionResult> {
  try {
    // 1. 获取用户文件权限
    const { data: permissions, error } = await supabase
      .from('file_permissions')
      .select('*')
      .eq('user_id', request.userId)
      .eq('permission_type', request.operationType)
      .eq('is_enabled', true)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .or('expires_at.is.null')

    if (error) {
      console.error('获取文件权限失败:', error)
      return { hasPermission: false, reason: '权限查询失败' }
    }

    if (!permissions || permissions.length === 0) {
      return { hasPermission: false, reason: '未配置文件权限' }
    }

    // 2. 检查每个权限配置
    for (const permission of permissions) {
      const result = await validateFilePermission(permission, request)
      if (result.hasPermission) {
        return result
      }
    }

    return { hasPermission: false, reason: '权限验证失败' }
  } catch (error) {
    console.error('文件权限检查失败:', error)
    return { hasPermission: false, reason: '权限检查异常' }
  }
}
```

##### 权限验证函数
```typescript
async function validateFilePermission(permission: any, request: FileOperationRequest): Promise<FilePermissionResult> {
  // 1. 检查文件类型限制
  if (permission.file_types && permission.file_types.length > 0) {
    if (request.fileType && !permission.file_types.includes(request.fileType)) {
      return { hasPermission: false, reason: '文件类型不被允许' }
    }
  }

  // 2. 检查文件大小限制
  if (permission.max_file_size && request.fileSize) {
    if (request.fileSize > permission.max_file_size) {
      return { hasPermission: false, reason: `文件大小超过限制 (${formatFileSize(permission.max_file_size)})` }
    }
  }

  // 3. 检查路径限制
  if (request.filePath) {
    // 检查允许路径
    if (permission.allowed_paths && permission.allowed_paths.length > 0) {
      const isAllowed = permission.allowed_paths.some((path: string) => 
        request.filePath!.startsWith(path)
      )
      if (!isAllowed) {
        return { hasPermission: false, reason: '路径不在允许范围内' }
      }
    }

    // 检查禁止路径
    if (permission.denied_paths && permission.denied_paths.length > 0) {
      const isDenied = permission.denied_paths.some((path: string) => 
        request.filePath!.startsWith(path)
      )
      if (isDenied) {
        return { hasPermission: false, reason: '路径被禁止访问' }
      }
    }
  }

  // 4. 检查配额限制
  if (permission.quota_limit) {
    const quotaUsed = await getUserQuotaUsed(request.userId)
    const quotaRemaining = permission.quota_limit - quotaUsed
    
    if (request.fileSize && request.fileSize > quotaRemaining) {
      return { 
        hasPermission: false, 
        reason: '存储配额不足',
        quotaUsed,
        quotaRemaining
      }
    }
  }

  // 5. 检查时间限制
  if (permission.time_restrictions) {
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay()
    
    const restrictions = permission.time_restrictions
    if (restrictions.allowed_hours && !restrictions.allowed_hours.includes(currentHour)) {
      return { hasPermission: false, reason: '当前时间不允许此操作' }
    }
    
    if (restrictions.allowed_days && !restrictions.allowed_days.includes(currentDay)) {
      return { hasPermission: false, reason: '当前日期不允许此操作' }
    }
  }

  return { hasPermission: true }
}
```

##### 配额管理函数
```typescript
async function getUserQuotaUsed(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('file_operation_logs')
      .select('file_size')
      .eq('user_id', userId)
      .eq('operation_type', 'file_upload')
      .eq('result', 'granted')

    if (error || !data) {
      return 0
    }

    return data.reduce((total, log) => total + (log.file_size || 0), 0)
  } catch (error) {
    console.error('获取用户配额使用情况失败:', error)
    return 0
  }
}
```

##### 日志记录函数
```typescript
export async function logFileOperation(request: FileOperationRequest, result: FilePermissionResult): Promise<void> {
  try {
    await supabase
      .from('file_operation_logs')
      .insert({
        user_id: request.userId,
        username: request.username,
        operation_type: request.operationType,
        file_path: request.filePath,
        file_size: request.fileSize,
        file_type: request.fileType,
        result: result.hasPermission ? 'granted' : 'denied',
        reason: result.reason,
        ip_address: request.ipAddress
      })
  } catch (error) {
    console.error('记录文件操作日志失败:', error)
  }
}
```

### 2. 文件API集成 (`app/api/files/route.ts`)

#### 文件上传权限检查
```typescript
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const username = formData.get('username') as string
    const uploadPath = formData.get('path') as string || ''
    
    if (!file || !username) {
      return NextResponse.json({ error: '文件或用户名不能为空' }, { status: 400 })
    }
    
    // 检查文件上传权限
    const permissionRequest = {
      userId: userInfo.id,
      username: userInfo.username,
      operationType: 'file_upload' as const,
      filePath: uploadPath,
      fileSize: file.size,
      fileType: file.name.split('.').pop()?.toLowerCase(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }
    
    const permissionResult = await checkFilePermission(permissionRequest)
    
    // 记录操作日志
    await logFileOperation(permissionRequest, permissionResult)
    
    if (!permissionResult.hasPermission) {
      return NextResponse.json({ 
        error: `上传权限不足: ${permissionResult.reason}`,
        quotaUsed: permissionResult.quotaUsed,
        quotaRemaining: permissionResult.quotaRemaining
      }, { status: 403 })
    }
    
    // 执行文件上传操作
    const homeDir = await getUserHomeDir(username)
    const targetDir = uploadPath ? path.resolve(homeDir, uploadPath) : homeDir
    
    // 安全检查
    if (!targetDir.startsWith(homeDir)) {
      return NextResponse.json({ error: '上传路径超出允许范围' }, { status: 403 })
    }
    
    // 确保目标目录存在
    await fs.mkdir(targetDir, { recursive: true })
    
    const filePath = path.join(targetDir, file.name)
    const bytes = await file.arrayBuffer()
    
    await fs.writeFile(filePath, new Uint8Array(bytes))
    
    return NextResponse.json({ 
      message: '文件上传成功',
      file: await getFileInfo(filePath)
    })
  } catch (error) {
    console.error('文件上传失败:', error)
    return NextResponse.json({ error: '文件上传失败' }, { status: 500 })
  }
}
```

#### 文件删除权限检查
```typescript
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const filePath = searchParams.get('path')
    
    if (!username || !filePath) {
      return NextResponse.json({ error: '用户名和文件路径不能为空' }, { status: 400 })
    }
    
    // 检查文件删除权限
    const permissionRequest = {
      userId: userInfo.id,
      username: userInfo.username,
      operationType: 'file_delete' as const,
      filePath: filePath,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }
    
    const permissionResult = await checkFilePermission(permissionRequest)
    
    // 记录操作日志
    await logFileOperation(permissionRequest, permissionResult)
    
    if (!permissionResult.hasPermission) {
      return NextResponse.json({ 
        error: `删除权限不足: ${permissionResult.reason}` 
      }, { status: 403 })
    }
    
    // 执行文件删除操作
    const homeDir = await getUserHomeDir(username)
    const fullPath = path.resolve(homeDir, filePath)
    
    // 安全检查
    if (!fullPath.startsWith(homeDir)) {
      return NextResponse.json({ error: '删除路径超出允许范围' }, { status: 403 })
    }
    
    const stats = await fs.stat(fullPath)
    
    if (stats.isDirectory()) {
      await fs.rmdir(fullPath, { recursive: true })
    } else {
      await fs.unlink(fullPath)
    }
    
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除文件失败:', error)
    return NextResponse.json({ error: '删除文件失败' }, { status: 500 })
  }
}
```

### 3. 管理员API (`app/api/admin/file-permissions/route.ts`)

#### 获取用户权限
```typescript
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo || !userInfo.isAdmin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 })
    }
    
    const permissions = await getUserFilePermissions(userId)
    
    return NextResponse.json({
      success: true,
      permissions
    })
  } catch (error) {
    console.error('获取用户文件权限失败:', error)
    return NextResponse.json({ error: '获取用户文件权限失败' }, { status: 500 })
  }
}
```

#### 更新用户权限
```typescript
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo || !userInfo.isAdmin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }
    
    const body = await request.json()
    const { userId, permissionType, updates } = body
    
    if (!userId || !permissionType) {
      return NextResponse.json({ error: '用户ID和权限类型不能为空' }, { status: 400 })
    }
    
    const success = await updateUserFilePermission(userId, permissionType, updates)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '权限更新成功'
      })
    } else {
      return NextResponse.json({ error: '权限更新失败' }, { status: 500 })
    }
  } catch (error) {
    console.error('更新用户文件权限失败:', error)
    return NextResponse.json({ error: '更新用户文件权限失败' }, { status: 500 })
  }
}
```

### 4. 前端管理界面 (`app/dashboard/system/permissions/file-permissions/page.tsx`)

#### 主要状态管理
```typescript
export default function FilePermissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [permissions, setPermissions] = useState<FilePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPermission, setEditingPermission] = useState<FilePermission | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
```

#### 权限获取函数
```typescript
const fetchUserPermissions = async (userId: string) => {
  if (!userId) return;
  
  setLoading(true);
  try {
    const response = await fetch(`/api/admin/file-permissions?userId=${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setPermissions(data.permissions || []);
    } else {
      toast({
        title: '错误',
        description: '获取用户权限失败',
        variant: 'destructive'
      });
    }
  } catch (error) {
    console.error('获取用户权限失败:', error);
    toast({
      title: '错误',
      description: '获取用户权限失败',
      variant: 'destructive'
    });
  } finally {
    setLoading(false);
  }
};
```

#### 权限更新函数
```typescript
const updatePermission = async (permission: Partial<FilePermission>) => {
  if (!selectedUser) return;
  
  try {
    const response = await fetch('/api/admin/file-permissions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: selectedUser,
        permissionType: permission.permissionType,
        updates: permission
      })
    });
    
    if (response.ok) {
      toast({
        title: '成功',
        description: '权限更新成功'
      });
      fetchUserPermissions(selectedUser);
      setShowEditDialog(false);
      setEditingPermission(null);
    } else {
      const data = await response.json();
      toast({
        title: '错误',
        description: data.error || '权限更新失败',
        variant: 'destructive'
      });
    }
  } catch (error) {
    console.error('更新权限失败:', error);
    toast({
      title: '错误',
      description: '权限更新失败',
      variant: 'destructive'
    });
  }
};
```

## 🗄️ 数据库设计

### 1. 权限表结构

```sql
-- 文件权限表
CREATE TABLE file_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID,
    department_id UUID,
    permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
        'file_upload', 'file_download', 'file_preview', 'file_delete', 'file_share', 'file_export'
    )),
    is_enabled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    file_types TEXT[] DEFAULT '{}',
    max_file_size BIGINT DEFAULT 104857600, -- 100MB
    allowed_paths TEXT[] DEFAULT '{}',
    denied_paths TEXT[] DEFAULT '{}',
    quota_limit BIGINT DEFAULT 1073741824, -- 1GB
    time_restrictions JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 文件操作日志表
CREATE TABLE file_operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    operation_type VARCHAR(50) NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    file_type VARCHAR(100),
    result VARCHAR(20) NOT NULL, -- 'granted' or 'denied'
    reason TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. 索引优化

```sql
-- 性能优化索引
CREATE INDEX IF NOT EXISTS idx_file_permissions_user_id ON file_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_type ON file_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_file_permissions_enabled ON file_permissions(is_enabled);

CREATE INDEX IF NOT EXISTS idx_file_operation_logs_user_id ON file_operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_created_at ON file_operation_logs(created_at);
```

### 3. 触发器

```sql
-- 创建触发器函数来更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为权限表添加 updated_at 触发器
CREATE TRIGGER update_file_permissions_updated_at 
BEFORE UPDATE ON file_permissions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🧪 测试实现

### 1. 测试脚本 (`scripts/test-admin-permissions.js`)

```javascript
const jwt = require('jsonwebtoken');

// 使用与系统相同的secret
const SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';

// 生成管理员token
const adminPayload = {
  username: 'admin',
  role: 'admin',
  isAdmin: true,
  id: 'admin-user-id'
};

const adminToken = jwt.sign(adminPayload, SECRET, { expiresIn: '7d' });
console.log('Admin Token:', adminToken);

// 生成普通用户token
const userPayload = {
  username: 'testuser3',
  role: 'user',
  isAdmin: false,
  id: 'testuser3-id'
};

const userToken = jwt.sign(userPayload, SECRET, { expiresIn: '7d' });
console.log('User Token:', userToken);

// 测试权限API
const testPermissions = async () => {
  const fetch = require('node-fetch');
  
  console.log('\n=== 测试管理员权限API ===');
  
  // 测试管理员访问
  try {
    const adminResponse = await fetch('http://localhost:3000/api/admin/file-permissions?userId=testuser3', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const adminData = await adminResponse.json();
    console.log('管理员访问结果:', adminData);
  } catch (error) {
    console.error('管理员访问失败:', error.message);
  }
  
  // 测试普通用户访问
  try {
    const userResponse = await fetch('http://localhost:3000/api/admin/file-permissions?userId=testuser3', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const userData = await userResponse.json();
    console.log('普通用户访问结果:', userData);
  } catch (error) {
    console.error('普通用户访问失败:', error.message);
  }
};

testPermissions();
```

### 2. 测试结果

```bash
# 运行测试脚本
node scripts/test-admin-permissions.js

# 输出结果
Admin Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
User Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

=== 测试管理员权限API ===
管理员访问结果: { success: true, permissions: [] }
普通用户访问结果: { error: '需要管理员权限' }
```

## 🔒 安全实现

### 1. 权限验证流程

```typescript
// 1. 用户身份验证
const userInfo = verifyJwt(token)
if (!userInfo) {
  return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 })
}

// 2. 管理员权限验证
if (!userInfo.isAdmin) {
  return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
}

// 3. 文件操作权限验证
const permissionResult = await checkFilePermission(permissionRequest)
if (!permissionResult.hasPermission) {
  return NextResponse.json({ 
    error: `权限不足: ${permissionResult.reason}` 
  }, { status: 403 })
}

// 4. 路径安全检查
if (!fullPath.startsWith(homeDir)) {
  return NextResponse.json({ error: '路径超出允许范围' }, { status: 403 })
}
```

### 2. 路径安全实现

```typescript
// 路径规范化
const fullPath = path.resolve(homeDir, filePath)

// 路径范围检查
if (!fullPath.startsWith(homeDir)) {
  return NextResponse.json({ error: '路径超出允许范围' }, { status: 403 })
}

// 允许路径检查
if (permission.allowed_paths && permission.allowed_paths.length > 0) {
  const isAllowed = permission.allowed_paths.some((path: string) => 
    request.filePath!.startsWith(path)
  )
  if (!isAllowed) {
    return { hasPermission: false, reason: '路径不在允许范围内' }
  }
}

// 禁止路径检查
if (permission.denied_paths && permission.denied_paths.length > 0) {
  const isDenied = permission.denied_paths.some((path: string) => 
    request.filePath!.startsWith(path)
  )
  if (isDenied) {
    return { hasPermission: false, reason: '路径被禁止访问' }
  }
}
```

### 3. 配额控制实现

```typescript
// 配额使用计算
async function getUserQuotaUsed(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('file_operation_logs')
    .select('file_size')
    .eq('user_id', userId)
    .eq('operation_type', 'file_upload')
    .eq('result', 'granted')

  if (error || !data) {
    return 0
  }

  return data.reduce((total, log) => total + (log.file_size || 0), 0)
}

// 配额检查
if (permission.quota_limit) {
  const quotaUsed = await getUserQuotaUsed(request.userId)
  const quotaRemaining = permission.quota_limit - quotaUsed
  
  if (request.fileSize && request.fileSize > quotaRemaining) {
    return { 
      hasPermission: false, 
      reason: '存储配额不足',
      quotaUsed,
      quotaRemaining
    }
  }
}
```

## 📈 性能优化

### 1. 缓存策略

```typescript
// 权限配置缓存
const permissionCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

async function getCachedPermission(userId: string, permissionType: string) {
  const cacheKey = `${userId}-${permissionType}`
  const cached = permissionCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  // 从数据库获取权限
  const permissions = await getUserFilePermissions(userId)
  
  // 缓存结果
  permissionCache.set(cacheKey, {
    data: permissions,
    timestamp: Date.now()
  })
  
  return permissions
}
```

### 2. 批量操作

```typescript
// 批量权限检查
async function checkMultiplePermissions(requests: FileOperationRequest[]): Promise<FilePermissionResult[]> {
  const results = await Promise.all(
    requests.map(request => checkFilePermission(request))
  )
  return results
}

// 批量日志记录
async function logMultipleOperations(requests: FileOperationRequest[], results: FilePermissionResult[]): Promise<void> {
  const logs = requests.map((request, index) => ({
    user_id: request.userId,
    username: request.username,
    operation_type: request.operationType,
    file_path: request.filePath,
    file_size: request.fileSize,
    file_type: request.fileType,
    result: results[index].hasPermission ? 'granted' : 'denied',
    reason: results[index].reason,
    ip_address: request.ipAddress
  }))
  
  await supabase.from('file_operation_logs').insert(logs)
}
```

### 3. 异步处理

```typescript
// 异步权限检查
async function checkPermissionAsync(request: FileOperationRequest): Promise<FilePermissionResult> {
  // 立即返回基本检查结果
  const basicCheck = await checkBasicPermission(request)
  
  // 异步进行详细检查
  checkDetailedPermission(request).then(result => {
    if (result.hasPermission !== basicCheck.hasPermission) {
      // 更新缓存和日志
      updatePermissionCache(request, result)
      logPermissionChange(request, basicCheck, result)
    }
  })
  
  return basicCheck
}
```

## 🔧 部署配置

### 1. 环境变量

```bash
# JWT配置
export JWT_SECRET="your-secure-jwt-secret"

# 数据库配置
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-supabase-key"

# 应用配置
export NODE_ENV="production"
export PORT="3000"

# 权限配置
export DEFAULT_FILE_SIZE_LIMIT="104857600"  # 100MB
export DEFAULT_QUOTA_LIMIT="1073741824"     # 1GB
export PERMISSION_CACHE_DURATION="300000"   # 5分钟
```

### 2. 数据库初始化

```bash
# 创建权限表
psql -d your_database -f db/create_permissions_tables.sql

# 验证表创建
psql -d your_database -c "\dt file_permissions"
psql -d your_database -c "\dt file_operation_logs"

# 创建默认权限
psql -d your_database -c "
INSERT INTO file_permissions (user_id, permission_type, is_enabled, max_file_size, quota_limit)
SELECT id, 'file_upload', true, 104857600, 1073741824 FROM users WHERE role = 'admin';
"
```

### 3. 监控配置

```sql
-- 配额使用监控查询
SELECT 
  u.username,
  fp.quota_limit,
  COALESCE(SUM(fol.file_size), 0) as used_quota,
  (fp.quota_limit - COALESCE(SUM(fol.file_size), 0)) as remaining_quota,
  ROUND((COALESCE(SUM(fol.file_size), 0)::float / fp.quota_limit * 100, 2) as usage_percent
FROM users u
LEFT JOIN file_permissions fp ON u.id = fp.user_id AND fp.permission_type = 'file_upload'
LEFT JOIN file_operation_logs fol ON u.id = fol.user_id AND fol.operation_type = 'file_upload' AND fol.result = 'granted'
WHERE fp.quota_limit IS NOT NULL
GROUP BY u.username, fp.quota_limit
ORDER BY usage_percent DESC;
```

## 📊 总结

文件权限系统的技术实现提供了：

### ✅ 核心功能
- **完整的权限检查机制**：支持多种权限类型和限制条件
- **安全的路径验证**：防止路径遍历和越权访问
- **精确的配额控制**：实时监控和限制存储使用
- **完整的审计日志**：记录所有文件操作和权限检查

### 🚀 性能特性
- **缓存优化**：权限配置和配额使用缓存
- **批量操作**：批量权限检查和日志记录
- **异步处理**：非阻塞的权限验证和日志记录

### 🔒 安全特性
- **多层验证**：用户身份、权限配置、操作限制
- **路径安全**：严格的路径范围检查和规范化
- **配额控制**：实时监控和限制存储使用
- **完整日志**：详细的操作审计和权限检查记录

这个技术实现为HPC环境提供了强大、安全、高性能的文件权限管理能力。 
