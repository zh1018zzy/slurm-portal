'use client';

import { useEffect, useState, useMemo } from 'react';

interface WebShellWatermarkProps {
  children: React.ReactNode;
  username: string;
  watermarkText?: string;
  watermarkEnabled?: boolean;
}

export default function WebShellWatermark({ 
  children, 
  username, 
  watermarkText, 
  watermarkEnabled = true 
}: WebShellWatermarkProps) {
  const [systemSettings, setSystemSettings] = useState<{
    watermarkText?: string;
    watermarkEnabled?: boolean;
  }>({});

  // 获取系统设置
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    fetch('/api/system/settings', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      .then(res => res.json())
      .then((data) => {
        setSystemSettings({
          watermarkText: data.watermarkText,
          watermarkEnabled: data.watermarkEnabled
        });
      })
      .catch(() => {
        // 如果获取失败，使用默认设置
        setSystemSettings({
          watermarkText: '',
          watermarkEnabled: true
        });
      });
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 使用 useMemo 缓存水印文本，避免不必要的重新计算
  const watermarkTextToShow = useMemo(() => {
    if (!watermarkEnabled || systemSettings.watermarkEnabled === false) {
      return null;
    }
    
    // 优先使用系统设置的水印文本，其次使用传入的水印文本，最后使用用户名
    return systemSettings.watermarkText || watermarkText || username;
  }, [watermarkEnabled, systemSettings.watermarkEnabled, systemSettings.watermarkText, watermarkText, username]);

  // 如果不需要显示水印，直接返回子组件
  if (!watermarkTextToShow) {
    return <>{children}</>;
  }

  // 优化水印配置 - 平衡覆盖和性能
  const watermarkPositions = [
    // 主要水印 - 大尺寸，覆盖核心区域
    { top: '10%', left: '10%', fontSize: '24px', opacity: '0.5', rotation: '-45deg' },
    { top: '20%', left: '80%', fontSize: '22px', opacity: '0.45', rotation: '-45deg' },
    { top: '40%', left: '20%', fontSize: '20px', opacity: '0.4', rotation: '-45deg' },
    { top: '50%', left: '50%', fontSize: '26px', opacity: '0.5', rotation: '-45deg' },
    { top: '60%', left: '70%', fontSize: '18px', opacity: '0.4', rotation: '-45deg' },
    { top: '80%', left: '15%', fontSize: '20px', opacity: '0.4', rotation: '-45deg' },
    { top: '90%', left: '85%', fontSize: '22px', opacity: '0.45', rotation: '-45deg' },
    
    // 对角线水印 - 不同角度，增加覆盖
    { top: '15%', left: '50%', fontSize: '16px', opacity: '0.3', rotation: '-30deg' },
    { top: '35%', left: '90%', fontSize: '18px', opacity: '0.35', rotation: '-30deg' },
    { top: '55%', left: '10%', fontSize: '16px', opacity: '0.3', rotation: '-60deg' },
    { top: '75%', left: '70%', fontSize: '16px', opacity: '0.3', rotation: '-30deg' },
    
    // 边缘水印 - 小尺寸，覆盖边缘
    { top: '5%', left: '25%', fontSize: '14px', opacity: '0.25', rotation: '-45deg' },
    { top: '5%', left: '75%', fontSize: '14px', opacity: '0.25', rotation: '-45deg' },
    { top: '25%', left: '5%', fontSize: '14px', opacity: '0.25', rotation: '-45deg' },
    { top: '25%', left: '95%', fontSize: '14px', opacity: '0.25', rotation: '-45deg' },
    { top: '85%', left: '25%', fontSize: '14px', opacity: '0.25', rotation: '-45deg' },
    { top: '85%', left: '75%', fontSize: '14px', opacity: '0.25', rotation: '-45deg' },
    { top: '95%', left: '50%', fontSize: '14px', opacity: '0.25', rotation: '-45deg' },
  ];

  return (
    <div className="relative w-full h-full">
      {children}
      {/* 水印层 - 使用绝对定位，不遮挡内容 */}
        {watermarkPositions.map((pos, index) => (
          <div 
            key={index}
          className="absolute pointer-events-none select-none"
            style={{
              top: pos.top,
              left: pos.left,
              fontSize: pos.fontSize,
              color: `rgba(156, 163, 175, ${pos.opacity})`,
              letterSpacing: '1px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              fontWeight: '600',
              transform: `translate(-50%, -50%) rotate(${pos.rotation})`,
            whiteSpace: 'nowrap',
            zIndex: 200,
            willChange: 'transform'
          }}
        >
          {watermarkTextToShow}
        </div>
      ))}
    </div>
  );
} 