/**
 * GitHub Webhook 端点
 * 
 * 用于接收 GitHub deployment_status 事件并发送 Windows 系统通知
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubWebhook } from '@/lib/github-webhook';
import { sendBuildNotification } from '@/lib/notification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedData = parseGitHubWebhook(body);

    // 生成时间戳
    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-');

    // 根据状态显示符号
    const statusSymbol = parsedData.status === 'success' ? '✅' : (parsedData.status === 'failure' ? '❌' : '⏳');
    
    console.log('========================================');
    console.log('GitHub Deployment Notification');
    console.log('========================================');
    console.log(`时间：${timestamp}`);
    console.log(`状态：${statusSymbol} ${parsedData.status}`);
    console.log(`项目：${parsedData.projectName}`);
    console.log(`分支：${parsedData.branch || '(空)'}`);
    // 显示完整的提交信息：SHA + commit message
    const commitInfo = parsedData.commitMessage 
      ? `${parsedData.commitSha} ${parsedData.commitMessage}`
      : parsedData.commitSha;
    console.log(`提交：${commitInfo}`);
    if (parsedData.deploymentUrl) {
      console.log(`部署 URL: ${parsedData.deploymentUrl}`);
    }
    console.log('========================================');

    // 发送 Windows 系统通知
    sendBuildNotification(parsedData);

    return NextResponse.json({
      success: true,
      received: parsedData.status,
      deploymentId: parsedData.deploymentId
    });

  } catch (error) {
    console.error('❌ 处理 GitHub webhook 失败:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
