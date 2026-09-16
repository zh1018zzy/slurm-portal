import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ldap from 'ldapjs'
export const dynamic = 'force-dynamic'


// 直接定义类型，避免路径映射问题
interface DatabaseGroup {
  id: string
  name: string
  description?: string
  gid_number: number
  ldap_dn: string
  created_at?: string
  updated_at?: string
}

interface LdapGroup {
  cn: string
  description?: string
  member?: string[]
  memberUid?: string[]
  gidNumber?: string
  dn: string
}

interface GroupSyncResult {
  success: boolean
  error?: string
  created?: number
  updated?: number
  errors?: number
  details?: string[]
}

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// LDAP配置
const ldapUrl = process.env.LDAP_URL || ''
const ldapBaseDN = process.env.LDAP_BASE_DN || ''
const ldapBindDN = process.env.LDAP_BIND_DN || ''
const ldapBindPassword = process.env.LDAP_BIND_PASSWORD || ''
const ldapGroupsOU = process.env.LDAP_GROUPS_OU || 'ou=groups'

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 获取下一个可用的GID号
async function getNextGidNumber(): Promise<number> {
  const { data: existingGroups } = await supabase
    .from('groups')
    .select('gid_number')
    .not('gid_number', 'is', null)
    .order('gid_number', { ascending: false })
    .limit(1)
    
  let nextGidNumber = 2000
  if (existingGroups && existingGroups.length > 0 && existingGroups[0].gid_number) {
    nextGidNumber = existingGroups[0].gid_number + 1
  }
  return nextGidNumber
}

// 从LDAP获取所有用户组
async function getLdapGroups(): Promise<LdapGroup[]> {
  return new Promise((resolve) => {
    console.log('🔍 开始从LDAP获取用户组...')
    console.log('LDAP URL:', ldapUrl)
    console.log('搜索DN:', `${ldapGroupsOU},${ldapBaseDN}`)
    
    const client = ldap.createClient({ url: ldapUrl })
    
    client.bind(ldapBindDN, ldapBindPassword, (err) => {
      if (err) {
        console.error('❌ LDAP绑定失败:', err.message)
        console.error('错误代码:', err.code)
        console.error('错误名称:', err.name)
        client.unbind()
        resolve([])
        return
      }
      
      console.log('✅ LDAP绑定成功')
      
      const searchDN = `${ldapGroupsOU},${ldapBaseDN}`
      const searchOptions = {
        scope: 'sub' as const,
        filter: '(|(objectClass=groupOfNames)(objectClass=posixGroup)(&(cn=*)(objectClass=top)))',
        attributes: ['cn', 'description', 'member', 'objectClass', 'gidNumber']
      }
      
      console.log('🔍 搜索选项:', JSON.stringify(searchOptions, null, 2))
      
      const groups: LdapGroup[] = []
      
      client.search(searchDN, searchOptions, (err: any, res: any) => {
        if (err) {
          console.error('❌ LDAP搜索失败:', err.message)
          console.error('搜索错误代码:', err.code)
          client.unbind()
          resolve([])
          return
        }
        
        console.log('✅ LDAP搜索开始...')
        
        res.on('searchEntry', (entry: any) => {
          console.log('📋 找到组:', entry.objectName)
          
          // 使用attributes方式获取属性
          let cn = '未知'
          let description = '无'
          let member: string[] = []
          let objectClass: string[] = []
          let gidNumber = ''
          
          if (entry.attributes) {
            console.log('   使用entry.attributes解析...')
            
            // 正确解析LDAP属性
            entry.attributes.forEach((attr: any, index: number) => {
              if (attr.values && attr.values.length > 0) {
                const firstValue = attr.values[0]
                
                // 根据属性类型正确识别
                if (attr.type === 'cn') {
                  cn = firstValue
                  console.log(`     [${index}] CN:`, firstValue)
                } else if (attr.type === 'description') {
                  description = firstValue
                  console.log(`     [${index}] 描述:`, firstValue)
                } else if (attr.type === 'member') {
                  member = attr.values
                  console.log(`     [${index}] 成员:`, firstValue)
                } else if (attr.type === 'objectClass') {
                  objectClass = firstValue
                  console.log(`     [${index}] 对象类:`, firstValue)
                } else if (attr.type === 'gidNumber') {
                  gidNumber = firstValue
                  console.log(`     [${index}] GID:`, firstValue)
                } else {
                  console.log(`     [${index}] 未知属性 ${attr.type}:`, firstValue)
                }
              }
            })
          }
          
          console.log('  CN:', cn)
          console.log('  描述:', description)
          console.log('  成员数量:', member.length)
          console.log('  对象类:', objectClass)
          
          // 构建正确的LDAP DN（从组名构建，避免空对象问题）
          const correctDn = `cn=${cn},ou=groups,dc=my-hpc,dc=com`
          
          const group = {
            cn,
            description,
            member,
            gidNumber: gidNumber || undefined,
            dn: correctDn
          }
          groups.push(group)
        })
        
        res.on('end', () => {
          console.log(`✅ LDAP搜索完成，找到 ${groups.length} 个组`)
          client.unbind()
          resolve(groups)
        })
        
        res.on('error', (err: any) => {
          console.error('❌ LDAP搜索过程中发生错误:', err.message)
          client.unbind()
          resolve([])
        })
      })
    })
  })
}

