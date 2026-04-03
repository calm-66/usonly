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
 * 截断字符串到指定长度
 * @param str 原字符串
 * @param maxLength 最大长度
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...（查看更多请查看 Vercel 控制台）';
}