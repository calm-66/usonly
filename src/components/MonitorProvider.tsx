'use client';

import { useEffect } from 'react';
import { initMonitor, trackPageview } from '@/lib/monitor';

interface MonitorProviderProps {
  children: React.ReactNode;
}

/**
 * Monitor Provider - 完全使用 lib/monitor.ts
 * 
 * 安全架构：
 * - 客户端只负责发送数据到 /api/monitor
 * - 服务器端转发到 Monitor，API Key 保存在服务器端不暴露
 * 
 * 不再需要以下环境变量：
 * - NEXT_PUBLIC_MONITOR_PROJECT_ID, NEXT_PUBLIC_MONITOR_API_KEY, NEXT_PUBLIC_MONITOR_SCRIPT_URL (全部移除以保护敏感信息)
 * 
 * 初始化流程：
 * - 调用 initMonitor() 初始化事件队列
 * - 调用 trackPageview() 追踪页面浏览
 * - 不再加载 monitor.js 脚本（避免冲突和混淆）
 */

export default function MonitorProvider({ children }: MonitorProviderProps) {
  useEffect(() => {
    // 初始化 Monitor
    initMonitor();
    
    // 追踪页面浏览
    trackPageview();
    
    console.log('[Monitor] Initialized with real-time tracking');
  }, []);

  return <>{children}</>;
}