// 同步用户组到数据库
async function syncGroupsToDatabase(ldapGroups: LdapGroup[]) {
  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    details: [] as string[]
  }
  
  try {
    for (const ldapGroup of ldapGroups) {
      try {
        console.log(`处理组: ${ldapGroup.cn}`)
        
        // 检查组是否已存在
        const { data: existingGroup } = await supabase
          .from('groups')
          .select('id, gid_number, ldap_dn')
          .eq('name', ldapGroup.cn)
          .single() as { data: DatabaseGroup | null }
        
        if (existingGroup) {
          console.log(`更新现有组: ${ldapGroup.cn}`)
          
          // 检查是否需要更新LDAP DN
          if (existingGroup.ldap_dn !== ldapGroup.dn) {
            console.log(`  更新LDAP DN: ${existingGroup.ldap_dn} -> ${ldapGroup.dn}`)
          }
          
          // 直接更新现有组（基于组名匹配，不依赖LDAP DN）
          const updateData: any = {
            description: ldapGroup.description || '',
            ldap_dn: ldapGroup.dn, // 更新为最新的LDAP DN
            updated_at: new Date().toISOString()
          }
          
          // 如果LDAP中有gidNumber，更新数据库中的gid_number
          if (ldapGroup.gidNumber) {
            updateData.gid_number = parseInt(ldapGroup.gidNumber)
            console.log(`  更新GID: ${existingGroup.gid_number} -> ${ldapGroup.gidNumber}`)
          }
          
          const { error } = await supabase
            .from('groups')
            .update(updateData)
            .eq('id', existingGroup.id)
          
          if (error) {
            results.errors++
            results.details.push(`更新组 ${ldapGroup.cn} 失败: ${error.message}`)
            console.error(`更新组 ${ldapGroup.cn} 失败:`, error.message)
          } else {
            results.updated++
            results.details.push(`更新组 ${ldapGroup.cn} 成功`)
            console.log(`更新组 ${ldapGroup.cn} 成功`)
          }
        } else {
          console.log(`创建新组: ${ldapGroup.cn}`)
          
          // 创建新组
          const gidNumber = await getNextGidNumber()
          const { error } = await supabase.from('groups').insert([
            {
              id: generateUUID(),
              name: ldapGroup.cn,
              description: ldapGroup.description || '',
              gid_number: gidNumber,
              ldap_dn: ldapGroup.dn,
              created_at: new Date().toISOString()
            }
          ])
          
          if (error) {
            results.errors++
            results.details.push(`创建组 ${ldapGroup.cn} 失败: ${error.message}`)
            console.error(`创建组 ${ldapGroup.cn} 失败:`, error.message)
          } else {
            results.created++
            results.details.push(`创建组 ${ldapGroup.cn} 成功 (GID: ${gidNumber})`)
            console.log(`创建组 ${ldapGroup.cn} 成功 (GID: ${gidNumber})`)
          }
        }
        
      } catch (error: any) {
        results.errors++
        const errorMsg = `处理组 ${ldapGroup.cn} 时出错: ${error.message}`
        results.details.push(errorMsg)
        console.error(errorMsg)
      }
    }
  } catch (error: any) {
    console.error('同步过程中发生严重错误:', error.message)
    results.errors++
    results.details.push(`同步过程错误: ${error.message}`)
  }
  
  console.log('同步结果:', results)
  return results
}

