'use client'

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 导航已移至左侧边栏，这里只渲染页面内容
  return (
    <div>
      {children}
    </div>
  )
} 