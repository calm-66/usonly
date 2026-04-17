import { NextRequest, NextResponse } from 'next/server'
import { getMonitorConfig, buildMonitorApiUrl, getMonitorHeaders } from '@/lib/monitorConfig'

/**
 * 反馈 API - 接收用户反馈并发送到 Monitor 进行存储和展示
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, content, userId, timestamp, userAgent } = body

    // 验证必填字段
    if (!type || !content) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 获取 Monitor 配置
    const config = getMonitorConfig()
    
    // 验证配置是否存在
    if (!config.endpoint || !config.apiKey || !config.projectId) {
      console.error('Monitor 配置不完整:', {
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

    // 发送到 Monitor
    const response = await fetch(buildMonitorApiUrl('/api/events'), {
      method: 'POST',
      headers: getMonitorHeaders(),
      body: JSON.stringify([feedbackEvent]),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('发送到 Monitor 失败:', errorData)
      return NextResponse.json(
        { error: '反馈发送失败，请稍后重试' },
        { status: response.status || 500 }
      )
    }

    console.log('反馈已发送到 Monitor:', { type, userId })

    return NextResponse.json({
      success: true,
      message: '反馈已提交',
    })
  } catch (error: any) {
    console.error('处理反馈失败:', error)
    return NextResponse.json(
      { error: error?.message || '发送失败，请稍后重试' },
      { status: 500 }
    )
  }
}
