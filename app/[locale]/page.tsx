import { Suspense } from 'react'
import LoginForm from '@/components/LoginForm'
import LoginHeader from '@/components/LoginHeader'
import LoginBranding from '@/components/LoginBranding'
import ParticleBackground from '@/components/ParticleBackground'
import SystemFavicon from '@/components/SystemFavicon'
import { Shield, Activity, Server } from 'lucide-react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getT } from '@/lib/i18n-utils'

export default async function WelcomePage() {
  const t = await getT('login');
  return (
    <>
      <SystemFavicon />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/50 to-slate-950 relative overflow-hidden">
        {/* 科技感扫描线效果 */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(34,197,94,0.03)_50%,transparent_100%)] bg-[length:100%_4px] animate-scan pointer-events-none" />
        
        {/* 网格背景 - 更精细 */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
        
        {/* 粒子背景动画 */}
        <ParticleBackground />
        
        {/* 霓虹光晕效果 */}
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
        
        {/* 顶部装饰条 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />

        {/* 主内容区域 */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md mx-auto">
            {/* 语言切换器（右上角） */}
            <div className="absolute top-6 right-6">
              <LanguageSwitcher />
            </div>
            
            {/* 系统标题和图标 */}
            <LoginHeader />

            {/* 登录卡片 - 增强玻璃形态 */}
            <div className="relative group">
              {/* 卡片光晕 */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-500" />
              
              <div className="relative bg-slate-900/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl p-8 
                            animate-fade-in-up hover:border-green-400/30 transition-all duration-500">
                {/* 顶部装饰线 */}
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />
                
                {/* 角落装饰 */}
                <div className="absolute top-4 left-4 w-3 h-3 border-l-2 border-t-2 border-green-400/50" />
                <div className="absolute top-4 right-4 w-3 h-3 border-r-2 border-t-2 border-green-400/50" />
                <div className="absolute bottom-4 left-4 w-3 h-3 border-l-2 border-b-2 border-green-400/50" />
                <div className="absolute bottom-4 right-4 w-3 h-3 border-r-2 border-b-2 border-green-400/50" />
                
                <Suspense fallback={
                  <div className="space-y-4">
                    <div className="h-14 bg-white/5 rounded-xl animate-pulse" />
                    <div className="h-14 bg-white/5 rounded-xl animate-pulse" />
                    <div className="h-14 bg-white/5 rounded-xl animate-pulse" />
                  </div>
                }>
                  <LoginForm />
                </Suspense>
              </div>
            </div>

            {/* 系统状态指示器 - 现代化设计 */}
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs">
              <div className="group flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 hover:border-green-400/50 transition-all duration-300">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                </div>
                <Shield className="w-3 h-3 text-green-400" />
                <span className="text-gray-300 font-medium">{t('systemOnline')}</span>
              </div>
              
              <div className="group flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 hover:border-emerald-400/50 transition-all duration-300">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <Server className="w-3 h-3 text-emerald-400" />
                <span className="text-gray-300 font-medium">{t('clusterNormal')}</span>
              </div>
              
              <div className="group flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 hover:border-teal-400/50 transition-all duration-300">
                <div className="relative">
                  <div className="w-2 h-2 bg-teal-400 rounded-full" />
                  <div className="absolute inset-0 w-2 h-2 bg-teal-400 rounded-full animate-ping" />
                </div>
                <Activity className="w-3 h-3 text-teal-400" />
                <span className="text-gray-300 font-medium">{t('realtimeMonitoring')}</span>
              </div>
            </div>

            {/* 品牌信息 */}
            <LoginBranding className="mt-8" />
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent" />
          <div className="h-32 bg-gradient-to-t from-slate-950/80 to-transparent" />
        </div>

      </div>
    </>
  )
}