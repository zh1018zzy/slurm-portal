import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { PassThrough } from 'stream';

import { verifyJwt } from '@/lib/jwt';
import { checkFilePermission, logFileOperation } from '@/lib/file-permission-checker';

// 强制动态渲染，因为使用了 request.headers
export const dynamic = 'force-dynamic';

// 获取用户家目录
async function getUserHomeDir(username: string): Promise<string> {
  const { UserHomeManager } = await import('@/lib/user-home-manager')
  return UserHomeManager.getUserHome(username)
}

// 获取文件内容
async function getFileContent(filePath: string, encoding: BufferEncoding = 'utf8') {
  try {
    const content = await fs.readFile(filePath, encoding);
    return content;
  } catch (error) {
    console.error('读取文件失败:', error);
    throw error;
  }
}

// GET: 下载文件或文件夹
export async function GET(request: NextRequest) {
  // 构建时保护 - 返回默认响应
  if (process.env.NODE_ENV === 'production' && !request.url.includes('username=')) {
    return NextResponse.json({ 
      error: '构建时无法访问此API'
    }, { status: 400 })
  }

  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const userInfo = verifyJwt(token);
    if (!userInfo) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const filePath = searchParams.get('path');
    const action = searchParams.get('action') || 'download'; // download 或 preview
    
    if (!username || !filePath) {
      return NextResponse.json({ error: '用户名和文件路径不能为空' }, { status: 400 });
    }
    
    // 检查下载权限
    const permissionRequest = {
      userId: userInfo.id,
      username: userInfo.username,
      operationType: 'file_download' as const,
      filePath: filePath,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    };
    
    const permissionResult = await checkFilePermission(permissionRequest);
    
    // 记录操作日志
    await logFileOperation(permissionRequest, permissionResult);
    
    if (!permissionResult.hasPermission) {
      return NextResponse.json({ 
        error: `下载权限不足: ${permissionResult.reason}` 
      }, { status: 403 });
    }
    
    const homeDir = await getUserHomeDir(username);
    const fullPath = path.resolve(homeDir, filePath);
    
    // 安全检查
    if (!fullPath.startsWith(homeDir)) {
      return NextResponse.json({ error: '访问路径超出允许范围' }, { status: 403 });
    }
    
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      // 文件夹下载 - 打包成ZIP
      const folderName = path.basename(fullPath);
      const archiveName = `${folderName}.zip`;
      
      // 创建PassThrough流来传输压缩包
      const stream = new PassThrough();

      // 创建压缩包
      const archive = archiver('zip', {
        zlib: { level: 6 } // 压缩级别 (0-9)
      });

      // 错误处理
      archive.on('error', (err) => {
        console.error('压缩包创建错误:', err);
        stream.destroy(err);
      });

      // 将压缩包数据写入流
      archive.pipe(stream);

      // 添加整个目录到压缩包
      archive.directory(fullPath, folderName);

      // 完成压缩包
      await archive.finalize();

      // 将Node.js流转换为Web Stream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          stream.on('end', () => {
            controller.close();
          });
          stream.on('error', (err) => {
            controller.error(err);
          });
        }
      });

      // 创建响应
      return new NextResponse(webStream, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(archiveName)}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }
    
    if (action === 'preview') {
      // 预览模式：返回文件内容
      const content = await getFileContent(fullPath);
      const fileName = path.basename(fullPath);
      const fileExt = path.extname(fileName).toLowerCase();
      
      // 根据文件类型设置Content-Type
      let contentType = 'text/plain';
      if (fileExt === '.json') contentType = 'application/json';
      else if (fileExt === '.html' || fileExt === '.htm') contentType = 'text/html';
      else if (fileExt === '.css') contentType = 'text/css';
      else if (fileExt === '.js') contentType = 'application/javascript';
      else if (fileExt === '.xml') contentType = 'application/xml';
      else if (fileExt === '.md') contentType = 'text/markdown';
      
      return new NextResponse(content, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': stats.size.toString(),
        },
      });
    } else {
      // 下载模式：返回文件流
      const fileBuffer = await fs.readFile(fullPath);
      const fileName = path.basename(fullPath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': stats.size.toString(),
        },
      });
    }
  } catch (error) {
    console.error('文件操作失败:', error);
    return NextResponse.json({ error: '文件操作失败' }, { status: 500 });
  }
} 