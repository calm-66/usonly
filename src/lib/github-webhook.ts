/**
 * GitHub Webhook 解析工具
 * 
 * 用于解析 GitHub deployment_status 事件的 payload
 */

/**
 * GitHub Deployment Status Webhook Payload
 */
export interface GitHubDeploymentStatusPayload {
  action: string;
  deployment_status: {
    state: string;
    environment_url: string;
    log_url: string;
    description: string;
    environment?: string;  // Vercel 部署的环境名称（Preview 或 Production）
  };
  deployment: {
    id: string;
    sha: string;
    ref: string;
    environment: string;
  };
  repository: {
    name: string;
    full_name: string;
    html_url: string;
  };
}

/**
 * 标准化的通知数据
 */
export interface NotificationData {
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
 * 解析 GitHub deployment_status webhook payload
 */
export function parseGitHubWebhook(payload: GitHubDeploymentStatusPayload): NotificationData {
  const state = payload.deployment_status.state.toLowerCase();
  
  let status: 'success' | 'failure' | 'pending';
  if (state === 'success' || state === 'succeeded') {
    status = 'success';
  } else if (state === 'failure' || state === 'failed') {
    status = 'failure';
  } else {
    status = 'pending';
  }

  // 优先从 deployment_status.environment 字段推断分支名
  // Preview -> preview, Production -> main
  let branch = 'unknown';
  const env = payload.deployment_status.environment?.toLowerCase() || '';
  if (env.includes('preview')) {
    branch = 'preview';
  } else if (env.includes('production')) {
    branch = 'main';
  } else {
    // 回退：从 deployment.ref 获取
    let refBranch = payload.deployment.ref;
    if (refBranch && refBranch.startsWith('refs/heads/')) {
      refBranch = refBranch.substring('refs/heads/'.length);
    }
    branch = refBranch || 'unknown';
  }

  return {
    status,
    projectName: payload.repository.name,
    deploymentId: payload.deployment.id.toString(),
    deploymentUrl: payload.deployment_status.environment_url,
    commitSha: payload.deployment.sha.substring(0, 7),
    branch: branch,
    source: 'github'
  };
}

/**
 * 验证 GitHub webhook 签名（可选安全增强）
 * 
 * GitHub 使用 HMAC-SHA256 签名，格式：sha256=signature
 */
export function verifyGitHubSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  const crypto = require('crypto');
  
  // 提取签名（去掉 sha256= 前缀）
  const providedSignature = signature.replace('sha256=', '');
  
  // 计算期望的签名
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // 安全比较
  try {
    const buf1 = Buffer.from(providedSignature, 'hex');
    const buf2 = Buffer.from(expectedSignature, 'hex');
    return crypto.timingSafeEqual(buf1, buf2);
  } catch {
    return false;
  }
}