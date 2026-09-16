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
  const { UserHomeManager } = await import('@/lib/user-home-manager');
  return UserHomeManager.getUserHome(username);
}

// 递归添加文件/目录到压缩包
async function addToArchive(archive: archiver.Archiver, fullPath: string, entryName: string): Promise<void> {
  try {
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      // 添加目录
      archive.directory(fullPath, entryName);
    } else {
      // 添加文件
      archive.file(fullPath, { name: entryName });
    }
  } catch (error) {
    console.error(`添加到压缩包失败: ${fullPath}`, error);
    // 继续处理其他文件，不要因为单个文件失败而中断整个过程
  }
}

// POST: 批量下载文件和文件夹
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { username, paths, archiveName } = body;

    if (!username || !paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 });
    }

    // 检查下载权限
    const permissionRequest = {
      userId: userInfo.id,
      username: userInfo.username,
      operationType: 'file_download' as const,
      filePath: paths.join(', '),
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
    
    // 验证所有路径都在用户目录内
    const fullPaths = paths.map(p => path.resolve(homeDir, p));
    for (const fullPath of fullPaths) {
      if (!fullPath.startsWith(homeDir)) {
        return NextResponse.json({ error: '访问路径超出允许范围' }, { status: 403 });
      }
    }

    // 生成压缩包名称
    const defaultArchiveName = paths.length === 1 
      ? `${path.basename(paths[0])}.zip`
      : `download_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.zip`;
    
    const finalArchiveName = archiveName || defaultArchiveName;

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

    // 添加文件和目录到压缩包
    for (let i = 0; i < paths.length; i++) {
      const relativePath = paths[i];
      const fullPath = fullPaths[i];
      
      try {
        // 检查文件是否存在
        await fs.access(fullPath);
        
        // 只使用文件名作为ZIP包内的路径，避免深层目录结构
        const entryName = path.basename(relativePath);
        
        await addToArchive(archive, fullPath, entryName);
      } catch (error) {
        console.error(`文件不存在或无法访问: ${fullPath}`, error);
        // 继续处理其他文件
      }
    }

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
        'Content-Disposition': `attachment; filename="${encodeURIComponent(finalArchiveName)}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('批量下载失败:', error);
    return NextResponse.json({ 
      error: '批量下载失败: ' + (error instanceof Error ? error.message : String(error)) 
    }, { status: 500 });
  }
}