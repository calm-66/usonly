/**
 * 独立的 Vercel Webhook 监听服务器
 * 
 * 这个服务器用于接收 Vercel 的 webhook 通知并发送 Windows 系统通知
 * 使用 Express 轻量级服务器，独立于 Next.js 运行
 * 
 * 启动方式：npx ts-node src/lib/webhook-server.ts
 * 或：node dist/webhook-server.js (编译后)
 */

import http from 'http';
import { parseVercelWebhook } from './vercel-webhook';
import { parseGitHubWebhook } from './github-webhook';
import { sendBuildNotification } from './notification';

const PORT = process.env.WEBHOOK_PORT || '3001';
const HOST = 'localhost';

/**
 * 处理 GitHub webhook
 */
const handleGitHubWebhook = (body: string, res: http.ServerResponse) => {
  try {
    const payload = JSON.parse(body);
    const parsedData = parseGitHubWebhook(payload);

    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-');

    console.log('\n========================================');
    console.log('🐙 GitHub Deployment Notification');
    console.log('========================================');
    console.log(`时间：${timestamp}`);
    console.log(`状态：${parsedData.status}`);
    console.log(`项目：${parsedData.projectName}`);
    console.log(`分支：${parsedData.branch}`);
    console.log(`提交：${parsedData.commitSha}`);
    if (parsedData.deploymentUrl) {
      console.log(`部署 URL: ${parsedData.deploymentUrl}`);
    }
    console.log('========================================\n');

    sendBuildNotification(parsedData);
    console.log('✅ 通知已发送');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      received: parsedData.status,
      deploymentId: parsedData.deploymentId
    }));

  } catch (error) {
    console.error('❌ 处理 GitHub webhook 失败:', error);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid payload' }));
  }
};

/**
 * 处理 HTTP 请求
 */
const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
  // 处理 Vercel webhook
  if (req.method === 'POST' && req.url === '/api/webhook/vercel') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        // 解析 webhook payload
        const payload = JSON.parse(body);
        const parsedData = parseVercelWebhook(payload);

        const timestamp = new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).replace(/\//g, '-');

        console.log('\n========================================');
        console.log('🔔 Vercel Webhook Received');
        console.log('========================================');
        console.log(`时间：${timestamp}`);
        console.log(`事件类型：${payload.eventType}`);
        console.log(`状态：${parsedData.status}`);
        console.log(`项目：${parsedData.projectName}`);
        console.log(`部署 ID: ${parsedData.deploymentId}`);
        if (parsedData.deploymentUrl) {
          console.log(`预览 URL: ${parsedData.deploymentUrl}`);
        }
        if (parsedData.errorMessage) {
          console.log(`错误信息：${parsedData.errorMessage}`);
        }
        console.log('========================================\n');

        // 发送 Windows 系统通知
        sendBuildNotification(parsedData);
        console.log('✅ 通知已发送');

        // 返回成功响应
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          received: parsedData.status,
          deploymentId: parsedData.deploymentId
        }));

      } catch (error) {
        console.error('❌ 处理 webhook 失败:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });

    req.on('error', (error) => {
      console.error('请求错误:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal error' }));
    });

  }
  // 处理 GitHub webhook
  else if (req.method === 'POST' && req.url === '/api/webhook/github') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => handleGitHubWebhook(body, res));
    req.on('error', (error) => {
      console.error('GitHub webhook 请求错误:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal error' }));
    });
  }
  // 健康检查端点
  else if (req.method === 'GET' && req.url === '/api/webhook/health') {
    // 健康检查端点
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Vercel Webhook Listener',
      timestamp: new Date().toISOString(),
      port: PORT
    }));

  } else {
    // 404 未找到
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
};

/**
 * 创建并启动服务器
 */
const server = http.createServer(requestHandler);

server.listen(parseInt(PORT as string), HOST, () => {
  console.log('\n========================================');
  console.log('🚀 Vercel Webhook 监听服务器已启动');
  console.log('========================================');
  console.log(`本地地址：http://${HOST}:${PORT}`);
  console.log(`健康检查：http://${HOST}:${PORT}/api/webhook/health`);
  console.log(`Vercel Webhook 端点：http://${HOST}:${PORT}/api/webhook/vercel`);
  console.log(`GitHub Webhook 端点：http://${HOST}:${PORT}/api/webhook/github`);
  console.log('\n💡 提示：');
  console.log('1. 使用 ngrok 暴露此服务到公网');
  console.log('2. 在 Vercel 中配置 ngrok URL 作为 webhook 地址');
  console.log('3. 按 Ctrl+C 停止服务器');
  console.log('========================================\n');
});

server.on('error', (error) => {
  console.error('服务器错误:', error);
  process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});