import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ldap from 'ldapjs'
import type { Client as LdapClient } from 'ldapjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../../../../lib/logger'
import { updateNisUser } from '@/lib/nis-user'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// PUT /api/users/[id] 编辑用户
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = resolvedParams.id
  const body = await req.json()
  const { username, real_name, email, phone, department, role, webshell_access, login_shell, gid_number } = body
  
  // 构建更新数据对象，只包含提供的字段
  const updateData: any = {}
  if (real_name !== undefined) updateData.real_name = real_name
  if (email !== undefined) updateData.email = email
  if (phone !== undefined) updateData.phone = phone
  if (department !== undefined) updateData.department = department
  if (role !== undefined) updateData.role = role
  if (webshell_access !== undefined) updateData.webshell_access = webshell_access
  
  // POSIX字段更新
  if (login_shell !== undefined) updateData.login_shell = login_shell
  if (gid_number !== undefined) updateData.gid_number = gid_number
  
  // 如果有POSIX字段更新，需要同步到底层认证系统（LDAP / NIS）
  if (login_shell !== undefined) {
    try {
      // 获取用户名用于LDAP更新
      const { data: userData } = await supabase.from('users').select('username').eq('id', id).single()
      const username = userData?.username
      if (username) {
        const authMode = process.env.AUTH_MODE || 'linux'

        if (authMode === 'ldap') {
          await updateLdapUserShell(username, login_shell)
        } else if (authMode === 'linux') {
          const result = await updateNisUser(username, { shell: login_shell })
          if (!result.success) {
            logger.warn('UserUpdate', `NIS shell更新失败: ${result.error}`)
          }
        }
      }
    } catch (error) {
      logger.warn('UserUpdate', '底层用户shell更新失败', error)
      // 不阻止数据库更新，只记录警告
    }
  }
  
  // 直接更新Supabase数据库
  const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select()
  
  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 400 })
  }
  
  return Response.json({ success: true, user: data[0] })
}

// 更新LDAP用户shell的辅助函数
async function updateLdapUserShell(username: string, loginShell: string): Promise<void> {
  const url = process.env.LDAP_URL || ''
  const baseDN = process.env.LDAP_BASE_DN || ''
  const bindDN = process.env.LDAP_BIND_DN || ''
  const bindPassword = process.env.LDAP_BIND_PASSWORD || ''

  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url })
    
    client.bind(bindDN, bindPassword, (err: any) => {
      if (err) {
        client.unbind()
        return reject(err)
      }
      
      // 查找用户DN
      const searchOpts = {
        filter: `(cn=${username})`,
        scope: 'sub' as const,
        attributes: ['dn']
      }
      
      client.search(baseDN, searchOpts, (err: any, res: any) => {
        if (err) {
          client.unbind()
          return reject(err)
        }
        
        let userDN = ''
        res.on('searchEntry', (entry: any) => {
          userDN = (entry.objectName || entry.dn || '').toString()
        })
        
        res.on('end', () => {
          if (!userDN) {
            client.unbind()
            return reject(new Error('用户不存在'))
          }
          
          // 更新loginShell属性
          const changes = [
            new ldap.Change({
              operation: 'replace',
              modification: new ldap.Attribute({
                type: 'loginShell',
                values: [loginShell]
              })
            })
          ]
          
          client.modify(userDN, changes, (err: any) => {
            client.unbind()
            if (err) {
              return reject(err)
            }
            resolve()
          })
        })
        
        res.on('error', (err: any) => {
          client.unbind()
          reject(err)
        })
      })
    })
    
    client.on('error', (err: any) => {
      reject(err)
    })
  })
}

