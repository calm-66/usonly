'use client';

import { useEffect } from 'react';

interface MonitorProviderProps {
  children: React.ReactNode;
}

export default function MonitorProvider({ children }: MonitorProviderProps) {
  useEffect(() => {
    // 动态加载监控脚本
    const script = document.createElement('script');
    script.src = 'https://usonly-git-preview-calm-66s-projects.vercel.app/monitor.js';
    script.setAttribute('data-project-id', 'UsOnly-Preview');
    script.setAttribute('data-api-key', 'mk_5Tms2UqLLBMDV24adDeCDRlpSK4CcHAO');
    script.async = true;
    
    script.onload = () => {
      console.log('[Monitor] Script loaded successfully');
    };
    
    script.onerror = () => {
      console.error('[Monitor] Failed to load script');
    };
    
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <>{children}</>;
}