/**
 * Monitor 集成工具 - 用于上报登录等事件到 Monitor 平台
 * 
 * 使用方法：
 * 1. 在页面加载时调用 initMonitor() 初始化
 * 2. 在登录成功时调用 trackLogin(userId, username) 上报登录事件
 */

// Monitor 配置（从环境变量获取）
const MONITOR_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_MONITOR_PROJECT_ID || '',
  apiKey: process.env.NEXT_PUBLIC_MONITOR_API_KEY || '',
  endpoint: process.env.NEXT_PUBLIC_MONITOR_ENDPOINT || '',
};

// 事件队列
let eventQueue: any[] = [];
let isFlushing = false;
let flushTimer: NodeJS.Timeout | null = null;

/**
 * 初始化 Monitor（在客户端调用）
 */
export function initMonitor() {
  if (!MONITOR_CONFIG.projectId || !MONITOR_CONFIG.apiKey) {
    console.log('[Monitor] Not initialized - missing config');
    return;
  }

  // 启动定时刷新
  flushTimer = setInterval(flushEvents, 60000); // 1 分钟刷新

  // 页面卸载时刷新
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushEvents);
    window.addEventListener('pagehide', flushEvents);
  }

  console.log('[Monitor] Initialized', {
    projectId: MONITOR_CONFIG.projectId,
    endpoint: MONITOR_CONFIG.endpoint,
  });
}

/**
 * 追踪登录事件
 * @param userId - 用户 ID
 * @param username - 用户名
 */
export function trackLogin(userId: string, username: string) {
  if (!MONITOR_CONFIG.projectId || !MONITOR_CONFIG.apiKey) {
    console.warn('[Monitor] Not initialized - missing config');
    return;
  }

  console.log('[Monitor] trackLogin called:', { userId, username });

  const payload = {
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

  queueEvent(payload);
  flushEvents(); // 立即发送登录事件
}

/**
 * 队列事件
 */
function queueEvent(payload: any) {
  eventQueue.push(payload);

  // 达到批量大小时立即刷新
  if (eventQueue.length >= 10) {
    flushEvents();
  }
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
  }
}

/**
 * 发送事件（带重试机制）
 */
async function sendEvents(events: any[], retryCount = 0) {
  const maxRetries = 3;

  try {
    const response = await fetch(MONITOR_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MONITOR_CONFIG.apiKey,
        'X-Project-ID': MONITOR_CONFIG.projectId,
      },
      body: JSON.stringify(events),
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Monitor] Events sent successfully:', data);
  } catch (error) {
    console.error('[Monitor] Send error:', error);

    // 重试机制（指数退避）
    if (retryCount < maxRetries) {
      const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s
      console.log(`[Monitor] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendEvents(events, retryCount + 1);
    } else {
      console.error('[Monitor] Max retries reached, events lost');
      throw error;
    }
  }
}

/**
 * 手动刷新
 */
export function flush() {
  flushEvents();
}

/**
 * 销毁（清理定时器）
 */
export function destroy() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', flushEvents);
    window.removeEventListener('pagehide', flushEvents);
  }
  eventQueue = [];
  console.log('[Monitor] Destroyed');
}