// GET /api/groups/sync 获取同步状态和预览
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 开始LDAP用户组同步预览...')
    
    // 获取LDAP用户组
    const ldapGroups = await getLdapGroups()
    console.log(`从LDAP获取到 ${ldapGroups.length} 个用户组`)
    
    // 获取数据库中的用户组
    const { data: dbGroups, error: dbError } = await supabase
      .from('groups')
      .select('name, description, gid_number, ldap_dn')
      .order('name') as { data: DatabaseGroup[] | null, error: any }
    
    if (dbError) {
      return Response.json({ success: false, error: `获取数据库用户组失败: ${dbError.message}` }, { status: 500 })
    }
    
    // 分析同步需求
    const syncAnalysis = {
      ldapGroups: ldapGroups.length,
      dbGroups: dbGroups?.length || 0,
      toCreate: [] as string[],
      toUpdate: [] as string[],
      ldapGroupDetails: ldapGroups.map(g => ({
        name: g.cn,
        description: g.description || '',
        memberCount: g.member?.length || 0,
        dn: g.dn
      }))
    }
    
    // 找出需要创建的组
    for (const ldapGroup of ldapGroups) {
      const exists = dbGroups?.find((dbGroup) => dbGroup.name === ldapGroup.cn)
      if (!exists) {
        syncAnalysis.toCreate.push(ldapGroup.cn)
      } else {
        syncAnalysis.toUpdate.push(ldapGroup.cn)
      }
    }
    
    return Response.json({
      success: true,
      analysis: syncAnalysis,
      message: '同步预览完成'
    })
    
  } catch (error: any) {
    console.error('同步预览失败:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/groups/sync 执行同步
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { dryRun = false } = body
    
    console.log(`🔄 开始LDAP用户组同步 (dryRun: ${dryRun})...`)
    
    // 获取LDAP用户组
    const ldapGroups = await getLdapGroups()
    console.log(`从LDAP获取到 ${ldapGroups.length} 个用户组`)
    
    if (dryRun) {
      // 预览模式
      const syncPreview = await syncGroupsToDatabase(ldapGroups)
      
      console.log('预览模式结果:', syncPreview)
      
      return Response.json({
        success: true,
        message: '同步预览完成',
        preview: {
          created: syncPreview.created || 0,
          updated: syncPreview.updated || 0,
          errors: syncPreview.errors || 0,
          totalLdapGroups: ldapGroups.length
        }
      })
    } else {
      // 执行同步
      const syncResults = await syncGroupsToDatabase(ldapGroups)
      
      console.log('同步执行结果:', syncResults)
      
      const summary = {
        created: syncResults.created || 0,
        updated: syncResults.updated || 0,
        errors: syncResults.errors || 0,
        totalLdapGroups: ldapGroups.length
      }
      
      return Response.json({
        success: true,
        message: '同步完成',
        summary,
        details: syncResults.details || []
      })
    }
    
  } catch (error: any) {
    console.error('同步失败:', error.message)
    console.error('错误堆栈:', error.stack)
    
    return Response.json({ 
      success: false, 
      error: error.message || '未知错误',
      details: error.stack
    }, { status: 500 })
  }
} 