// 声明 CSS 文件类型，允许 TypeScript 识别 CSS 导入
declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

// 声明 leaflet CSS 类型
declare module 'leaflet/dist/leaflet.css' {
  const css: string
  export default css
}

// 声明 Monitor 全局类型 - 扩展 Window 接口
export {}

declare global {
  interface MonitorInterface {
    init: (options: { projectId: string; apiKey: string; endpoint?: string; batchSize?: number; flushInterval?: number }) => void;
    trackPageview: (customData?: Record<string, any>) => void;
    trackEvent: (eventName: string, eventData?: Record<string, any>) => void;
    trackClick: (selector: string, eventName?: string) => void;
    flush: () => void;
    destroy: () => void;
  }

  interface Window {
    Monitor?: MonitorInterface;
  }
}
