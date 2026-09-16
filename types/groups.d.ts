// 用户组管理相关类型定义
declare namespace Groups {
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

  interface GroupMember {
    id: string
    group_id: string
    username: string
    added_at: string
  }

  interface GroupSyncResult {
    success: boolean
    error?: string
    created?: number
    updated?: number
    errors?: number
    details?: string[]
  }

  interface LdapSyncAnalysis {
    ldapGroups: number
    dbGroups: number
    toCreate: string[]
    toUpdate: string[]
    ldapGroupDetails: Array<{
      name: string
      description: string
      memberCount: number
      dn: string
    }>
  }
}

// 导出类型到全局命名空间
export = Groups
export as namespace Groups