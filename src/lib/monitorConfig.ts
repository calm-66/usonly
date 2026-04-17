/**
 * Monitor 配置模块
 * 用于动态获取 Vercel 环境对应的 Monitor 配置
 */

interface MonitorConfig {
  endpoint: string;
  apiKey: string;
  projectId: string;
  scriptUrl?: string;
}

/**
 * 根据当前 Vercel 环境动态获取 Monitor 配置
 * @returns MonitorConfig 配置对象
 */
export function getMonitorConfig(): MonitorConfig {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  
  const endpoint = process.env.MONITOR_ENDPOINT || '';
  const apiKey = isPreview 
    ? process.env.MONITOR_PREVIEW_API_KEY || ''
    : process.env.MONITOR_PRODUCTION_API_KEY || '';
  const projectId = isPreview 
    ? process.env.MONITOR_PREVIEW_PROJECT_ID || ''
    : process.env.MONITOR_PRODUCTION_PROJECT_ID || '';
  const scriptUrl = process.env.NEXT_PUBLIC_MONITOR_SCRIPT_URL;
  
  return {
    endpoint,
    apiKey,
    projectId,
    scriptUrl,
  };
}

/**
 * 获取当前环境类型
 * @returns 'preview' | 'production'
 */
export function getVercelEnv(): 'preview' | 'production' {
  return process.env.VERCEL_ENV === 'preview' ? 'preview' : 'production';
}

/**
 * 构建 Monitor API 请求的通用方法
 * @param path API 路径（如 '/api/events'）
 * @returns 完整的 API URL
 */
export function buildMonitorApiUrl(path: string): string {
  const { endpoint } = getMonitorConfig();
  // 确保 path 以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${endpoint}${normalizedPath}`;
}

/**
 * 构建 Monitor 请求头
 * @returns 包含 API Key 和 Project ID 的 headers 对象
 */
export function getMonitorHeaders(): Record<string, string> {
  const { apiKey, projectId } = getMonitorConfig();
  return {
    'X-API-Key': apiKey,
    'X-Project-ID': projectId,
    'Content-Type': 'application/json',
  };
}