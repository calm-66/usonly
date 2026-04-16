/**
 * Monitor 集成工具 - 用于上报登录等事件到 Monitor 平台
 * 
 * 使用方法：
 * 1. 在页面加载时调用 initMonitor() 初始化
 * 2. 在登录成功时调用 trackLogin(userId, username) 上报登录事件
 * 
 * 安全架构：
 * - 客户端发送数据到 /api/monitor
 * - 服务器端转发到 Monitor，API Key 保存在服务器端不暴露
 */

// 事件队列
let eventQueue: any[] = [];
let isFlushing = false;
let isInitialized = false; // 防止重复初始化

/**
 * 初始化 Monitor（在客户端调用）
 * 
 * 实时发送模式：
 * - 每个事件都会立即发送，不等待队列满或定时刷新
 * - 保留页面卸载时的刷新逻辑作为保险
 */
export function initMonitor() {
  // 防止重复初始化
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  // 页面卸载时刷新（作为保险）
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushEvents);
    window.addEventListener('pagehide', flushEvents);
  }
}

/**
 * 追踪登录事件
 * @param userId - 用户 ID
 * @param username - 用户名
 * @param ipAddress - 可选的客户端 IP 地址
 */
export function trackLogin(userId: string, username: string, ipAddress?: string) {
  const payload: any = {
    eventType: 'custom',
    eventName: 'login',
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
    userId: `user_${userId}`, // 添加前缀以区分 Monitor 的 userId
    createdAt: new Date().toISOString(),
    metadata: {
      usOnlyUserId: userId,
      username: username,
      eventType: 'user_login',
    },
  };

  // 如果提供了客户端 IP，添加到 payload 中
  if (ipAddress) {
    payload.ipAddress = ipAddress;
  }

  queueEvent(payload); // queueEvent 已经自动调用 flushEvents()
}

/**
 * 追踪页面浏览事件
 * @param customData - 可选的自定义数据
 */
export function trackPageview(customData?: any) {
  const payload: any = {
    eventType: 'pageview',
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    pageTitle: typeof document !== 'undefined' ? document.title : '',
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
    userId: getOrCreateUserId(),
    createdAt: new Date().toISOString(),
  };

  if (customData) {
    payload.metadata = customData;
  }

  queueEvent(payload);
}

/**
 * 追踪自定义事件
 * @param eventName - 事件名称
 * @param eventData - 事件数据
 */
export function trackEvent(eventName: string, eventData?: any) {
  const payload: any = {
    eventType: 'custom',
    eventName: eventName,
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
    userId: getOrCreateUserId(),
    createdAt: new Date().toISOString(),
    metadata: eventData || {},
  };

  queueEvent(payload);
}

/**
 * 队列事件 - 实时发送模式
 * 每个事件都会立即发送
 */
function queueEvent(payload: any) {
  eventQueue.push(payload);
  flushEvents(); // 实时发送：每次事件都立即发送
}

/**
 * 刷新事件队列
 */
async function flushEvents() {
  if (isFlushing || eventQueue.length === 0) {
    return;
  }

  isFlushing = true;
  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    await sendEvents(eventsToSend);
  } catch (error) {
    console.error('[Monitor] Flush failed:', error);
    // 重试失败后将事件重新加入队列
    eventQueue = [...eventsToSend, ...eventQueue];
  } finally {
    isFlushing = false;
    // 检查是否有新事件到达，如果有，继续发送
    if (eventQueue.length > 0) {
      flushEvents();
    }
  }
}

/**
 * 发送事件到服务器端转发 API（带重试机制）
 */
async function sendEvents(events: any[], retryCount = 0) {
  const maxRetries = 3;

  try {
    // 发送到本地 API route，由服务器端转发到 Monitor
    // 使用绝对 URL 以支持服务器端调用
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const url = `${baseUrl}/api/monitor`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(events),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Network response was not ok: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Monitor] Send error:', error);

    // 重试机制（指数退避）
    if (retryCount < maxRetries) {
      const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendEvents(events, retryCount + 1);
    } else {
      throw error;
    }
  }
}

/**
 * 获取或创建用户 ID
 */
function getOrCreateUserId(): string {
  if (typeof window !== 'undefined') {
    const storage = window.localStorage;
    let userId = storage.getItem('monitor_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substring(2, 15);
      storage.setItem('monitor_user_id', userId);
    }
    return userId;
  }
  return 'anonymous';
}

/**
 * 设置已登录用户的 ID（用于关联登录后的页面访问事件）
 * @param userId - 用户 ID（数据库中的 UUID）
 */
export function setLoggedInUserId(userId: string): void {
  if (typeof window !== 'undefined') {
    const storage = window.localStorage;
    const prefixedUserId = `user_${userId}`;
    storage.setItem('monitor_user_id', prefixedUserId);
  }
}

/**
 * 清除用户 ID（用于登出）
 */
export function clearUserId(): void {
  if (typeof window !== 'undefined') {
    const storage = window.localStorage;
    storage.removeItem('monitor_user_id');
  }
}

/**
 * 手动刷新
 */
export function flush() {
  flushEvents();
}

/**
 * 销毁（实时发送模式不需要清理定时器）
 */
export function destroy() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', flushEvents);
    window.removeEventListener('pagehide', flushEvents);
  }
  eventQueue = [];
  isInitialized = false;
}
