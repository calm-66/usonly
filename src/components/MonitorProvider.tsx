'use client';

import { useEffect, useState } from 'react';

interface MonitorProviderProps {
  children: React.ReactNode;
}

export default function MonitorProvider({ children }: MonitorProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    console.log('[Monitor] ====== Starting to load script ======');
    console.log('[Monitor] Script URL: https://monitor-git-dev-calm-66s-projects.vercel.app/monitor.js');
    console.log('[Monitor] Current page URL:', window.location.href);
    console.log('[Monitor] Current timestamp:', new Date().toISOString());
    
    // 检查脚本是否已经存在于页面中
    const existingScript = document.querySelector('script[src*="monitor.js"]');
    if (existingScript) {
      console.log('[Monitor] Script already exists, removing...');
      existingScript.remove();
    }
    
    // 先使用 fetch 检查脚本 URL
    console.log('[Monitor] Sending HEAD request to check script availability...');
    fetch('https://monitor-git-dev-calm-66s-projects.vercel.app/monitor.js', {
      method: 'HEAD',
      mode: 'no-cors'
    })
    .then(response => {
      console.log('[Monitor] HEAD response status:', response.status);
      console.log('[Monitor] HEAD response ok:', response.ok);
      console.log('[Monitor] HEAD response type:', response.type);
    })
    .catch(error => {
      console.error('[Monitor] HEAD request failed:', error);
    });
    
    const script = document.createElement('script');
    script.src = 'https://monitor-git-dev-calm-66s-projects.vercel.app/monitor.js';
    script.setAttribute('data-project-id', '28cc0e0a-aa4e-4421-b1d9-e311e34d2eed');
    script.setAttribute('data-api-key', 'mk_5Tms2UqLLBMDV24adDeCDRlpSK4CcHAO');
    script.setAttribute('data-endpoint', 'https://monitor-git-dev-calm-66s-projects.vercel.app/api/events');
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log('[Monitor] ✅ Script loaded successfully');
      console.log('[Monitor] Window.Monitor type:', typeof (window as any).Monitor);
      console.log('[Monitor] Window.Monitor:', (window as any).Monitor);
      setIsLoaded(true);
    };
    
    script.onerror = (error) => {
      console.error('[Monitor] ❌ Failed to load script', error);
      console.log('[Monitor] Script src:', script.src);
      console.log('[Monitor] Script element:', script);
      console.log('[Monitor] Script parent:', script.parentElement);
      console.log('[Monitor] Script attributes:', {
        src: script.getAttribute('src'),
        async: script.async,
        crossOrigin: script.crossOrigin,
        dataProjectId: script.getAttribute('data-project-id'),
        dataApiKey: script.getAttribute('data-api-key')
      });
      
      // 尝试直接访问脚本 URL
      console.log('[Monitor] Attempting to fetch script content directly...');
      fetch(script.src, { mode: 'no-cors' })
        .then(response => {
          console.log('[Monitor] Direct fetch status:', response.status);
          console.log('[Monitor] Direct fetch ok:', response.ok);
          console.log('[Monitor] Direct fetch type:', response.type);
        })
        .catch(fetchError => {
          console.error('[Monitor] Direct fetch failed:', fetchError);
        });
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