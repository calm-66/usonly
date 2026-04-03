import notifier from 'node-notifier';
import path from 'path';

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
 * Vercel Webhook 解析后的数据结构
 */
interface VercelWebhookData {
  status: 'created' | 'succeeded' | 'failed';
  projectName: string;
  deploymentId: string;
  deploymentUrl?: string;
  commitRef?: string;
  errorMessage?: string;
  errorCode?: string;
  source?: 'vercel';
}

/**
 * GitHub Webhook 解析后的数据结构
 */
interface GitHubWebhookData {
  status: 'success' | 'failure' | 'pending';
  projectName: string;
  deploymentId: string;
  deploymentUrl?: string;
  commitSha?: string;
  branch?: string;
  errorMessage?: string;
  source: 'vercel' | 'github';
}

/**
 * 通用通知数据类型
 */
export type NotificationData = VercelWebhookData | GitHubWebhookData;

/**
 * 发送 Windows 系统通知
 * @param config 通知配置
 */
export function sendNotification(config: NotificationConfig): void {
  notifier.notify({
    title: config.title,
    message: config.message,
    icon: config.icon,
    sound: config.sound ?? true,
    timeout: config.timeout ?? 10,
    // Windows 特定选项
    wait: false,
    priority: 0,
  });
}

/**
 * 根据 Build 状态发送通知（支持 Vercel 和 GitHub）
 * @param data 解析后的 webhook 数据
 */
export function sendBuildNotification(data: NotificationData): void {
  const config: NotificationConfig = {
    sound: true,
    timeout: data.status === 'failed' ? 30 : 10, // 失败时显示更久
  };

  // 根据来源显示不同的图标前缀
  const sourceIcon = data.source === 'github' ? '🐙' : '🔔';
  
  switch (data.status) {
    case 'succeeded':
    case 'success':
      config.title = `${sourceIcon} UsOnly Build 成功`;
      config.message = `项目：${data.projectName}\n预览：${data.deploymentUrl}`;
      break;

    case 'failed':
    case 'failure':
      config.title = `${sourceIcon} UsOnly Build 失败`;
      // 失败时显示详细错误信息，截断过长的内容
      const errorMsg = data.errorMessage 
        ? truncateString(data.errorMessage, 500)
        : '未知错误';
      config.message = `项目：${data.projectName}\n错误：${errorMsg}`;
      break;

    case 'created':
    case 'pending':
      config.title = `${sourceIcon} UsOnly Build 开始`;
      const branchInfo = data.source === 'github' 
        ? data.branch 
        : data.commitRef;
      config.message = `项目：${data.projectName}\n分支：${branchInfo || 'main'}`;
      config.sound = false; // 开始构建时不播放声音
      config.timeout = 5;
      break;
  }

  sendNotification(config);
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