import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
export const dynamic = 'force-dynamic'


// 获取当前用户信息
function getCurrentUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    const token = authHeader.substring(7)
    const payload = verifyJwt(token)
    return payload
  } catch (error) {
    return null
  }
}

// GET /api/dashboard/software-stats 获取软件使用统计
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    // 初始化Supabase客户端
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ 
        success: false, 
        error: '数据库配置错误' 
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 查询作业数据，统计软件使用情况
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('job_name, script, params')
      .not('job_name', 'is', null)

    if (error) {
      console.error('查询软件统计失败:', error)
      return Response.json({ success: false, error: '数据库查询失败' })
    }

    // 分析软件使用情况
    const softwareCounts: Record<string, number> = {}
    let totalJobs = 0

    jobs?.forEach((job: any) => {
      totalJobs++
      
      // 从作业名称和脚本中提取软件信息
      const jobName = job.job_name?.toLowerCase() || ''
      const script = job.script?.toLowerCase() || ''
      const params = job.params || {}
      
      // 软件识别规则 - 按优先级排序
      const softwarePatterns = [
        // 分子动力学和计算化学
        { pattern: /schrodinger|chrodinger/i, name: 'Schrödinger' },
        { pattern: /gromacs/i, name: 'GROMACS' },
        { pattern: /amber/i, name: 'AMBER' },
        { pattern: /namd/i, name: 'NAMD' },
        { pattern: /lammps/i, name: 'LAMMPS' },
        { pattern: /vasp/i, name: 'VASP' },
        { pattern: /gaussian/i, name: 'Gaussian' },
        { pattern: /orca/i, name: 'ORCA' },
        { pattern: /cp2k/i, name: 'CP2K' },
        { pattern: /quantum.*espresso|qe/i, name: 'Quantum ESPRESSO' },
        
        // 机器学习框架
        { pattern: /tensorflow|tf/i, name: 'TensorFlow' },
        { pattern: /pytorch|torch/i, name: 'PyTorch' },
        { pattern: /scikit.*learn|sklearn/i, name: 'Scikit-learn' },
        { pattern: /keras/i, name: 'Keras' },
        { pattern: /xgboost/i, name: 'XGBoost' },
        { pattern: /lightgbm/i, name: 'LightGBM' },
        
        // 科学计算和数据分析
        { pattern: /matlab/i, name: 'MATLAB' },
        { pattern: /r.*script|rscript|r\s+script/i, name: 'R语言' },
        { pattern: /python.*script|python/i, name: 'Python' },
        { pattern: /julia/i, name: 'Julia' },
        { pattern: /octave/i, name: 'Octave' },
        
        // 计算流体力学
        { pattern: /openfoam/i, name: 'OpenFOAM' },
        { pattern: /ansys.*fluent|fluent/i, name: 'ANSYS Fluent' },
        { pattern: /ansys.*cfx|cfx/i, name: 'ANSYS CFX' },
        { pattern: /star.*ccm|starccm/i, name: 'STAR-CCM+' },
        { pattern: /comsol/i, name: 'COMSOL' },
        { pattern: /abaqus/i, name: 'ABAQUS' },
        { pattern: /nastran/i, name: 'NASTRAN' },
        
        // 生物信息学
        { pattern: /blast/i, name: 'BLAST' },
        { pattern: /bowtie/i, name: 'Bowtie' },
        { pattern: /bwa/i, name: 'BWA' },
        { pattern: /samtools/i, name: 'SAMtools' },
        { pattern: /gatk/i, name: 'GATK' },
        { pattern: /plink/i, name: 'PLINK' },
        { pattern: /relion/i, name: 'RELION' },
        { pattern: /cryosparc/i, name: 'CryoSPARC' },
        
        // 可视化和图形软件
        { pattern: /paraview/i, name: 'ParaView' },
        { pattern: /vmd/i, name: 'VMD' },
        { pattern: /pymol/i, name: 'PyMOL' },
        { pattern: /chimera/i, name: 'Chimera' },
        { pattern: /ucsf.*chimera|ucsfchimera/i, name: 'UCSF Chimera' },
        { pattern: /vnc|vncserver/i, name: 'VNC图形桌面' },
        { pattern: /jupyter|jupyterlab/i, name: 'JupyterLab' },
        
        // 虚拟机和容器
        { pattern: /ubuntu.*vm|ubuntu.*virtual/i, name: 'Ubuntu虚拟机' },
        { pattern: /centos.*vm|centos.*virtual/i, name: 'CentOS虚拟机' },
        { pattern: /windows.*vm|windows.*virtual/i, name: 'Windows虚拟机' },
        { pattern: /singularity|apptainer/i, name: 'Singularity容器' },
        { pattern: /docker/i, name: 'Docker容器' },
        { pattern: /conda|anaconda|miniconda/i, name: 'Conda环境' },
        
        // 并行计算和GPU
        { pattern: /mpi/i, name: 'MPI并行' },
        { pattern: /openmp/i, name: 'OpenMP' },
        { pattern: /cuda|cudnn/i, name: 'CUDA' },
        { pattern: /opencl/i, name: 'OpenCL' },
        { pattern: /rocm/i, name: 'ROCm' },
        
        // 环境模块和系统工具
        { pattern: /module.*load|module/i, name: '环境模块' },
        { pattern: /bash.*script|bash/i, name: 'Bash脚本' },
        { pattern: /perl.*script|perl/i, name: 'Perl' },
        { pattern: /java.*jar|java/i, name: 'Java' },
        { pattern: /c.*program|c\+\+|cpp/i, name: 'C/C++' },
        { pattern: /fortran/i, name: 'Fortran' },
        
        // 特定应用和工具
        { pattern: /public.*cluster/i, name: 'Public-Cluster' },
        { pattern: /graphics.*desktop|graphical.*desktop/i, name: '图形桌面' },
        { pattern: /remote.*desktop|rdp/i, name: '远程桌面' },
        { pattern: /ssh.*tunnel|tunnel/i, name: 'SSH隧道' }
      ]

      let softwareFound = false
      for (const { pattern, name } of softwarePatterns) {
        if (pattern.test(jobName) || pattern.test(script)) {
          softwareCounts[name] = (softwareCounts[name] || 0) + 1
          softwareFound = true
          break
        }
      }

      // 如果没有匹配到特定软件，根据作业类型分类
      if (!softwareFound) {
        if (jobName.includes('vnc') || script.includes('vnc') || jobName.includes('graphics') || script.includes('graphics')) {
          softwareCounts['VNC图形桌面'] = (softwareCounts['VNC图形桌面'] || 0) + 1
        } else if (jobName.includes('compute') || script.includes('compute') || jobName.includes('calculation')) {
          softwareCounts['计算作业'] = (softwareCounts['计算作业'] || 0) + 1
        } else if (jobName.includes('test') || script.includes('test') || jobName.includes('debug')) {
          softwareCounts['测试作业'] = (softwareCounts['测试作业'] || 0) + 1
        } else if (jobName.includes('data') || script.includes('data') || jobName.includes('analysis')) {
          softwareCounts['数据分析'] = (softwareCounts['数据分析'] || 0) + 1
        } else {
          softwareCounts['其他作业'] = (softwareCounts['其他作业'] || 0) + 1
        }
      }
    })

    // 转换为数组并排序
    const topSoftware = Object.entries(softwareCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 计算软件类型分布
    const instanceSoftware = topSoftware.filter(s => 
      s.name.includes('虚拟机') || s.name.includes('桌面') || s.name.includes('容器')
    ).reduce((sum, s) => sum + s.count, 0)

    const clusterSoftware = topSoftware.filter(s => 
      !s.name.includes('虚拟机') && !s.name.includes('桌面') && !s.name.includes('容器')
    ).reduce((sum, s) => sum + s.count, 0)

    const result = {
      totalSoftware: topSoftware.length,
      instanceSoftware,
      clusterSoftware,
      topSoftware,
      totalJobs
    }

    return Response.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('获取软件统计失败:', error)
    return Response.json({ 
      success: false, 
      error: '获取软件统计失败' 
    })
  }
} 