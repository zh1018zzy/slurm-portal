import ldap from 'ldapjs'

/**
 * LDAP用户管理工具函数
 */

// LDAP配置
const url = process.env.LDAP_URL || ''
const baseDN = process.env.LDAP_BASE_DN || ''
const bindDN = process.env.LDAP_BIND_DN || ''
const bindPassword = process.env.LDAP_BIND_PASSWORD || ''

/**
 * 获取下一个可用的UID号
 * @param client LDAP客户端
 * @returns Promise<number> 下一个可用的UID号
 */
async function getNextUidNumber(client: any): Promise<number> {
  console.log('🚀 使用数据库备用策略获取UID...')
  
  // 由于 Next.js 运行时环境下 LDAP 搜索存在问题
  // 直接使用数据库查询最大 UID 作为可靠的备用方案
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    
    console.log('📊 查询数据库中最大的uid_number...')
    
    // 查询用户表中最大的 uid_number
    const { data, error } = await supabase
      .from('users')
      .select('uid_number')
      .not('uid_number', 'is', null)
      .order('uid_number', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('数据库查询失败:', error)
      return 2018 // 使用基于调试发现的安全默认值
    }
    
    if (data && data.length > 0) {
      const maxUid = data[0].uid_number
      const nextUid = maxUid + 1
      console.log(`✅ 数据库策略成功：最大UID ${maxUid}，下一个UID: ${nextUid}`)
      return nextUid
    } else {
      console.log('数据库中没有找到用户记录，使用默认起始值')
      return 2018
    }
    
  } catch (error: any) {
    console.error('数据库备用策略失败:', error.message)
    console.log('使用固定的安全默认值 2018')
    return 2018
  }
}

/**
 * 添加LDAP用户 - 支持posixAccount模板
 * @param username 用户名
 * @param password 密码
 * @param realName 真实姓名
 * @param email 邮箱
 * @returns Promise<{ success: boolean, error?: string, uidNumber?: number }> 成功返回{ success: true, uidNumber: number }，失败返回{ success: false, error: string }
 */
export async function addLdapUser(username: string, password: string, realName?: string, email?: string): Promise<{ success: boolean, error?: string, uidNumber?: number }> {
  return new Promise((resolve) => {
    console.log('addLdapUser 开始，参数:', { username, realName, email, ldapConfig: { url, baseDN, bindDN } })
    
    const client = ldap.createClient({ url })
    
    // 添加客户端连接监听器
    client.on('error', (err: any) => {
      console.error('LDAP客户端连接错误:', err)
      resolve({ success: false, error: 'LDAP连接出错: ' + err.message })
    })
    
    client.bind(bindDN, bindPassword, (err: any) => {
      if (err) {
        console.error('LDAP bind失败:', err)
        client.unbind()
        return resolve({ success: false, error: 'LDAP管理员bind失败: ' + err.message })
      }
      
      console.log('LDAP bind成功，开始检查用户是否存在...')
      
      // 先检查用户是否已存在
      const searchOpts = { filter: `(cn=${username})`, scope: 'sub' as const, attributes: ['dn'] }
      client.search(baseDN, searchOpts, (err: any, res: any) => {
        if (err) {
          console.error('LDAP搜索用户失败:', err)
          client.unbind()
          return resolve({ success: false, error: 'LDAP查找用户失败: ' + err.message })
        }
        
        let userExists = false
        res.on('searchEntry', () => {
          userExists = true
        })
        
        res.on('end', async () => {
          if (userExists) {
            console.log('用户已存在:', username)
            client.unbind()
            return resolve({ success: false, error: '用户已存在' })
          }
          
          console.log('用户不存在，获取下一个UID...')
          
          // 获取下一个可用的UID号
          try {
            const uidNumber = await getNextUidNumber(client)
            console.log('获取到uidNumber:', uidNumber)
            
            // 用户不存在，开始添加 - 使用posixAccount模板
            const userDN = `cn=${username},ou=users,${baseDN}`
            const userEntry: any = {
              cn: username,
              sn: realName || username,
              uid: username, // POSIX账户必需
              objectClass: [
                'top', 
                'person', 
                'organizationalPerson', 
                'inetOrgPerson',
                'posixAccount' // 添加posixAccount对象类
              ],
              userPassword: password,
              uidNumber: uidNumber.toString(), // POSIX UID号
              gidNumber: '2000', // 默认组ID (与现有用户保持一致)
              homeDirectory: `/home/${username}`, // 用户家目录
              loginShell: '/bin/bash' // 默认shell
            }
            
            // 可选属性
            if (email) userEntry.mail = email
            if (realName) {
              userEntry.givenName = realName.split(' ')[0] || realName
              userEntry.displayName = realName
            }
            
            console.log('准备添加用户到LDAP:', { userDN, uidNumber })
            
            client.add(userDN, userEntry, (err: any) => {
              if (err) {
                console.error('LDAP添加用户失败:', err)
                client.unbind()
                return resolve({ success: false, error: 'LDAP添加用户失败: ' + err.message })
              }
              console.log('LDAP用户添加成功:', { username, uidNumber })
              client.unbind()
              resolve({ success: true, uidNumber })
            })
          } catch (error: any) {
            console.error('获取uidNumber时发生错误:', error)
            client.unbind()
            resolve({ success: false, error: '获取UID号失败: ' + error.message })
          }
        })
        
        res.on('error', (err: any) => {
          console.error('LDAP查找用户出错:', err)
          client.unbind()
          resolve({ success: false, error: 'LDAP查找用户出错: ' + err.message })
        })
      })
    })
  })
}

