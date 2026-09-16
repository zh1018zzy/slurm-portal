import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { existsSync } from 'fs'
export const dynamic = 'force-dynamic'


const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const SYSTEM_LOGO_NAME = 'system-logo.png'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const purpose = formData.get('purpose') as string // 'logo' 或其他用途

    if (!file) {
      return NextResponse.json(
        { error: '没有找到文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型，只支持 JPEG、PNG、WebP、GIF' },
        { status: 400 }
      )
    }

    // 验证文件大小 (最大 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过 5MB' },
        { status: 400 }
      )
    }

    // 确保上传目录存在
    await mkdir(UPLOAD_DIR, { recursive: true })

    let fileName: string
    let filePath: string

    // 如果是系统 logo，使用固定文件名
    if (purpose === 'logo') {
      fileName = SYSTEM_LOGO_NAME
      filePath = path.join(UPLOAD_DIR, fileName)

      // 如果旧文件存在，先删除（确保文件被替换）
      if (existsSync(filePath)) {
        try {
          await unlink(filePath)
        } catch (err) {
          console.log('删除旧 logo 失败，继续覆盖:', err)
        }
      }
    } else {
      // 其他用途使用唯一文件名
      const fileExtension = path.extname(file.name)
      fileName = `${uuidv4()}${fileExtension}`
      filePath = path.join(UPLOAD_DIR, fileName)
    }

    // 将文件写入磁盘
    const bytes = await file.arrayBuffer()
    const buffer = new Uint8Array(bytes)
    await writeFile(filePath, buffer)

    // 返回可访问的URL（添加时间戳以强制刷新）
    const timestamp = Date.now()
    const fileUrl = purpose === 'logo'
      ? `/uploads/${fileName}?v=${timestamp}`
      : `/uploads/${fileName}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('文件上传错误:', error)
    return NextResponse.json(
      { error: '文件上传失败' },
      { status: 500 }
    )
  }
} 