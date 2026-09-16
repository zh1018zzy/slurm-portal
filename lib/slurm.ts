import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

interface Partition {
  name: string
  jobCount: number
  nodeCount: number
  cpuCount: number
  gpuCount: number
  description: string
}

async function getPartitions(): Promise<Partition[]> {
  try {
    const { stdout } = await execFileAsync('sinfo', [
      '-o',
      '%P|%j|%D|%C|%G|%l',
      '--noheader',
    ])

    return stdout.trim().split('\n').map((line) => {
      const [name, jobCount, nodeCount, cpuInfo, gpuCount, description] = line.split('|')
      const [allocCPUs, idleCPUs, otherCPUs, totalCPUs] = cpuInfo.split('/')

      return {
        name,
        jobCount: parseInt(jobCount, 10),
        nodeCount: parseInt(nodeCount, 10),
        cpuCount: parseInt(totalCPUs, 10),
        gpuCount: parseInt(gpuCount, 10) || 0,
        description,
      }
    })
  } catch (error) {
    console.error('Error fetching partition information:', error)
    return []
  }
}

export { getPartitions }