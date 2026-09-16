'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useT } from '@/lib/i18n-utils'
import { useCurrentLocale } from '@/lib/i18n-client-utils'
import { useLocale } from 'next-intl'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { History, Trash2, Upload, FileText, X, File } from 'lucide-react'

// 动态导入代码编辑器组件，减少初始bundle大小
const CodeEditor = dynamic(() => import('@/components/ui/code-editor'), {
  ssr: false
})

export default function SubmitPage() {
  const { user } = useAuth()
  const router = useRouter()
  const currentLocale = useCurrentLocale()
  const t = useT('jobs')
  const tCommon = useT('common')
  const tSubmit = useT('submit')

  // 模板定义（使用翻译）
  const TEMPLATES = [
    {
      name: tSubmit('templates.singleNode'),
      bodyScript: 'echo Hello World',
      params: { nodes: 1, ntasks: 1, cpusPerTask: 1, gpus: 0, mem: '0', time: '' },
    },
    {
      name: tSubmit('templates.mpi'),
      bodyScript: 'mpirun ./my_mpi_app',
      params: { nodes: 2, ntasks: 8, cpusPerTask: 1, gpus: 0, mem: '0', time: '' },
    },
    {
      name: tSubmit('templates.aiTraining'),
      bodyScript: 'python train.py',
      params: { nodes: 1, ntasks: 1, cpusPerTask: 8, gpus: 1, mem: '32G', time: '12:00:00' },
    },
    {
      name: tSubmit('templates.gpuCompute'),
      bodyScript: 'nvidia-smi\n./gpu_app',
      params: { nodes: 1, ntasks: 1, cpusPerTask: 4, gpus: 2, mem: '16G', time: '04:00:00' },
    },
  ]

  const PARAM_HINTS: Record<string, string> = {
    jobName: tSubmit('hints.jobName'),
    partition: tSubmit('hints.partition'),
    nodes: tSubmit('hints.nodes'),
    ntasks: tSubmit('hints.ntasks'),
    cpusPerTask: tSubmit('hints.cpusPerTask'),
    gpus: tSubmit('hints.gpus'),
    mem: tSubmit('hints.mem'),
    time: tSubmit('hints.time'),
    bodyScript: tSubmit('hints.bodyScript'),
  }
  const [form, setForm] = useState({
    jobName: '',
    partition: '',
    nodes: 1,
    ntasks: 1,
    cpusPerTask: 1,
    gpus: 0,
    mem: '0',
    time: '',
    bodyScript: 'echo Hello World',
  })
  const [loading, setLoading] = useState(false)
  const [partitions, setPartitions] = useState<{ name: string }[]>([])
  const [partitionsLoading, setPartitionsLoading] = useState(false)
  const [errors, setErrors] = useState<{ [k: string]: string }>({})
  const [history, setHistory] = useState<any[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const dataFileInputRef = React.useRef<HTMLInputElement>(null)
  const [partitionResources, setPartitionResources] = useState<{ [key: string]: any }>({})
  const [resourceEstimate, setResourceEstimate] = useState<{ cpu: number; mem: string; gpu: number } | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number; path: string }>>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  // 历史作业复用（本地存储）
  useEffect(() => {
    const h = localStorage.getItem('job_submit_history')
    if (h) setHistory(JSON.parse(h))
  }, [])
  
  function saveHistory(newForm: any) {
    const h = [newForm, ...history].slice(0, 5)
    setHistory(h)
    localStorage.setItem('job_submit_history', JSON.stringify(h))
  }
  
  function clearHistory() {
    setHistory([])
    localStorage.removeItem('job_submit_history')
    toast({ title: tSubmit('history.cleared') })
  }

  // 延迟初始化分区数据
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialized(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 分区数据获取 - 延迟加载
  useEffect(() => {
    if (!initialized) return
    
    const fetchPartitions = async () => {
      setPartitionsLoading(true)
      try {
        const response = await fetch('/api/jobs/partitions?cache=true')
        const data = await response.json()
        
        setPartitions(data.partitions || [])
        // 构建分区资源信息
        const resources: { [key: string]: any } = {}
        data.partitions?.forEach((p: any) => {
          resources[p.name] = {
            cpuCount: p.cpuCount,
            nodeCount: p.nodeCount,
            gpuCount: p.gpuCount || 0,
          }
        })
        setPartitionResources(resources)
        
        // 自动设置默认分区：优先带*，否则第一个，仅在form.partition为空时
        if (!form.partition && data.partitions && data.partitions.length > 0) {
          const starPartition = data.partitions.find((p: any) => p.name.includes('*'))
          const defaultPartition = starPartition ? starPartition.name : data.partitions[0].name
          setForm(f => ({ ...f, partition: defaultPartition }))
        }
      } catch (error) {
        console.error('获取分区信息失败:', error)
      } finally {
        setPartitionsLoading(false)
      }
    }

    fetchPartitions()
  }, [initialized, form.partition])

  // 分区选择后自动推荐资源
  useEffect(() => {
    if (form.partition && partitionResources[form.partition]) {
      const resources = partitionResources[form.partition]
      // 根据分区资源自动推荐参数
      const recommendations = {
        nodes: Math.min(form.nodes, resources.nodeCount),
        cpusPerTask: Math.min(form.cpusPerTask, Math.floor(resources.cpuCount / resources.nodeCount)),
        gpus: Math.min(form.gpus, resources.gpuCount),
      }

      // 注意：不自动设置内存和时间，让用户自己决定
    }
  }, [form.partition, partitionResources])

  // 获取分区详细信息并推荐内存参数
  async function getPartitionInfo(partitionName: string) {
    try {
      const cleanPartition = partitionName.replace(/\*$/, '')
      const res = await fetch(`/api/jobs?partition_info=${encodeURIComponent(cleanPartition)}`)
      const data = await res.json()

      if (data.success && data.partitionInfo && data.partitionInfo.length > 0) {
        const info = data.partitionInfo[0]

        // 显示分区信息，但不自动设置内存参数
        // 让用户根据分区信息自己决定内存设置
        if (info.memTotal) {
        }
      }
    } catch (error) {
      console.error('获取分区信息失败:', error)
    }
  }

  // 资源预估
  useEffect(() => {
    if (form.nodes && form.cpusPerTask && form.ntasks && form.mem && form.mem !== '0' && form.mem !== '0G' && form.mem !== '0M') {
      const totalCpu = form.nodes * form.cpusPerTask
      const totalGpu = form.nodes * form.gpus
      const memMatch = form.mem.match(/^([\d.]+)([GM])$/)
      if (memMatch) {
        const memValue = parseFloat(memMatch[1])
        const memUnit = memMatch[2]
        const totalMem = form.nodes * memValue
        setResourceEstimate({
          cpu: totalCpu,
          mem: `${totalMem}${memUnit}`,
          gpu: totalGpu,
        })
      }
    } else {
      // 如果内存为0或未设置，只显示CPU和GPU预估
      if (form.nodes && form.cpusPerTask && form.ntasks) {
        const totalCpu = form.nodes * form.cpusPerTask
        const totalGpu = form.nodes * form.gpus
        setResourceEstimate({
          cpu: totalCpu,
          mem: form.mem === '0' || form.mem === '0G' || form.mem === '0M' ? tSubmit('resourceEstimate.notSpecified') : tSubmit('resourceEstimate.notSet'),
          gpu: totalGpu,
        })
      } else {
        setResourceEstimate(null)
      }
    }
  }, [form.nodes, form.cpusPerTask, form.ntasks, form.mem, form.gpus, tSubmit])

  // 智能参数校验
  function validateWithPartition() {
    const err: { [k: string]: string } = {}

    // 基础校验
    if (!form.jobName) err.jobName = tSubmit('validation.jobNameRequired')
    if (!form.partition) {
      err.partition = tSubmit('validation.partitionRequired')
    }
    if (!form.nodes || form.nodes < 1) err.nodes = tSubmit('validation.nodesPositive')
    if (!form.cpusPerTask || form.cpusPerTask < 1) err.cpusPerTask = tSubmit('validation.cpusPositive')
    if (!form.ntasks || form.ntasks < 1) err.ntasks = tSubmit('validation.ntasksPositive')
    if (form.gpus < 0) err.gpus = tSubmit('validation.gpusNonNegative')

    // 内存格式校验
    if (!form.mem) {
      err.mem = tSubmit('validation.memRequired')
    } else if (form.mem === '0' || form.mem === '0G' || form.mem === '0M') {
      // 允许设置为 0，表示不指定内存参数
    } else if (!/^[\d.]+[GM]$/.test(form.mem)) {
      err.mem = tSubmit('validation.memFormat')
    } else {
      // 检查内存值是否合理
      const memValue = parseFloat(form.mem.replace(/[GM]$/, ''))
      const memUnit = form.mem.slice(-1)
      if (memValue <= 0) {
        err.mem = tSubmit('validation.memPositive')
      } else if (memUnit === 'G' && memValue > 1000) {
        err.mem = tSubmit('validation.memTooLarge')
      } else if (memUnit === 'M' && memValue > 1000000) {
        err.mem = tSubmit('validation.memTooLarge')
      }
    }

    if (!form.time || !/^\d{2}:\d{2}:\d{2}$/.test(form.time)) {
      if (form.time && form.time.trim() !== '') {
        err.time = tSubmit('validation.timeFormat')
      }
    }
    if (!form.bodyScript.trim()) err.bodyScript = tSubmit('validation.bodyScriptRequired')

    // 分区资源校验
    if (form.partition && partitionResources[form.partition]) {
      const resources = partitionResources[form.partition]
      if (form.nodes > resources.nodeCount) {
        err.nodes = `${tSubmit('validation.partitionPrefix')} ${form.partition} ${tSubmit('validation.onlyNodes')} ${resources.nodeCount} ${tSubmit('validation.nodesSuffix')}`
      }
      if (form.cpusPerTask > Math.floor(resources.cpuCount / resources.nodeCount)) {
        err.cpusPerTask = `${tSubmit('validation.partitionPrefix')} ${form.partition} ${tSubmit('validation.maxCpusPerNode')} ${Math.floor(resources.cpuCount / resources.nodeCount)} ${tSubmit('validation.cpuSuffix')}`
      }
      if (form.gpus > resources.gpuCount) {
        err.gpus = `${tSubmit('validation.partitionPrefix')} ${form.partition} ${tSubmit('validation.onlyGpus')} ${resources.gpuCount} ${tSubmit('validation.gpuSuffix')}`
      }
    }

    // 任务数合理性校验
    if (form.ntasks > form.nodes * form.cpusPerTask) {
      err.ntasks = `${tSubmit('validation.ntasksExceed')} (${form.nodes * form.cpusPerTask})`
    }

    setErrors(err)
    return Object.keys(err).length === 0
  }

  function validate() {
    return validateWithPartition()
  }

  function generateScript() {
    // 只支持 Slurm，处理分区名称，去掉末尾的 * 字符
    const cleanPartition = form.partition ? form.partition.replace(/\*$/, '') : ''
    
    return [
      '#!/bin/bash',
      form.jobName && `#SBATCH -J ${form.jobName}`,
      cleanPartition && `#SBATCH -p ${cleanPartition}`,
      form.nodes && `#SBATCH -N ${form.nodes}`,
      form.ntasks && `#SBATCH -n ${form.ntasks}`,
      form.cpusPerTask && `#SBATCH --cpus-per-task=${form.cpusPerTask}`,
      form.gpus && form.gpus > 0 && `#SBATCH --gpus=${form.gpus}`,
      form.mem && form.mem !== '0' && form.mem !== '0G' && form.mem !== '0M' && `#SBATCH --mem=${form.mem}`,
      form.time && form.time.trim() && `#SBATCH -t ${form.time}`,
      '',
      form.bodyScript,
    ].filter(Boolean).join('\n')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!validate()) return
    
    setLoading(true)
    try {
      const script = generateScript()
      
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // 添加认证token
        },
        body: JSON.stringify({
          script,
          partition: form.partition.replace(/\*$/, ''),
          jobName: form.jobName,
          user: user?.username // 确保使用当前用户
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: tSubmit('toast.submitSuccess'),
          description: `${t('id')}: ${data.job.jobId}`,
        })

        // 保存到历史记录
        saveHistory(form)

        // 清空表单
        setForm({
          jobName: '',
          partition: '',
          nodes: 1,
          ntasks: 1,
          cpusPerTask: 1,
          gpus: 0,
          mem: '0',
          time: '',
          bodyScript: 'echo Hello World',
        })
        // 新增：提交成功后跳转到作业列表
        // 使用 useCurrentLocale 确保使用当前语言
        router.push(`/${currentLocale}/dashboard/jobs`)
      } else {
        toast({
          title: tSubmit('toast.submitFailed'),
          description: data.error || tCommon('error'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('提交作业时出错:', error)
      toast({
        title: tSubmit('toast.submitFailed'),
        description: tSubmit('toast.networkError'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // 语法高亮 - 移除，使用简单的textarea
  // function highlight(code: string): string {
  //   return Prism.highlight(code, Prism.languages.bash, 'bash')
  // }

  // 脚本文件上传处理
  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.sh') && !file.name.endsWith('.bash')) {
      toast({ title: tSubmit('toast.fileFormatError'), description: tSubmit('toast.fileFormatDesc'), variant: 'destructive' })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      // 提取业务脚本部分（去除调度器头部）
      const lines = content.split('\n')
      const bodyLines = lines.filter(line =>
        !line.startsWith('#SBATCH') &&
        !line.startsWith('#!/bin/bash') &&
        line.trim()
      )
      const bodyScript = bodyLines.join('\n') || 'echo Hello World'

      setForm(f => ({ ...f, bodyScript }))
      toast({ title: tSubmit('toast.fileUploadSuccess'), description: tSubmit('toast.fileUploadDesc') })
    }
    reader.readAsText(file)

    // 清空文件输入框，允许重复上传同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 数据文件上传处理
  async function handleDataFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingFiles(true)
    const uploadedList: Array<{ name: string; size: number; path: string }> = []
    const failedList: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // 文件大小限制（例如500MB）
        if (file.size > 500 * 1024 * 1024) {
          failedList.push(`${file.name} (${tSubmit('dataFiles.fileTooLarge')})`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('username', user?.username || '')
        formData.append('path', 'job-data') // 上传到用户home目录的job-data文件夹

        try {
          const response = await fetch('/api/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          })

          const data = await response.json()

          if (response.ok) {
            uploadedList.push({
              name: file.name,
              size: file.size,
              path: `~/job-data/${file.name}`
            })
          } else {
            failedList.push(`${file.name} (${data.error || tCommon('error')})`)
          }
        } catch (error) {
          failedList.push(`${file.name} (${tSubmit('toast.networkError')})`)
        }
      }

      // 更新已上传文件列表
      setUploadedFiles(prev => [...prev, ...uploadedList])

      // 显示上传结果
      if (uploadedList.length > 0) {
        toast({
          title: tSubmit('dataFiles.uploadSuccess'),
          description: `${tSubmit('dataFiles.uploaded')} ${uploadedList.length} ${tSubmit('dataFiles.files')}`,
        })
      }

      if (failedList.length > 0) {
        toast({
          title: tSubmit('dataFiles.uploadFailed'),
          description: failedList.join(', '),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('批量上传失败:', error)
      toast({
        title: tSubmit('dataFiles.uploadFailed'),
        description: tSubmit('toast.networkError'),
        variant: 'destructive',
      })
    } finally {
      setUploadingFiles(false)
      // 清空文件输入框
      if (dataFileInputRef.current) {
        dataFileInputRef.current.value = ''
      }
    }
  }

  // 删除已上传的文件
  function handleRemoveUploadedFile(index: number) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    toast({ title: tSubmit('dataFiles.fileRemoved') })
  }

  return (
    <div className="w-full px-0 md:px-8 py-6">
      <h1 className="text-3xl font-bold mb-6 text-foreground">
        {tSubmit('pageTitle')}
      </h1>
      {/* 内容卡片宽度全屏 */}
      <TechCard className="w-full max-w-none" hover glowEffect>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            {tSubmit('cardTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 模板与历史 */}
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-400/20">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300 mr-2">{tSubmit('templates.label')}</span>
              {TEMPLATES.map(t => (
                <SecondaryButton 
                  key={t.name} 
                  size="sm" 
                  onClick={() => setForm(f => ({ ...f, ...t.params, bodyScript: t.bodyScript }))}
                >
                  {t.name}
                </SecondaryButton>
              ))}
              {history.length > 0 && (
                <>
                  <span className="ml-4 text-sm font-medium text-green-700 dark:text-green-300 mr-2 flex items-center gap-1">
                    <History className="h-3 w-3" />
                    {tSubmit('history.label')}
                  </span>
                  {history.map((h, i) => (
                    <Button key={i} size="sm" variant="ghost" onClick={() => setForm(h)} className="hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400">
                      {h.jobName || `${tSubmit('history.label')}${i+1}`}
                    </Button>
                  ))}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={clearHistory} 
                    className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {tSubmit('history.clear')}
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* 主体分栏：参数区+脚本区，移动端单列，md及以上左右分栏 */}
          <form onSubmit={handleSubmit} className="md:flex md:gap-8 w-full">
            {/* 参数区：左侧，宽度60% */}
            <div className="md:w-[60%] w-full space-y-4">
              {/* 参数表单用grid横向分布 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 作业名称 */}
                <div>
                  <label className="block mb-1 text-sm flex items-center gap-1">{tSubmit('fields.jobName')}
                    <span className="text-xs text-gray-400 cursor-help" title={PARAM_HINTS.jobName}>?</span>
                  </label>
                  <Input value={form.jobName} onChange={e => setForm(f => ({ ...f, jobName: e.target.value }))} />
                  {errors.jobName && <div className="text-red-500 text-xs mt-1">{errors.jobName}</div>}
                </div>
                {/* 分区 */}
                <div>
                  <label className="block mb-1 text-sm flex items-center gap-1">{tSubmit('fields.partition')}
                    <span className="text-xs text-gray-400 cursor-help" title={PARAM_HINTS.partition}>?</span>
                  </label>
                  <Select value={form.partition} onValueChange={v => {
                    setForm(f => ({ ...f, partition: v }))
                    if (v) getPartitionInfo(v)
                  }}>
                    <SelectTrigger><SelectValue placeholder={tSubmit('selectPartition')} /></SelectTrigger>
                    <SelectContent>
                      {partitionsLoading ? (
                        <SelectItem value="loading" disabled>{tSubmit('loadingPartitions')}</SelectItem>
                      ) : partitions.length > 0 ? (
                        partitions.map(p => (
                          <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-partitions" disabled>{tSubmit('noPartitions')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.partition && <div className="text-red-500 text-xs mt-1">{errors.partition}</div>}
                  {!partitionsLoading && partitions.length === 0 && (
                    <div className="text-yellow-600 text-xs mt-1">{tSubmit('partitionConfigError')}</div>
                  )}
                </div>
                {/* 节点数 */}
                <div>
                  <label className="block mb-1 text-sm flex items-center gap-1">{tSubmit('fields.nodes')}
                    <span className="text-xs text-gray-400 cursor-help" title={PARAM_HINTS.nodes}>?</span>
                  </label>
                  <Input type="number" min={1} value={form.nodes} onChange={e => setForm(f => ({ ...f, nodes: Number(e.target.value) }))} />
                  {errors.nodes && <div className="text-red-500 text-xs mt-1">{errors.nodes}</div>}
                </div>
                {/* 每节点CPU */}
                <div>
                  <label className="block mb-1 text-sm flex items-center gap-1">{tSubmit('fields.cpusPerTask')}
                    <span className="text-xs text-gray-400 cursor-help" title={PARAM_HINTS.cpusPerTask}>?</span>
                  </label>
                  <Input type="number" min={1} value={form.cpusPerTask} onChange={e => setForm(f => ({ ...f, cpusPerTask: Number(e.target.value) }))} />
                  {errors.cpusPerTask && <div className="text-red-500 text-xs mt-1">{errors.cpusPerTask}</div>}
                </div>
                {/* 总任务数 */}
                <div>
                  <label className="block mb-1 text-sm flex items-center gap-1">{tSubmit('fields.ntasks')}
                    <span className="text-xs text-gray-400 cursor-help" title={PARAM_HINTS.ntasks}>?</span>
                  </label>
                  <Input type="number" min={1} value={form.ntasks} onChange={e => setForm(f => ({ ...f, ntasks: Number(e.target.value) }))} />
                  {errors.ntasks && <div className="text-red-500 text-xs mt-1">{errors.ntasks}</div>}
                </div>
                {/* GPU数量 */}
                <div>
                  <label className="block mb-1 text-sm flex items-center gap-1">{tSubmit('fields.gpus')}
                    <span className="text-xs text-gray-400 cursor-help" title={PARAM_HINTS.gpus}>?</span>
                  </label>
                  <Input type="number" min={0} value={form.gpus} onChange={e => setForm(f => ({ ...f, gpus: Number(e.target.value) }))} />
                  {errors.gpus && <div className="text-red-500 text-xs mt-1">{errors.gpus}</div>}
                </div>
                {/* 内存 */}
                <div>
                  <label className="block mb-1 text-sm flex items-center gap-1">{tSubmit('fields.mem')}
                    <span className="text-xs text-gray-400 cursor-help" title={PARAM_HINTS.mem}>?</span>
                  </label>
                  <Input placeholder={tSubmit('memPlaceholder')} value={form.mem} onChange={e => setForm(f => ({ ...f, mem: e.target.value }))} />
                  {errors.mem && <div className="text-red-500 text-xs mt-1">{errors.mem}</div>}
                  {form.partition && !errors.mem && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {form.mem === '0' || form.mem === '0G' || form.mem === '0M' ? (
                        tSubmit('memUseDefault')
                      ) : (
                        tSubmit('memRecommendation')
                      )}
                    </div>
                  )}
                </div>
                {/* 时长 */}
                <div>
                  <label className="block mb-1 text-sm flex items-center gap-1">{tSubmit('fields.time')}
                    <span className="text-xs text-gray-400 cursor-help" title={PARAM_HINTS.time}>?</span>
                  </label>
                  <Input placeholder={tSubmit('timePlaceholder')} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                  {errors.time && <div className="text-red-500 text-xs mt-1">{errors.time}</div>}
                </div>
              </div>
              {/* 资源预估显示 */}
              {resourceEstimate && (
                <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-400/30">
                  <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-3">{tSubmit('resourceEstimate.title')}</div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">{tSubmit('resourceEstimate.totalCpu')}:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{resourceEstimate.cpu} {tSubmit('resourceEstimate.cores')}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">{tSubmit('resourceEstimate.totalMem')}:</span>
                      <span className="font-bold">
                        {resourceEstimate.mem === tSubmit('resourceEstimate.notSpecified') ? (
                          <span className="text-orange-600 dark:text-orange-400">{tSubmit('resourceEstimate.useDefault')}</span>
                        ) : resourceEstimate.mem === tSubmit('resourceEstimate.notSet') ? (
                          <span className="text-gray-500">{tSubmit('resourceEstimate.notSet')}</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">{resourceEstimate.mem}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">{tSubmit('resourceEstimate.totalGpu')}:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{resourceEstimate.gpu} {tSubmit('resourceEstimate.units')}</span>
                    </div>
                  </div>
                  {(!form.time || form.time.trim() === '') && (
                    <div className="mt-3 text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-400/20 rounded px-2 py-1">
                      ⏱️ {tSubmit('resourceEstimate.timeDefault')}
                    </div>
                  )}
                </div>
              )}

              {/* 数据文件上传区域 */}
              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-400/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{tSubmit('dataFiles.title')}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => dataFileInputRef.current?.click()}
                    disabled={uploadingFiles}
                  >
                    {uploadingFiles ? tSubmit('dataFiles.uploading') : tSubmit('dataFiles.uploadButton')}
                  </Button>
                </div>
                <input
                  ref={dataFileInputRef}
                  type="file"
                  multiple
                  onChange={handleDataFileUpload}
                  className="hidden"
                />
                <div className="text-xs text-muted-foreground mb-2">
                  {tSubmit('dataFiles.hint')}
                </div>
                {/* 已上传文件列表 */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <File className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{file.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB · {file.path}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUploadedFile(index)}
                          className="ml-2 h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 提交按钮 */}
              <PrimaryButton 
                type="submit" 
                disabled={loading} 
                loading={loading}
                className="w-full h-12 text-base"
                icon={<Upload className="h-5 w-5" />}
                iconPosition="left"
              >
                {loading ? tSubmit('buttons.submitting') : tSubmit('buttons.submit')}
              </PrimaryButton>
            </div>
            {/* 脚本编辑与预览区：右侧，宽度40%，移动端在下方 */}
            <div className="md:w-[40%] w-full space-y-4 mt-8 md:mt-0">
              <div>
                <label className="block mb-1 text-sm">{tSubmit('fields.bodyScript')}
                  <span className="text-xs text-gray-400 cursor-help" title={PARAM_HINTS.bodyScript}>?</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {tSubmit('buttons.uploadScript')}
                  </Button>
                  <span className="text-xs text-muted-foreground self-center">
                    {tSubmit('scriptFileSupport')}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".sh,.bash"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <CodeEditor
                  value={form.bodyScript}
                  onChange={(code: string) => setForm(f => ({ ...f, bodyScript: code }))}
                  minHeight={120}
                  className="border rounded-md"
                />
                {errors.bodyScript && <div className="text-red-500 text-xs mt-1">{errors.bodyScript}</div>}
              </div>
              <div>
                <label className="block mb-1 text-sm">{tSubmit('preview')}</label>
                <Textarea rows={8} value={generateScript()} readOnly className="bg-gray-100" />
              </div>
            </div>
          </form>
        </CardContent>
      </TechCard>
    </div>
  )
}