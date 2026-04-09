'use client';

import { useEffect } from 'react';

interface MonitorProviderProps {
  children: React.ReactNode;
}

// 环境变量配置（默认值用于开发环境）
const MONITOR_CONFIG = {
  scriptUrl: process.env.NEXT_PUBLIC_MONITOR_SCRIPT_URL || 'https://monitor-git-dev-calm-66s-projects.vercel.app/monitor.js',
  projectId: process.env.NEXT_PUBLIC_MONITOR_PROJECT_ID || '',
  apiKey: process.env.NEXT_PUBLIC_MONITOR_API_KEY || '',
  endpoint: process.env.NEXT_PUBLIC_MONITOR_ENDPOINT || 'https://monitor-git-dev-calm-66s-projects.vercel.app/api/events',
};

export default function MonitorProvider({ children }: MonitorProviderProps) {
  useEffect(() => {
    // 检查必要配置是否存在
    if (!MONITOR_CONFIG.projectId || !MONITOR_CONFIG.apiKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Monitor] Missing required configuration. Please set NEXT_PUBLIC_MONITOR_PROJECT_ID and NEXT_PUBLIC_MONITOR_API_KEY in your .env file.');
      }
      return;
    }

    // 检查脚本是否已经存在于页面中
    const existingScript = document.querySelector('script[src*="monitor.js"]');
    if (existingScript) {
      return; // 脚本已存在，跳过加载
    }
    
    const script = document.createElement('script');
    script.src = MONITOR_CONFIG.scriptUrl;
    script.setAttribute('data-project-id', MONITOR_CONFIG.projectId);
    script.setAttribute('data-api-key', MONITOR_CONFIG.apiKey);
    script.setAttribute('data-endpoint', MONITOR_CONFIG.endpoint);
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Monitor] Script loaded successfully');
      }
      
      // 脚本加载完成后，初始化环境标识
      if (window.Monitor) {
        // 获取当前环境（preview 或 main）
        const currentEnv = getCurrentEnvironment();
        
        // 重写 trackPageview 以添加环境标识
        const originalTrackPageview = window.Monitor.trackPageview;
        window.Monitor.trackPageview = function(customData) {
          return originalTrackPageview({
            ...customData,
            environment: currentEnv
          });
        };
        
        // 重写 trackEvent 以添加环境标识
        const originalTrackEvent = window.Monitor.trackEvent;
        window.Monitor.trackEvent = function(eventName, eventData) {
          return originalTrackEvent(eventName, {
            ...eventData,
            environment: currentEnv
          });
        };
      }
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

/**
 * 获取当前环境标识
 * 根据域名判断是 preview 还是 main 环境
 */
function getCurrentEnvironment(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const hostname = window.location.hostname;
  
  // 检查是否是 preview 环境（Vercel preview URL）
  // Vercel preview URL 格式：xxx-preview.vercel.app 或 xxx-git-xxx-preview.vercel.app
  if (hostname.includes('-preview') || hostname.includes('vercel.app')) {
    return 'preview';
  }
  
  // 默认为 main/production 环境
  return 'main';
}
