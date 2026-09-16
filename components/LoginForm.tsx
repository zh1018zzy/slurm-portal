'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Lock, Eye, EyeOff, Loader2, ChevronRight } from 'lucide-react'
import { useT } from '@/lib/i18n-utils'
import { useCurrentLocale } from '@/lib/i18n-client-utils'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()
  const currentLocale = useCurrentLocale()
  const t = useT('login')

  // 登录表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()

      if (data.success && data.token) {
        // 登录成功，保存token到localStorage
        localStorage.setItem('token', data.token)
        // 跳转到仪表板（使用 useCurrentLocale 确保使用当前语言）
        router.push(`/${currentLocale}/dashboard`)
      } else {
        // 检查是否为许可证过期错误
        if (data.code === 'LICENSE_EXPIRED' && data.details) {
          // 显示详细的许可证过期信息
          const details = data.details
          if (details.isTrialExpired) {
            setError(`${data.error}\n\n试用期已结束，请联系管理员申请商业版许可证以继续使用系统。`)
          } else {
            setError(`${data.error}\n\n请联系管理员续费或更新许可证。`)
          }
        } else if (data.code === 'LICENSE_LIMIT') {
          // 并发用户限制
          setError(data.error || t('loginFailed'))
        } else {
          setError(data.error || t('loginFailed'))
        }
      }
    } catch (err) {
      setError(t('loginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 用户名输入框 - 现代浮动标签设计 */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <User className={`h-5 w-5 transition-colors duration-300 ${
            focusedField === 'username' ? 'text-green-400' : 'text-gray-500'
          }`} />
        </div>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onFocus={() => setFocusedField('username')}
          onBlur={() => setFocusedField(null)}
          required
          className="h-14 pl-12 pr-4 bg-white/5 border border-white/10 text-white placeholder-transparent peer
                     focus:bg-white/8 focus:border-green-400/50 focus:shadow-[0_0_20px_rgba(34,197,94,0.15)]
                     transition-all duration-300 rounded-xl"
          placeholder={t('username')}
        />
        <label
          htmlFor="username"
          className={`absolute left-12 transition-all duration-300 pointer-events-none
                     ${username || focusedField === 'username'
                       ? '-top-2.5 text-xs bg-slate-900 px-2 text-green-400'
                       : 'top-4 text-sm text-gray-400'
                     }`}
        >
          {t('username')}
        </label>
        {/* 聚焦时的底部光效 */}
        <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 transition-all duration-300 ${
          focusedField === 'username' ? 'w-full opacity-100' : 'w-0 opacity-0'
        }`} />
      </div>

      {/* 密码输入框 - 现代浮动标签设计 */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <Lock className={`h-5 w-5 transition-colors duration-300 ${
            focusedField === 'password' ? 'text-green-400' : 'text-gray-500'
          }`} />
        </div>
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          required
          className="h-14 pl-12 pr-12 bg-white/5 border border-white/10 text-white placeholder-transparent peer
                     focus:bg-white/8 focus:border-green-400/50 focus:shadow-[0_0_20px_rgba(34,197,94,0.15)]
                     transition-all duration-300 rounded-xl"
          placeholder={t('password')}
        />
        <label
          htmlFor="password"
          className={`absolute left-12 transition-all duration-300 pointer-events-none
                     ${password || focusedField === 'password'
                       ? '-top-2.5 text-xs bg-slate-900 px-2 text-green-400'
                       : 'top-4 text-sm text-gray-400'
                     }`}
        >
          {t('password')}
        </label>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-4 flex items-center z-10 text-gray-400 hover:text-green-400 transition-colors duration-300"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
        {/* 聚焦时的底部光效 */}
        <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 transition-all duration-300 ${
          focusedField === 'password' ? 'w-full opacity-100' : 'w-0 opacity-0'
        }`} />
      </div>

      {/* 错误信息 - 优化动画和样式 */}
      {error && (
        <div className="relative overflow-hidden bg-red-500/10 border border-red-400/30 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent" />
          <div className="text-red-400 text-sm">
            {error.split('\n').map((line, index) => (
              <p key={index} className={`flex items-start gap-2 ${index > 0 ? 'mt-2' : ''}`}>
                {index === 0 && (
                  <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse mt-1.5 flex-shrink-0" />
                )}
                {index > 0 && <span className="w-1.5 flex-shrink-0" />}
                <span className="flex-1">{line}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 登录按钮 - 现代科技风格 */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-14 bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 
                   hover:from-green-400 hover:via-emerald-500 hover:to-teal-500
                   text-white font-semibold rounded-xl
                   transition-all duration-300 transform hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                   relative overflow-hidden group"
      >
        {/* 按钮光效 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('loading')}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span>{t('login')}</span>
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        )}
      </Button>

      {/* 分隔线 */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
      </div>
    </form>
  )
}