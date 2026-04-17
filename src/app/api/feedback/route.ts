import { NextRequest, NextResponse } from 'next/server'
import { getMonitorConfig, buildMonitorApiUrl, getMonitorHeaders, getVercelEnv } from '@/lib/monitorConfig'

/**
 * 反馈 API - 接收用户反馈并发送到 Monitor 进行存储和展示
 */
export async function POST(request: NextRequest) {
  const logPrefix = '[API /feedback]'
  
  try {
    console.log(`${logPrefix} === 收到反馈请求 ===`)
    
    const body = await request.json()
    const { type, content, userId, timestamp, userAgent } = body
    
    console.log(`${logPrefix} 请求体:`, {
      type,
      content: content?.slice(0, 50) + (content?.length > 50 ? '...' : ''),
      userId,
      timestamp,
    })

    // 验证必填字段
    if (!type || !content) {
      console.warn(`${logPrefix} 缺少必填字段:`, { type, hasContent: !!content })
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 获取当前环境
    const currentEnv = getVercelEnv()
    console.log(`${logPrefix} 当前环境:`, currentEnv)

    // 获取 Monitor 配置
    const config = getMonitorConfig()
    
    console.log(`${logPrefix} Monitor 配置:`, {
      endpoint: config.endpoint ? `${config.endpoint.slice(0, 20)}...` : 'MISSING',
      hasApiKey: !!config.apiKey,
      hasProjectId: !!config.projectId,
    })
    
    // 验证配置是否存在
    if (!config.endpoint || !config.apiKey || !config.projectId) {
      console.error(`${logPrefix} Monitor 配置不完整:`, {
        hasEndpoint: !!config.endpoint,
        hasApiKey: !!config.apiKey,
        hasProjectId: !!config.projectId,
      })
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
      metadata: {
        type,
        content,
        timestamp: timestamp || new Date().toISOString(),
        userAgent,
      },
    }
    
    // 构建完整的请求 URL 和 headers
    const targetUrl = buildMonitorApiUrl('/api/events')
    const headers = getMonitorHeaders()
    
    console.log(`${logPrefix} 发送到 Monitor:`, {
      url: targetUrl,
      headers: {
        'X-API-Key': headers['X-API-Key'] ? '***' + headers['X-API-Key'].slice(-8) : 'MISSING',
        'X-Project-ID': headers['X-Project-ID'] ? '***' + headers['X-Project-ID'].slice(-8) : 'MISSING',
        'Content-Type': headers['Content-Type'],
      },
      event: JSON.stringify(feedbackEvent),
    })

    // 发送到 Monitor
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify([feedbackEvent]),
    })

    console.log(`${logPrefix} Monitor 响应:`, {
      status: response.status,
      statusText: response.statusText,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`${logPrefix} 发送到 Monitor 失败:`, errorData)
      return NextResponse.json(
        { error: '反馈发送失败，请稍后重试', details: errorData },
        { status: response.status || 500 }
      )
    }

    console.log(`${logPrefix} ✓ 反馈已发送到 Monitor:`, { type, userId })

    return NextResponse.json({
      success: true,
      message: '反馈已提交',
    })
  } catch (error: any) {
    console.error(`${logPrefix} 处理反馈失败:`, error)
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
