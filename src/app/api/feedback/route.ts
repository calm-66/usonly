import { NextRequest, NextResponse } from 'next/server'
import { getMonitorConfig, buildMonitorApiUrl, getMonitorHeaders, getVercelEnv } from '@/lib/monitorConfig'
import { getClientIP } from '@/lib/clientIp'

/**
 * 反馈 API - 接收用户反馈并发送到 Monitor 进行存储和展示
 */
export async function POST(request: NextRequest) {
  const logPrefix = '[API /feedback]'
  
  try {
    const body = await request.json()
    const { type, content, userEmail, userId, timestamp, userAgent } = body
    
    // 获取客户端真实 IP
    const clientIP = getClientIP(request)
    

    // 验证必填字段
    if (!type || !content) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 获取当前环境
    const currentEnv = getVercelEnv()

    // 获取 Monitor 配置
    const config = getMonitorConfig()
    
    // 验证配置是否存在
    if (!config.endpoint || !config.apiKey || !config.projectId) {
      return NextResponse.json(
        { error: '服务器配置错误，请联系管理员' },
        { status: 500 }
      )
    }

    // 构建反馈数据
    const feedbackEvent = {
      eventType: 'feedback',
      eventName: 'user_feedback',
      userId: userId || 'anonymous',
      ipAddress: clientIP,
      metadata: {
        type,
        content,
        userEmail: userEmail || undefined,
        timestamp: timestamp || new Date().toISOString(),
        userAgent,
      },
    }
    
    // 构建完整的请求 URL 和 headers
    const targetUrl = buildMonitorApiUrl('/api/events')
    const headers = getMonitorHeaders()

    // 发送到 Monitor
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify([feedbackEvent]),
    })


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: '反馈发送失败，请稍后重试', details: errorData },
        { status: response.status || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '反馈已提交',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || '发送失败，请稍后重试' },
      { status: 500 }
    )
  }
}

// 添加 GET 方法用于测试
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Feedback API is running',
    timestamp: new Date().toISOString(),
  })
}
