'use client';

import { useEffect } from 'react';
import { initMonitor } from '@/lib/monitor';

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
 * - NEXT_PUBLIC_MONITOR_PROJECT_ID, NEXT_PUBLIC_MONITOR_API_KEY (移除以保护敏感信息)
 * 
 * 初始化流程：
 * - 加载 monitor.js 脚本（用于浏览器 user_id 持久化）
 * - 调用 initMonitor() 初始化 lib/monitor.ts 的事件队列和追踪功能
 */

export default function MonitorProvider({ children }: MonitorProviderProps) {
  useEffect(() => {
    // 检查脚本是否已经存在于页面中
    const existingScript = document.querySelector('script[src*="monitor.js"]');
    if (existingScript) {
      // 脚本已存在，只需要调用 initMonitor
      initMonitor();
      return;
    }
    
    // 加载 monitor.js 脚本（用于浏览器 user_id 持久化和自动 pageview 追踪）
    const script = document.createElement('script');
    script.src = process.env.NEXT_PUBLIC_MONITOR_SCRIPT_URL || 'https://monitor-git-dev-calm-66s-projects.vercel.app/monitor.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log('[Monitor] Script loaded');
      // 调用 initMonitor 初始化 lib/monitor.ts 的事件队列和追踪功能
      initMonitor();
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