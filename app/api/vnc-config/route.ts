import { NextRequest, NextResponse } from 'next/server'
import { generateVncUrl } from '@/lib/vnc-manager'
export const dynamic = 'force-dynamic'


// GET /api/vnc-config - 检查 noVNC 配置
export async function GET(req: NextRequest) {
  try {
    // 使用DEFAULT_VNC_NODE_IP环境变量
    const testHostname = process.env.DEFAULT_VNC_NODE_IP || 'localhost'
    const testPort = 5901
    const testUrl = generateVncUrl(testHostname, testPort)
    
    return NextResponse.json({
      success: true,
      config: {
        gateway: process.env.NOVNC_GATEWAY || 'localhost',
        testUrl,
        testHostname,
        testPort
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 