'use client';

import { useEffect, useState } from 'react';

interface WatermarkProps {
  children: React.ReactNode;
  username: string;
  watermarkText?: string;
  watermarkEnabled?: boolean;
}

export default function Watermark({ 
  children, 
  username, 
  watermarkText, 
  watermarkEnabled = true 
}: WatermarkProps) {
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
  }, []);

  // 确定水印文本
  const getWatermarkText = () => {
    if (!watermarkEnabled || systemSettings.watermarkEnabled === false) {
      return null;
    }
    
    // 优先使用系统设置的水印文本，其次使用传入的水印文本，最后使用用户名
    return systemSettings.watermarkText || watermarkText || username;
  };

  const watermarkTextToShow = getWatermarkText();

  if (!watermarkTextToShow) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 60px,
            rgba(0,0,0,0.02) 60px,
            rgba(0,0,0,0.02) 120px
          )`
        }}
      >
        {/* 创建优化的网格水印 - 减少密度避免重叠 */}
        {Array.from({ length: 4 }, (_, row) => 
          Array.from({ length: 5 }, (_, col) => {
            // 错位布局，奇偶行偏移
            const rowOffset = row % 2 === 0 ? 0 : 10; // 奇数行向右偏移10%
            const top = 15 + row * 20; // 4行：15%, 35%, 55%, 75%
            const left = 10 + col * 20 + rowOffset; // 5列：10%, 30%, 50%, 70%, 90% (+ 偏移)
            const rotation = (row + col) % 3 === 0 ? -45 : (row + col) % 3 === 1 ? 45 : -30; // 三种角度轮换
            const opacity = 0.25 + Math.sin((row + col) * 0.5) * 0.1; // 正弦波透明度变化
            const fontSize = 11 + (row + col) % 3; // 字体大小 11-13px
            
            return (
              <div 
                key={`grid-${row}-${col}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  top: `${Math.min(top, 95)}%`, // 确保不超出边界
                  left: `${Math.min(left, 95)}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  color: `rgba(156, 163, 175, ${Math.min(Math.abs(opacity), 0.35)})`,
                  fontSize: `${fontSize}px`,
                  letterSpacing: '1px',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.08)',
                  fontWeight: '500',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 1
                }}
              >
                {watermarkTextToShow}
              </div>
            );
          })
        )}
        
        {/* 补充的斜向水印 - 填充空白区域 */}
        {[
          { top: 25, left: 25, rotation: -60, opacity: 0.2 },
          { top: 25, left: 75, rotation: 60, opacity: 0.25 },
          { top: 45, left: 15, rotation: -30, opacity: 0.2 },
          { top: 45, left: 85, rotation: 30, opacity: 0.25 },
          { top: 65, left: 35, rotation: -60, opacity: 0.2 },
          { top: 65, left: 65, rotation: 60, opacity: 0.25 },
          { top: 85, left: 25, rotation: -30, opacity: 0.2 },
          { top: 85, left: 75, rotation: 30, opacity: 0.25 },
        ].map(({ top, left, rotation, opacity }, index) => (
          <div 
            key={`diagonal-${index}`}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              color: `rgba(156, 163, 175, ${opacity})`,
              fontSize: '10px',
              letterSpacing: '1px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.06)',
              fontWeight: '400',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              zIndex: 0
            }}
          >
            {watermarkTextToShow}
          </div>
        ))}
      </div>
    </div>
  );
} 