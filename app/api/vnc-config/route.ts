import { NextRequest, NextResponse } from 'next/server'
import {
  generateVncUrl,
  getVncNodeHost,
  getNovncGateway,
  getNovncPort,
} from '@/lib/vnc-manager'
export const dynamic = 'force-dynamic'

// GET /api/vnc-config - 检查 noVNC 配置
export async function GET(_req: NextRequest) {
  try {
    const testHostname = await getVncNodeHost()
    const testPort = 5901
    const testUrl = await generateVncUrl(testHostname, testPort)
    const gateway = await getNovncGateway()

    return NextResponse.json({
      success: true,
      config: {
        gateway,
        novncPort: getNovncPort(),
        vncNode: testHostname,
        testUrl,
        testHostname,
        testPort,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
