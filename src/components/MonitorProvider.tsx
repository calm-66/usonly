'use client';

import { useEffect, useState } from 'react';

interface MonitorProviderProps {
  children: React.ReactNode;
}

export default function MonitorProvider({ children }: MonitorProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    console.log('[Monitor] Starting to load script...');
    console.log('[Monitor] Script URL: https://monitor-git-dev-calm-66s-projects.vercel.app/monitor.js');
    
    // 检查脚本是否已经存在于页面中
    const existingScript = document.querySelector('script[src*="monitor.js"]');
    if (existingScript) {
      console.log('[Monitor] Script already exists, removing...');
      existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.src = 'https://monitor-git-dev-calm-66s-projects.vercel.app/monitor.js';
    script.setAttribute('data-project-id', 'UsOnly-Preview');
    script.setAttribute('data-api-key', 'mk_5Tms2UqLLBMDV24adDeCDRlpSK4CcHAO');
    script.async = true;
    
    script.onload = () => {
      console.log('[Monitor] ✅ Script loaded successfully');
      console.log('[Monitor] Window.Monitor type:', typeof window.Monitor);
      console.log('[Monitor] Window.Monitor:', window.Monitor);
      setIsLoaded(true);
    };
    
    script.onerror = (error) => {
      console.error('[Monitor] ❌ Failed to load script', error);
      console.log('[Monitor] Script src:', script.src);
      console.log('[Monitor] Script element:', script);
      console.log('[Monitor] Script parent:', script.parentElement);
    };
    
    console.log('[Monitor] Appending script to body...');
    document.body.appendChild(script);
    
    return () => {
      console.log('[Monitor] Cleanup: removing script');
      if (script.parentElement) {
        script.parentElement.removeChild(script);
      }
    };
  }, []);

  return <>{children}</>;
}