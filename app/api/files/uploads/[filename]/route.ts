import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
export const dynamic = 'force-dynamic'


export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    
    // 安全检查：确保文件名不包含路径遍历字符
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { success: false, message: '无效的文件名' },
        { status: 400 }
      )
    }

    const filepath = join(process.cwd(), 'public', 'uploads', filename)
    
    // 检查文件是否存在
    if (!existsSync(filepath)) {
      return NextResponse.json(
        { success: false, message: '文件不存在' },
        { status: 404 }
      )
    }

    // 读取文件
    const fileBuffer = await readFile(filepath)
    
    // 根据文件扩展名设置适当的Content-Type
    const extension = filename.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (extension) {
      case 'png':
        contentType = 'image/png'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'svg':
        contentType = 'image/svg+xml'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
    }

    // 返回文件内容
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // 缓存一年
      },
    })

  } catch (error) {
    console.error('文件服务失败:', error)
    return NextResponse.json(
      { success: false, message: '文件服务失败' },
      { status: 500 }
    )
  }
}