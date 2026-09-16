import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json(
        { success: false, message: '没有选择文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: '不支持的文件类型，请上传PNG、JPG或SVG格式的图片' },
        { status: 400 }
      )
    }

    // 验证文件大小（1MB限制）
    if (file.size > 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: '文件大小不能超过1MB' },
        { status: 400 }
      )
    }

    // 确保上传目录存在
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 生成安全的文件名
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${type}-${timestamp}.${extension}`
    const filepath = join(uploadDir, filename)

    // 将文件写入磁盘
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    return NextResponse.json({
      success: true,
      data: {
        filename: filename,
        path: `/uploads/${filename}`,
        size: file.size,
        type: file.type
      }
    })

  } catch (error) {
    console.error('文件上传失败:', error)
    return NextResponse.json(
      { success: false, message: '文件上传失败' },
      { status: 500 }
    )
  }
}