/**
 * 修改LDAP用户密码
 * @param username 用户名
 * @param newPassword 新密码
 * @returns Promise<{ success: boolean, error?: string }> 成功返回{ success: true }，失败返回{ success: false, error: string }
 */
export async function changeLdapPassword(username: string, newPassword: string): Promise<{ success: boolean, error?: string }> {
  return new Promise((resolve) => {
    
    const client = ldap.createClient({ url })
    client.bind(bindDN, bindPassword, (err: any) => {
      if (err) {
        client.unbind()
        return resolve({ success: false, error: 'LDAP管理员bind失败' })
      }
      
      const opts = { filter: `(cn=${username})`, scope: 'sub' as const, attributes: ['dn'] }
      client.search(baseDN, opts, (err: any, res: any) => {
        if (err) {
          client.unbind()
          return resolve({ success: false, error: 'LDAP查找用户失败' })
        }
        
        let userDN = ''
        res.on('searchEntry', (entry: any) => {
          userDN = (entry.objectName || entry.dn || '').toString()
        })
        
        res.on('end', () => {
          if (!userDN) {
            client.unbind()
            return resolve({ success: false, error: '用户不存在' })
          }
          
          const changes = [
            new ldap.Change({
              operation: 'replace',
              modification: new ldap.Attribute({
                type: 'userPassword',
                values: [newPassword]
              })
            })
          ]
          
          client.modify(userDN, changes, (err: any) => {
            if (err) {
              client.unbind()
              return resolve({ success: false, error: 'LDAP修改密码失败: ' + err.message })
            }
            client.unbind()
            resolve({ success: true })
          })
        })
        
        res.on('error', (err: any) => {
          client.unbind()
          resolve({ success: false, error: 'LDAP查找用户出错' })
        })
      })
    })
    
    client.on('error', (err: any) => {
      resolve({ success: false, error: 'LDAP连接出错' })
    })
  })
}

/**
 * 检查LDAP用户是否存在
 * @param username 用户名
 * @returns Promise<boolean> 存在返回true，不存在返回false
 */
export async function checkLdapUserExists(username: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = ldap.createClient({ url })
    
    client.bind(bindDN, bindPassword, (err: any) => {
      if (err) {
        client.unbind()
        return resolve(false)
      }
      
      const opts = {
        filter: `(cn=${username})`,
        scope: 'sub' as const,
        attributes: ['dn']
      }
      
      client.search(baseDN, opts, (err: any, res: any) => {
        if (err) {
          client.unbind()
          return resolve(false)
        }
        
        let exists = false
        res.on('searchEntry', () => {
          exists = true
        })
        
        res.on('error', (err: any) => {
          client.unbind()
          resolve(false)
        })
        
        res.on('end', () => {
          client.unbind()
          resolve(exists)
        })
      })
    })
    
    client.on('error', (err: any) => {
      resolve(false)
    })
  })
}

/**
 * 删除LDAP用户
 * @param username 用户名
 * @returns Promise<{ success: boolean, error?: string }> 成功返回{ success: true }，失败返回{ success: false, error: string }
 */
export async function deleteLdapUser(username: string): Promise<{ success: boolean, error?: string }> {
  return new Promise((resolve) => {
    
    const client = ldap.createClient({ url })
    client.bind(bindDN, bindPassword, (err: any) => {
      if (err) {
        client.unbind()
        return resolve({ success: false, error: 'LDAP管理员bind失败' })
      }
      
      // 先查找用户DN
      const searchOpts = { filter: `(cn=${username})`, scope: 'sub' as const, attributes: ['dn'] }
      client.search(baseDN, searchOpts, (err: any, res: any) => {
        if (err) {
          client.unbind()
          return resolve({ success: false, error: 'LDAP查找用户失败' })
        }
        
        let userDN = ''
        res.on('searchEntry', (entry: any) => {
          userDN = (entry.objectName || entry.dn || '').toString()
        })
        
        res.on('end', () => {
          if (!userDN) {
            client.unbind()
            return resolve({ success: false, error: '用户不存在' })
          }
          
          // 删除用户
          client.del(userDN, (err: any) => {
            if (err) {
              client.unbind()
              return resolve({ success: false, error: 'LDAP删除用户失败: ' + err.message })
            }
            client.unbind()
            resolve({ success: true })
          })
        })
        
        res.on('error', (err: any) => {
          client.unbind()
          resolve({ success: false, error: 'LDAP查找用户出错' })
        })
      })
    })
    
    client.on('error', (err: any) => {
      resolve({ success: false, error: 'LDAP连接出错' })
    })
  })
}

