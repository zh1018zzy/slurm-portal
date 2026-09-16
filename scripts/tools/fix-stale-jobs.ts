#!/usr/bin/env npx tsx

/**
 * 修复数据库中过期的RUNNING/PENDING作业
 * 对比SLURM实际状态，更新数据库中不一致的作业
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

interface SlurmJob {
  jobId: string
  state: string
  submitTime: string
  startTime: string
  endTime: string
}

// 获取SLURM中作业的实际状态
function getSlurmJobStatus(jobId: string): SlurmJob | null {
  try {
    const output = execSync(
      `sacct -j ${jobId} --format=JobID,State,Submit,Start,End --noheader --parsable2`,
      { encoding: 'utf-8', timeout: 10000 }
    )

    const lines = output.trim().split('\n').filter(line => !line.includes('.batch') && !line.includes('.extern'))
    if (lines.length === 0) return null

    const [jobIdStr, state, submit, start, end] = lines[0].split('|')

    return {
      jobId: jobIdStr.trim(),
      state: state.trim(),
      submitTime: submit.trim(),
      startTime: start.trim(),
      endTime: end.trim()
    }
  } catch (error) {
    console.error(`获取作业 ${jobId} 状态失败:`, error)
    return null
  }
}

// 标准化SLURM状态
function normalizeSlurmStatus(state: string): string {
  const upperState = state.toUpperCase()

  // 处理复合状态（例如 "CANCELLED by 123"）
  if (upperState.includes('CANCELLED')) return 'CANCELLED'
  if (upperState.includes('TIMEOUT')) return 'TIMEOUT'
  if (upperState.includes('FAILED')) return 'FAILED'
  if (upperState.includes('COMPLETED')) return 'COMPLETED'

  // 标准状态映射
  const statusMap: Record<string, string> = {
    'PENDING': 'PENDING',
    'PD': 'PENDING',
    'RUNNING': 'RUNNING',
    'R': 'RUNNING',
    'SUSPENDED': 'SUSPENDED',
    'S': 'SUSPENDED',
    'COMPLETED': 'COMPLETED',
    'CD': 'COMPLETED',
    'CANCELLED': 'CANCELLED',
    'CA': 'CANCELLED',
    'FAILED': 'FAILED',
    'F': 'FAILED',
    'TIMEOUT': 'TIMEOUT',
    'TO': 'TIMEOUT',
    'NODE_FAIL': 'FAILED',
    'NF': 'FAILED',
    'PREEMPTED': 'PREEMPTED',
    'PR': 'PREEMPTED'
  }

  return statusMap[upperState] || upperState
}

async function fixStaleJobs() {
  console.log('🔍 开始检查数据库中的过期作业...\n')

  // 1. 查询数据库中所有RUNNING和PENDING的作业
  const { data: dbJobs, error } = await supabase
    .from('jobs')
    .select('job_id, status, submit_time, start_time, end_time')
    .in('status', ['RUNNING', 'PENDING'])
    .order('job_id', { ascending: false })

  if (error) {
    console.error('❌ 查询数据库失败:', error)
    return
  }

  if (!dbJobs || dbJobs.length === 0) {
    console.log('✅ 数据库中没有RUNNING或PENDING状态的作业')
    return
  }

  console.log(`📋 找到 ${dbJobs.length} 个RUNNING/PENDING作业，开始验证...\n`)

  let fixedCount = 0
  let notFoundCount = 0
  let consistentCount = 0

  for (const dbJob of dbJobs) {
    const jobId = dbJob.job_id
    console.log(`检查作业 ${jobId} (DB状态: ${dbJob.status})...`)

    // 从SLURM获取实际状态
    const slurmJob = getSlurmJobStatus(jobId)

    if (!slurmJob) {
      console.log(`  ⚠️  SLURM中未找到作业 ${jobId}，可能已被清理`)
      notFoundCount++

      // 如果作业在SLURM中找不到，且提交时间超过7天，标记为CANCELLED
      const submitTime = new Date(dbJob.submit_time)
      const daysSinceSubmit = (Date.now() - submitTime.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceSubmit > 7) {
        console.log(`  🔧 作业已提交${Math.floor(daysSinceSubmit)}天，标记为CANCELLED`)
        await supabase
          .from('jobs')
          .update({
            status: 'CANCELLED',
            end_time: new Date().toISOString()
          })
          .eq('job_id', jobId)
        fixedCount++
      }
      continue
    }

    const normalizedState = normalizeSlurmStatus(slurmJob.state)
    console.log(`  SLURM状态: ${slurmJob.state} -> ${normalizedState}`)

    if (normalizedState !== dbJob.status) {
      console.log(`  🔧 状态不一致！更新: ${dbJob.status} -> ${normalizedState}`)

      // 更新数据库
      const updateData: any = {
        status: normalizedState,
      }

      // 更新时间字段
      if (slurmJob.startTime && slurmJob.startTime !== 'Unknown') {
        updateData.start_time = slurmJob.startTime
      }
      if (slurmJob.endTime && slurmJob.endTime !== 'Unknown') {
        updateData.end_time = slurmJob.endTime
      }

      const { error: updateError } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('job_id', jobId)

      if (updateError) {
        console.error(`  ❌ 更新失败:`, updateError)
      } else {
        console.log(`  ✅ 已更新`)
        fixedCount++
      }
    } else {
      console.log(`  ✅ 状态一致`)
      consistentCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 修复结果汇总:')
  console.log(`  - 总检查数: ${dbJobs.length}`)
  console.log(`  - 已修复: ${fixedCount}`)
  console.log(`  - 状态一致: ${consistentCount}`)
  console.log(`  - SLURM中未找到: ${notFoundCount}`)
  console.log('='.repeat(50))
}

// 执行修复
fixStaleJobs().catch(console.error)