// DELETE /api/users/[id] 删除用户（同步删除LDAP和Supabase Auth，并记录黑名单）
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = resolvedParams.id
  
  try {
    // 1. 查找数据库用户信息
    const { data: user, error: findError } = await supabase.from('users').select('username, email').eq('id', id).single()
    if (findError || !user) {
      return Response.json({ success: false, error: '用户不存在' }, { status: 404 })
    }

    // 2. 添加用户到删除黑名单（防止重新同步）
    try {
      const { error: blacklistError } = await supabase
        .from('deleted_users_blacklist')
        .upsert({
          username: user.username,
          email: user.email,
          deleted_at: new Date().toISOString(),
          deleted_by: 'admin', // TODO: 从JWT获取实际删除用户
          reason: '管理员删除'
        })
      
      if (blacklistError) {
        logger.warn('UserDeletion', `添加用户到黑名单失败: ${blacklistError.message}`)
      } else {
        logger.info('UserDeletion', `用户已添加到删除黑名单: ${user.username}`)
      }
    } catch (blacklistError: any) {
      logger.warn('UserDeletion', `黑名单操作失败: ${blacklistError.message}`)
      // 黑名单添加失败不阻止删除操作
    }

    // 3. 删除Supabase Auth账号
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(id)
      if (authError) {
        logger.warn('UserDeletion', `删除Auth用户失败: ${authError.message}，继续删除其他数据`)
      } else {
        logger.info('UserDeletion', `已删除Auth用户: ${user.username}`)
      }
    } catch (authError: any) {
      logger.warn('UserDeletion', `删除Auth用户时发生错误: ${authError.message}，继续删除其他数据`)
    }

    // 4. 删除LDAP用户（增强版本，详细日志记录）
    const url = process.env.LDAP_URL || ''
    const baseDN = process.env.LDAP_BASE_DN || ''
    const bindDN = process.env.LDAP_BIND_DN || ''
    const bindPassword = process.env.LDAP_BIND_PASSWORD || ''
    
    logger.debug('UserDeletion', 'LDAP配置检查', {
      url: url,
      baseDN: baseDN,
      bindDN: bindDN,
      hasPassword: bindPassword ? '已设置' : '未设置'
    })
    
    let ldapDeleteSucceeded = false
    
    if (url && baseDN && bindDN && bindPassword) {
      try {
        logger.info('UserDeletion', `开始LDAP删除操作 - 用户: ${user.username}`)
        
        await new Promise((resolve, reject) => {
          const client = ldap.createClient({ url })
          
          // 设置超时
          const timeout = setTimeout(() => {
            logger.error('UserDeletion', 'LDAP操作超时（30秒）')
            client.unbind()
            reject(new Error('LDAP操作超时'))
          }, 30000) // 30秒超时
          
          client.on('error', (err: any) => {
            logger.error('UserDeletion', 'LDAP客户端错误', err)
            clearTimeout(timeout)
            reject(err)
          })
          
          client.bind(bindDN, bindPassword, (err: any) => {
            if (err) {
              logger.error('UserDeletion', 'LDAP bind失败', err)
              clearTimeout(timeout)
              return reject(err)
            }
            
            logger.info('UserDeletion', 'LDAP bind成功')
            logger.debug('UserDeletion', `开始查找LDAP用户: ${user.username}`)
            
            // 在用户组织单元下搜索用户
            const usersDN = `ou=users,${baseDN}`
            logger.debug('UserDeletion', `搜索路径: ${usersDN}`)
            
            const searchOpts = {
              filter: `(cn=${user.username})`,
              scope: 'sub' as const,
              attributes: ['dn']
            }
            logger.debug('UserDeletion', `搜索过滤器: ${searchOpts.filter}`)
            
            client.search(usersDN, searchOpts, (err: any, res: any) => {
              if (err) {
                logger.error('UserDeletion', 'LDAP搜索失败', err)
                client.unbind()
                clearTimeout(timeout)
                return reject(err)
              }
              
              let userDN = ''
              let entryCount = 0
              let searchComplete = false
              
              res.on('searchEntry', (entry: any) => {
                if (!searchComplete) {
                  entryCount++
                  userDN = (entry.objectName || entry.dn || '').toString()
                  logger.info('UserDeletion', `找到LDAP用户DN: ${userDN}`)
                  logger.debug('UserDeletion', `搜索条目详情`, {
                    objectName: entry.objectName?.toString(),
                    dn: entry.dn?.toString(),
                    entryCount: entryCount
                  })
                }
              })
              
              res.on('end', () => {
                searchComplete = true
                logger.debug('UserDeletion', `LDAP搜索完成，找到 ${entryCount} 个匹配条目`)
                
                if (!userDN || entryCount === 0) {
                  logger.warn('UserDeletion', `LDAP中未找到用户: ${user.username}，尝试直接删除已知DN`)
                  
                  // 如果搜索没找到，尝试构造标准DN并直接删除
                  const constructedDN = `cn=${user.username},ou=users,${baseDN}`
                  logger.info('UserDeletion', `尝试删除构造的DN: ${constructedDN}`)
                  
                  client.del(constructedDN, (err: any) => {
                    clearTimeout(timeout)
                    
                    if (err) {
                      logger.info('UserDeletion', `构造DN删除失败: ${err.message}，用户可能已不存在`)
                      // 如果构造DN删除也失败，认为用户已经不存在，继续流程
                      client.unbind()
                      resolve(true)
                    } else {
                      logger.info('UserDeletion', `构造DN删除成功: ${user.username}`)
                      client.unbind()
                      resolve(true)
                    }
                  })
                  return
                }
                
                // 执行正常删除操作
                logger.info('UserDeletion', `开始删除LDAP用户: ${userDN}`)
                client.del(userDN, (err: any) => {
                  clearTimeout(timeout)
                  
                  if (err) {
                    logger.error('UserDeletion', `LDAP删除失败`, err)
                    client.unbind()
                    return reject(new Error(`LDAP删除失败: ${err.message}`))
                  }
                  
                  logger.info('UserDeletion', `LDAP用户删除成功: ${user.username}`)
                  client.unbind()
                  resolve(true)
                })
              })
              
              res.on('error', (err: any) => {
                if (!searchComplete) {
                  logger.error('UserDeletion', 'LDAP搜索过程错误', err)
                  client.unbind()
                  clearTimeout(timeout)
                  reject(err)
                }
              })
            })
          })
        })
        
        ldapDeleteSucceeded = true
        logger.info('UserDeletion', `LDAP用户删除完成: ${user.username}`)
        
      } catch (ldapError: any) {
        logger.error('UserDeletion', `LDAP删除操作失败`, ldapError)
        
        // LDAP删除失败时，阻止数据库删除
        return Response.json({ 
          success: false, 
          error: `用户删除失败：LDAP删除失败 (${ldapError.message})。请检查LDAP连接或手动删除LDAP用户后重试。`,
          details: {
            ldapUrl: url,
            username: user.username,
            errorMessage: ldapError.message
          }
        }, { status: 500 })
      }
    } else {
      logger.warn('UserDeletion', 'LDAP配置不完整，跳过LDAP删除', {
        hasUrl: !!url,
        hasBaseDN: !!baseDN,
        hasBindDN: !!bindDN,
        hasPassword: !!bindPassword
      })
      ldapDeleteSucceeded = true // 如果没有配置LDAP，则认为删除成功
    }

    // 5. 删除数据库中的相关数据（在删除用户之前，确保清理所有依赖）
    if (ldapDeleteSucceeded) {
      try {
        logger.info('UserDeletion', `开始清理用户相关数据: ${user.username}`)
        
        // 5.1 删除文件权限（如果外键约束不是CASCADE，手动删除）
        const { error: filePermsError } = await supabase
          .from('file_permissions')
          .delete()
          .eq('user_id', id)
        if (filePermsError) {
          logger.warn('UserDeletion', `删除文件权限失败（可能不存在）: ${filePermsError.message}`)
        } else {
          logger.info('UserDeletion', `已删除用户的文件权限记录`)
        }

        // 5.2 删除WebShell权限
        const { error: webshellPermsError } = await supabase
          .from('webshell_permissions')
          .delete()
          .eq('user_id', id)
        if (webshellPermsError) {
          logger.warn('UserDeletion', `删除WebShell权限失败（可能不存在）: ${webshellPermsError.message}`)
        } else {
          logger.info('UserDeletion', `已删除用户的WebShell权限记录`)
        }

        // 5.3 删除剪贴板权限
        const { error: clipboardPermsError } = await supabase
          .from('clipboard_permissions')
          .delete()
          .eq('user_id', id)
        if (clipboardPermsError) {
          logger.warn('UserDeletion', `删除剪贴板权限失败（可能不存在）: ${clipboardPermsError.message}`)
        } else {
          logger.info('UserDeletion', `已删除用户的剪贴板权限记录`)
        }

        // 5.4 删除用户组成员关系
        const { error: groupMembershipError } = await supabase
          .from('user_group_memberships')
          .delete()
          .eq('user_id', id)
        if (groupMembershipError) {
          logger.warn('UserDeletion', `删除用户组成员关系失败（可能不存在）: ${groupMembershipError.message}`)
        } else {
          logger.info('UserDeletion', `已删除用户的组成员关系`)
        }

        // 5.5 更新审计日志（将user_id设为NULL，保留日志记录）
        const { error: auditLogsError } = await supabase
          .from('permission_audit_logs')
          .update({ user_id: null })
          .eq('user_id', id)
        if (auditLogsError) {
          logger.warn('UserDeletion', `更新审计日志失败（可能不存在）: ${auditLogsError.message}`)
        } else {
          logger.info('UserDeletion', `已更新审计日志记录`)
        }

        // 5.6 更新文件操作日志
        const { error: fileLogsError } = await supabase
          .from('file_operation_logs')
          .update({ user_id: null })
          .eq('user_id', id)
        if (fileLogsError) {
          logger.warn('UserDeletion', `更新文件操作日志失败（可能不存在）: ${fileLogsError.message}`)
        } else {
          logger.info('UserDeletion', `已更新文件操作日志记录`)
        }

        // 5.7 更新WebShell操作日志
        const { error: webshellLogsError } = await supabase
          .from('webshell_operation_logs')
          .update({ user_id: null })
          .eq('user_id', id)
        if (webshellLogsError) {
          logger.warn('UserDeletion', `更新WebShell操作日志失败（可能不存在）: ${webshellLogsError.message}`)
        } else {
          logger.info('UserDeletion', `已更新WebShell操作日志记录`)
        }

        logger.info('UserDeletion', `用户相关数据清理完成: ${user.username}`)

      } catch (cleanupError: any) {
        logger.error('UserDeletion', `清理用户相关数据时出错: ${cleanupError.message}`)
        // 即使清理出错，也尝试继续删除用户
      }

      // 5.8 最后删除用户记录
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (error) {
        logger.error('UserDeletion', '数据库删除失败', error)
        return Response.json({ 
          success: false, 
          error: `数据库删除失败: ${error.message}。可能仍有其他表引用此用户，请检查数据库外键约束。`,
          hint: '请执行 db/fix-user-foreign-keys.sql 脚本修复外键约束'
        }, { status: 400 })
      }

      logger.info('UserDeletion', `数据库用户删除成功: ${user.username}`)
      logger.info('UserDeletion', `用户完全删除成功并已加入黑名单: ${user.username}`)
      
      return Response.json({ 
        success: true, 
        message: `用户 ${user.username} 已完全删除并已加入黑名单，防止重新同步` 
      })
    } else {
      return Response.json({ 
        success: false, 
        error: '用户删除失败：LDAP删除未成功完成' 
      }, { status: 500 })
    }

  } catch (error: any) {
    logger.error('UserDeletion', '删除用户时发生错误', error)
    return Response.json({ success: false, error: error.message || '删除用户失败' }, { status: 500 })
  }
}

// GET /api/users/[id] 获取用户详细信息
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = resolvedParams.id
  // 先尝试用 id 查
  let { data: user, error } = await supabase.from('users').select('*').eq('id', id).single()
  // 如果没查到，再用 username 查
  if (error || !user) {
    const { data: userByName, error: err2 } = await supabase.from('users').select('*').eq('username', id).single()
    if (err2 || !userByName) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    user = userByName
  }
  return NextResponse.json({ user })
} 