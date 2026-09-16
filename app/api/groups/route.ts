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

interface GroupMember {
  id: string
  group_id: string
  username: string
  added_at: string
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
    
  let nextGidNumber = 2000 // 从2000开始分配组ID
  if (existingGroups && existingGroups.length > 0 && existingGroups[0].gid_number) {
    nextGidNumber = existingGroups[0].gid_number + 1
  }
  return nextGidNumber
}

// GET /api/groups 获取所有用户组
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
  
  let query = supabase.from('groups').select('*, group_members(*)', { count: 'exact' })
  
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }
  
  query = query.order('created_at', { ascending: false })
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
  
  return Response.json({ success: true, groups: data, total: count })
}

// POST /api/groups 创建新用户组
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, members = [] } = body
  
  if (!name) {
    return Response.json({ success: false, error: '组名不能为空' }, { status: 400 })
  }

  try {
    // 1. 检查组名是否已存在
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('name', name)
      .single()
    
    if (existingGroup) {
      return Response.json({ success: false, error: '组名已存在' }, { status: 400 })
    }

    // 2. 获取下一个可用的GID号
    const gidNumber = await getNextGidNumber()

    // 3. 创建LDAP组
    const ldapGroupDN = `cn=${name},${ldapGroupsOU},${ldapBaseDN}`
    
    // 构建LDAP组条目 - 修复属性格式
    const ldapGroupEntry: any = {
      objectClass: ['top', 'groupOfNames', 'posixGroup'],
      cn: name,
      gidNumber: gidNumber.toString()
    }
    
    // 添加描述（如果提供）
    if (description && description.trim()) {
      ldapGroupEntry.description = description.trim()
    }
    
          // 处理成员列表
      if (members && members.length > 0) {
        // 验证用户名存在性
        const validMembers = members.filter((username: string) => username && username.trim())
        if (validMembers.length > 0) {
          ldapGroupEntry.member = validMembers.map((username: string) => 
            `cn=${username.trim()},ou=users,${ldapBaseDN}`
          )
        }
      }
    
    // groupOfNames 要求至少有一个成员，如果没有则添加默认成员
    if (!ldapGroupEntry.member || ldapGroupEntry.member.length === 0) {
      ldapGroupEntry.member = [`cn=admin,${ldapBaseDN}`]
    }

    const ldapResult = await createLdapGroup(ldapGroupDN, ldapGroupEntry)
    if (!ldapResult.success) {
      return Response.json({ success: false, error: `LDAP创建组失败: ${ldapResult.error}` }, { status: 400 })
    }

    // 4. 创建数据库组记录
    const { data: group, error: dbError } = await supabase.from('groups').insert([
      {
        id: generateUUID(),
        name,
        description: description || '',
        gid_number: gidNumber,
        ldap_dn: ldapGroupDN,
        created_at: new Date().toISOString()
      }
    ]).select().single()

    if (dbError) {
      // 回退LDAP操作
      await deleteLdapGroup(ldapGroupDN)
      return Response.json({ success: false, error: `数据库创建组失败: ${dbError.message}` }, { status: 400 })
    }

    // 5. 添加组成员关系
    if (members.length > 0) {
      const memberRecords = members.map((username: string) => ({
        id: generateUUID(),
        group_id: group.id,
        username,
        added_at: new Date().toISOString()
      }))

      const { error: memberError } = await supabase.from('group_members').insert(memberRecords)
      if (memberError) {
        console.warn('添加组成员失败:', memberError)
      }
    }

    return Response.json({ success: true, group })

  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT /api/groups 更新用户组
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, name, description, members } = body
  
  if (!id) {
    return Response.json({ success: false, error: '缺少组ID' }, { status: 400 })
  }
  
  const groupId = id

  try {
    // 1. 获取现有组信息
    const { data: existingGroup, error: fetchError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (fetchError || !existingGroup) {
      return Response.json({ success: false, error: '组不存在' }, { status: 404 })
    }

    // 2. 更新LDAP组
    if (name !== existingGroup.name || description !== existingGroup.description) {
      const ldapResult = await updateLdapGroup(existingGroup.ldap_dn, { 
        name, 
        description,
        gidNumber: existingGroup.gid_number // 保持现有的gidNumber
      })
      if (!ldapResult.success) {
        return Response.json({ success: false, error: `LDAP更新组失败: ${ldapResult.error}` }, { status: 400 })
      }
    }

    // 3. 更新数据库组记录
    const { error: updateError } = await supabase
      .from('groups')
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq('id', groupId)

    if (updateError) {
      return Response.json({ success: false, error: `数据库更新组失败: ${updateError.message}` }, { status: 400 })
    }

    // 4. 更新组成员（如果提供了members）
    if (members !== undefined) {
      // 删除现有成员关系
      await supabase.from('group_members').delete().eq('group_id', groupId)

      // 添加新成员关系
      if (members.length > 0) {
        const memberRecords = members.map((username: string) => ({
          id: generateUUID(),
          group_id: groupId,
          username,
          added_at: new Date().toISOString()
        }))

        const { error: memberError } = await supabase.from('group_members').insert(memberRecords)
        if (memberError) {
          console.warn('更新组成员失败:', memberError)
        }
      }

      // 更新LDAP组成员
      try {
        console.log(`📝 更新LDAP组成员: ${existingGroup.name}, 成员: [${members.join(', ')}]`)
        const ldapResult = await updateLdapGroupMembers(existingGroup.ldap_dn, members)
        if (ldapResult.success) {
          console.log(`✅ LDAP组成员更新成功: ${existingGroup.name}`)
        } else {
          console.error(`❌ LDAP组成员更新失败: ${existingGroup.name}, 错误: ${ldapResult.error}`)
        }
      } catch (ldapError: any) {
        console.error(`❌ LDAP组成员更新异常: ${existingGroup.name}, 异常: ${ldapError.message}`)
      }
    }

    return Response.json({ success: true })

  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/groups 删除用户组
export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { id } = body
  
  if (!id) {
    return Response.json({ success: false, error: '缺少组ID' }, { status: 400 })
  }
  
  const groupId = id

  try {
    console.log(`🗑️ 开始删除用户组，ID: ${groupId}`)
    
    // 1. 获取组信息
    const { data: group, error: fetchError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (fetchError || !group) {
      return Response.json({ success: false, error: '组不存在' }, { status: 404 })
    }

    console.log(`📋 找到组: ${group.name} (LDAP DN: ${group.ldap_dn})`)

    // 2. 删除组成员关系
    const { error: membersError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
    
    if (membersError) {
      console.warn(`⚠️ 删除组成员关系失败: ${membersError.message}`)
    } else {
      console.log('✅ 删除组成员关系成功')
    }

    // 3. 删除组记录
    const { error: deleteError } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)
      
    if (deleteError) {
      return Response.json({ success: false, error: `数据库删除组失败: ${deleteError.message}` }, { status: 400 })
    }

    console.log('✅ 删除数据库组成功')

    // 4. 尝试删除LDAP中的组（如果LDAP DN有效）
    if (group.ldap_dn && group.ldap_dn !== '{}' && group.ldap_dn !== 'undefined') {
      try {
        const ldapResult = await deleteLdapGroup(group.ldap_dn)
        if (ldapResult.success) {
          console.log('✅ 删除LDAP组成功')
        } else {
          console.warn(`⚠️ 删除LDAP组失败: ${ldapResult.error}`)
        }
      } catch (error) {
        console.warn(`⚠️ 删除LDAP组时出错: ${error}`)
      }
    } else {
      console.log('⚠️ 跳过LDAP删除（无效的LDAP DN）')
    }

    return Response.json({ 
      success: true, 
      message: `用户组 ${group.name} 删除成功` 
    })

  } catch (error: any) {
    console.error('❌ 删除用户组失败:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

// LDAP组操作函数
async function createLdapGroup(dn: string, entry: any): Promise<{ success: boolean, error?: string }> {
  return new Promise((resolve) => {
    const client = ldap.createClient({ url: ldapUrl })
    
    client.bind(ldapBindDN, ldapBindPassword, (err) => {
      if (err) {
        client.unbind()
        return resolve({ success: false, error: 'LDAP绑定失败' })
      }

      client.add(dn, entry, (err) => {
        client.unbind()
        if (err) {
          resolve({ success: false, error: err.message })
        } else {
          resolve({ success: true })
        }
      })
    })
  })
}

async function updateLdapGroup(dn: string, updates: any): Promise<{ success: boolean, error?: string }> {
  return new Promise((resolve) => {
    const client = ldap.createClient({ url: ldapUrl })
    
    client.bind(ldapBindDN, ldapBindPassword, (err) => {
      if (err) {
        client.unbind()
        return resolve({ success: false, error: 'LDAP绑定失败' })
      }

      const changes = []
      if (updates.name) {
        changes.push(new ldap.Change({
          operation: 'replace',
          modification: new ldap.Attribute({
            type: 'cn',
            values: [updates.name]
          })
        }))
      }
      if (updates.description) {
        changes.push(new ldap.Change({
          operation: 'replace',
          modification: new ldap.Attribute({
            type: 'description',
            values: [updates.description]
          })
        }))
      }
      if (updates.gidNumber) {
        changes.push(new ldap.Change({
          operation: 'replace',
          modification: new ldap.Attribute({
            type: 'gidNumber',
            values: [updates.gidNumber.toString()]
          })
        }))
      }

      if (changes.length === 0) {
        client.unbind()
        return resolve({ success: true })
      }

      client.modify(dn, changes, (err) => {
        client.unbind()
        if (err) {
          resolve({ success: false, error: err.message })
        } else {
          resolve({ success: true })
        }
      })
    })
  })
}

async function updateLdapGroupMembers(dn: string, members: string[]): Promise<{ success: boolean, error?: string }> {
  return new Promise((resolve) => {
    const client = ldap.createClient({ url: ldapUrl })
    
    client.bind(ldapBindDN, ldapBindPassword, (err) => {
      if (err) {
        client.unbind()
        return resolve({ success: false, error: 'LDAP绑定失败' })
      }

      // 构建更新操作 - 同时更新member和memberUid
      const changes = []
      
      // 更新 memberUid 属性 (posixGroup)
      if (members.length > 0) {
        changes.push(new ldap.Change({
          operation: 'replace',
          modification: new ldap.Attribute({
            type: 'memberUid',
            values: members
          })
        }))
      }
      
      // 更新 member 属性 (groupOfNames)
      const memberDNs = members.map(username => `cn=${username},ou=users,${ldapBaseDN}`)
      const finalMembers = memberDNs.length > 0 ? memberDNs : [`cn=admin,${ldapBaseDN}`]
      
      changes.push(new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'member',
          values: finalMembers
        })
      }))

      client.modify(dn, changes, (err) => {
        client.unbind()
        if (err) {
          // 如果同时更新失败，尝试只更新memberUid
          console.warn(`完整更新失败，尝试仅更新memberUid: ${err.message}`)
          updateMemberUidOnly(dn, members).then(result => {
            resolve(result)
          }).catch(error => {
            resolve({ success: false, error: error.message })
          })
        } else {
          resolve({ success: true })
        }
      })
    })
  })
}

// 仅更新memberUid的备用函数
async function updateMemberUidOnly(dn: string, members: string[]): Promise<{ success: boolean, error?: string }> {
  return new Promise((resolve) => {
    const client = ldap.createClient({ url: ldapUrl })
    
    client.bind(ldapBindDN, ldapBindPassword, (err) => {
      if (err) {
        client.unbind()
        return resolve({ success: false, error: 'LDAP绑定失败' })
      }

      const changes = []
      
      // 仅更新 memberUid 属性
      if (members.length > 0) {
        changes.push(new ldap.Change({
          operation: 'replace',
          modification: new ldap.Attribute({
            type: 'memberUid',
            values: members
          })
        }))
      }

      if (changes.length === 0) {
        client.unbind()
        return resolve({ success: true })
      }

      client.modify(dn, changes, (err) => {
        client.unbind()
        if (err) {
          resolve({ success: false, error: `LDAP修改memberUid失败: ${err.message}` })
        } else {
          resolve({ success: true })
        }
      })
    })
  })
}

async function deleteLdapGroup(dn: string): Promise<{ success: boolean, error?: string }> {
  return new Promise((resolve) => {
    const client = ldap.createClient({ url: ldapUrl })
    
    client.bind(ldapBindDN, ldapBindPassword, (err) => {
      if (err) {
        client.unbind()
        return resolve({ success: false, error: 'LDAP绑定失败' })
      }

      client.del(dn, (err) => {
        client.unbind()
        if (err) {
          resolve({ success: false, error: err.message })
        } else {
          resolve({ success: true })
        }
      })
    })
  })
}

 