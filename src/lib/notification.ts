// 动态导入 node-notifier（仅用于 Windows 本地通知）
// 使用 require 避免 TypeScript 类型检查问题
const notifier = require('node-notifier');

/**
 * 通知配置接口
 */
interface NotificationConfig {
  title: string;               // 通知标题
  message: string;             // 通知内容
  icon?: string;               // 图标路径（可选）
  sound?: boolean;             // 是否播放声音
  timeout?: number;            // 超时时间（秒）
}

/**
 * GitHub Webhook 解析后的数据结构
 */
export interface GitHubWebhookData {
  status: 'success' | 'failure' | 'pending';
  projectName: string;
  deploymentId: string;
  deploymentUrl?: string;
  commitSha?: string;
  branch?: string;
  errorMessage?: string;
  source: 'github';
}

/**
 * 发送 Windows 系统通知
 * @param config 通知配置
 */
export function sendNotification(config: NotificationConfig): void {
  const cp = require('child_process');
  const path = require('path');
  const os = require('os');
  
  // 使用项目根目录（process.cwd()）来计算 SnoreToast 路径
  const is64Bit = os.arch() === 'x64';
  const snoreToastPath = path.join(
    process.cwd(),
    'node_modules/node-notifier/vendor/snoreToast',
    'snoretoast-' + (is64Bit ? 'x64' : 'x86') + '.exe'
  );
  
  const args: string[] = [];
  args.push('-t', config.title);
  args.push('-m', config.message);
  
  if (config.sound !== false) {
    args.push('-s', 'Notification.Default');
  }
  
  // 使用 execFile 异步执行，不记录日志
  // SnoreToast 返回码说明：
  // 0 = Success, 1 = Hidden, 2 = Dismissed, 3 = TimedOut (都是正常状态)
  // 只有 -1 = Failed 才是真正的错误
  cp.execFile(snoreToastPath, args, (err: Error | null) => {
    // 只有 code === -1 才是真正的错误，其他情况（包括 code 3 超时）都是正常的
    if (err && (err as any).code === -1) {
      console.error('SnoreToast 执行失败:', err);
    }
    // 其他返回码（0/1/2/3/4/5）都是正常状态，不记录日志
  });
}

/**
 * 根据 Build 状态发送通知
 * @param data GitHub webhook 解析后的数据
 */
export function sendBuildNotification(data: GitHubWebhookData): void {
  let config: NotificationConfig;

  // 根据来源显示不同的图标前缀
  const sourceIcon = '🐙';
  
  switch (data.status) {
    case 'success':
      config = {
        title: `${sourceIcon} UsOnly Build 成功`,
        message: `项目：${data.projectName}\n预览：${data.deploymentUrl}`,
        sound: true,
        timeout: 10
      };
      break;

    case 'failure':
      // 失败时显示详细错误信息，截断过长的内容
      const errorMsg = data.errorMessage 
        ? truncateString(data.errorMessage, 500)
        : '未知错误';
      config = {
        title: `${sourceIcon} UsOnly Build 失败`,
        message: `项目：${data.projectName}\n错误：${errorMsg}`,
        sound: true,
        timeout: 30
      };
      break;

    case 'pending':
      config = {
        title: `${sourceIcon} UsOnly Build 开始`,
        message: `项目：${data.projectName}\n分支：${data.branch || 'main'}`,
        sound: false, // 开始构建时不播放声音
        timeout: 5
      };
      break;
      
    default:
      config = {
        title: `${sourceIcon} UsOnly Build`,
        message: `项目：${data.projectName}`,
        sound: true,
        timeout: 10
      };
  }

  sendNotification(config);
}

/**
 * 用户注册通知数据接口
 */
export interface UserRegisteredNotificationData {
  type: 'user_registered';        // 固定标识
  username: string;                // 新注册用户名
  email: string;                   // 新注册邮箱
  registeredAt: string;            // ISO 时间戳
  source: 'vercel';                // 来源标识
}

/**
 * 用户注册通知配置接口
 */
interface UserRegisteredNotificationConfig {
  title: string;                   // 通知标题（如："👤 UsOnly 新用户注册"）
  message: string;                 // 通知内容（用户名、邮箱、时间）
  sound?: boolean;                 // 是否播放声音
  timeout?: number;                // 超时时间（秒）
}

/**
 * 发送用户注册的 Windows 本地通知
 * @param data 用户注册通知数据
 */
export function sendUserRegisteredNotification(data: UserRegisteredNotificationData): void {
  console.log('[通知] 开始发送用户注册通知')
  console.log('[通知] 通知数据:', JSON.stringify(data, null, 2))
  
  // 格式化注册时间
  const registeredDate = new Date(data.registeredAt);
  const formattedTime = registeredDate.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const config: UserRegisteredNotificationConfig = {
    title: '👤 UsOnly 新用户注册',
    message: `用户名：${data.username}\n邮箱：${data.email}\n时间：${formattedTime}`,
    sound: true,
    timeout: 15
  };

  console.log('[通知] 通知配置:', { title: config.title, message: config.message })
  console.log('[通知] 调用 sendNotification 发送通知')
  
  sendNotification(config);
  
  console.log('[通知] 通知发送完成')
}

/**
 * 截断字符串到指定长度
 * @param str 原字符串
 * @param maxLength 最大长度
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...（查看更多请查看 Vercel 控制台）';
}
