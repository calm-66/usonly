'use client';

import { useEffect } from 'react';

interface MonitorProviderProps {
  children: React.ReactNode;
}

/**
 * Monitor Provider - 简化版
 * 
 * 安全架构：
 * - 客户端只负责发送数据到 /api/monitor
 * - 服务器端转发到 Monitor，API Key 保存在服务器端不暴露
 * 
 * 不再需要以下环境变量：
 * - NEXT_PUBLIC_MONITOR_* (全部移除)
 */

export default function MonitorProvider({ children }: MonitorProviderProps) {
  useEffect(() => {
    // 检查脚本是否已经存在于页面中
    const existingScript = document.querySelector('script[src*="monitor.js"]');
    if (existingScript) {
      return; // 脚本已存在，跳过加载
    }
    
    // 不再需要配置参数，脚本只用于 pageview 自动追踪
    const script = document.createElement('script');
    script.src = process.env.NEXT_PUBLIC_MONITOR_SCRIPT_URL || 'https://monitor-git-dev-calm-66s-projects.vercel.app/monitor.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log('[Monitor] Script loaded');
    };
    
    script.onerror = (error) => {
      console.error('[Monitor] Failed to load script:', error);
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (script.parentElement) {
        script.parentElement.removeChild(script);
      }
    };
  }, []);

  return <>{children}</>;
}