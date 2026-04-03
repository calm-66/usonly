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
    
    // 调试日志：打印原始请求
    console.log('[DEBUG] === 收到 GitHub webhook 请求 ===');
    console.log('[DEBUG] 原始 body:', JSON.stringify(body, null, 2));
    console.log('[DEBUG] deployment.ref:', body.deployment?.ref);
    
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

    // 调试日志：打印解析后的数据
    console.log('[DEBUG] 解析后的数据:', {
      status: parsedData.status,
      branch: parsedData.branch,
      commitSha: parsedData.commitSha,
      projectName: parsedData.projectName
    });

    // 打印日志
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

    // 发送 Windows 系统通知
    sendBuildNotification(parsedData);
    console.log('✅ 通知已发送');

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