/**
 * 更新LDAP用户信息
 * @param oldUsername 原用户名
 * @param newUsername 新用户名
 * @param realName 真实姓名
 * @param email 邮箱
 * @returns Promise<{ success: boolean, error?: string }> 成功返回{ success: true }，失败返回{ success: false, error: string }
 */
export async function updateLdapUser(oldUsername: string, newUsername: string, realName?: string, email?: string): Promise<{ success: boolean, error?: string }> {
  return new Promise((resolve) => {
    
    const client = ldap.createClient({ url })
    client.bind(bindDN, bindPassword, (err: any) => {
      if (err) {
        client.unbind()
        return resolve({ success: false, error: 'LDAP管理员bind失败' })
      }
      
      // 先查找用户DN
      const searchOpts = { filter: `(cn=${oldUsername})`, scope: 'sub' as const, attributes: ['dn'] }
      client.search(baseDN, searchOpts, (err: any, res: any) => {
        if (err) {
          client.unbind()
          return resolve({ success: false, error: 'LDAP查找用户失败' })
        }
        
        let userDN = ''
        res.on('searchEntry', (entry: any) => {
          userDN = (entry.objectName || entry.dn || '').toString()
        })
        
        res.on('end', () => {
          if (!userDN) {
            client.unbind()
            return resolve({ success: false, error: '用户不存在' })
          }
          
          // 准备修改操作
          const changes = []
          
          // 如果用户名发生变化，需要修改cn和sn
          if (oldUsername !== newUsername) {
            changes.push(new ldap.Change({
              operation: 'replace',
              modification: new ldap.Attribute({
                type: 'cn',
                values: [newUsername]
              })
            }))
            
            changes.push(new ldap.Change({
              operation: 'replace',
              modification: new ldap.Attribute({
                type: 'sn',
                values: [realName || newUsername]
              })
            }))
          }
          
          // 如果提供了邮箱，更新邮箱
          if (email) {
            changes.push(new ldap.Change({
              operation: 'replace',
              modification: new ldap.Attribute({
                type: 'mail',
                values: [email]
              })
            }))
          }
          
          // 如果没有修改内容，直接返回成功
          if (changes.length === 0) {
            client.unbind()
            return resolve({ success: true })
          }
          
          // 执行修改
          client.modify(userDN, changes, (err: any) => {
            if (err) {
              client.unbind()
              return resolve({ success: false, error: 'LDAP更新用户信息失败: ' + err.message })
            }
            client.unbind()
            resolve({ success: true })
          })
        })
        
        res.on('error', (err: any) => {
          client.unbind()
          resolve({ success: false, error: 'LDAP查找用户出错' })
        })
      })
    })
    
    client.on('error', (err: any) => {
      resolve({ success: false, error: 'LDAP连接出错' })
    })
  })
} 

/**
 * 批量更新所有LDAP用户的家目录前缀
 * @param newPrefix 新的家目录前缀
 * @returns Promise<{ success: boolean, error?: string, updatedCount?: number }> 
 */
export async function updateAllUsersHomeDirectory(newPrefix: string): Promise<{ success: boolean, error?: string, updatedCount?: number }> {
  return new Promise(async (resolve) => {
    console.log("🚀 开始批量更新LDAP用户家目录前缀:", newPrefix)
    
    try {
      // 从数据库获取所有用户
      const { createClient } = require("@supabase/supabase-js")
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      )
      
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("username")
      
      if (usersError || !users) {
        return resolve({ success: false, error: "获取用户列表失败: " + usersError?.message })
      }
      
      const client = ldap.createClient({ url })
      
      client.bind(bindDN, bindPassword, async (err: any) => {
        if (err) {
          client.unbind()
          return resolve({ success: false, error: "LDAP连接失败: " + err.message })
        }
        
        let updatedCount = 0
        
        // 逐个处理用户
        for (const user of users) {
          try {
            const newHomeDir = `${newPrefix}/${user.username}`
            const userDN = `cn=${user.username},ou=users,${baseDN}`
            
            const changes = [
              new ldap.Change({
                operation: "replace",
                modification: new ldap.Attribute({
                  type: "homeDirectory",
                  values: [newHomeDir]
                })
              })
            ]
            
            await new Promise<void>((resolveUpdate) => {
              client.modify(userDN, changes, (modifyErr: any) => {
                if (!modifyErr) {
                  updatedCount++
                }
                resolveUpdate()
              })
            })
          } catch (updateError) {
            // 继续处理其他用户
          }
        }
        
        client.unbind()
        resolve({ success: true, updatedCount })
      })
      
      client.on("error", () => {
        resolve({ success: false, error: "LDAP连接出错" })
      })
      
    } catch (error: any) {
      resolve({ success: false, error: error.message })
    }
  })
}
