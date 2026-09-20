import { NextRequest } from 'next/server'
import { slurmAdapter } from '@/lib/scheduler/slurm-adapter'
export const dynamic = 'force-dynamic'


// GET /api/jobs/{id}/logs 获取作业日志
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const logs = await slurmAdapter.getJobLogs(resolvedParams.id)
    return Response.json({ success: true, logs })
  } catch (e: any) {
    return Response.json({ 
      success: false, 
      message: e.message,
      logs: { stdout: '', stderr: '' }
    })
  }
} 