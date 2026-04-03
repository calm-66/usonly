import { NextRequest, NextResponse } from 'next/server'
import { sendUserRegisteredNotification, UserRegisteredNotificationData } from '@/lib/notification'

/**
 * 用户注册 Webhook 接收端点
 * 
 * 该端点专门用于接收生产环境（Vercel）发送的用户注册通知
 * 通过 ngrok 隧道将请求转发到本地开发服务器
 * 与 Vercel 部署通知系统（/api/webhook/github）保持分离
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Webhook] 收到用户注册通知请求')
    
    const body = await request.json()
    console.log('[Webhook] 请求体:', JSON.stringify(body, null, 2))
    
    const { type, username, email, registeredAt, source } = body as UserRegisteredNotificationData

    // 验证必填字段
    if (!type || type !== 'user_registered') {
      console.error('[Webhook] 验证失败：无效的通知类型', type)
      return NextResponse.json(
        { error: '无效的通知类型' },
        { status: 400 }
      )
    }

    if (!username || !email || !registeredAt) {
      console.error('[Webhook] 验证失败：缺少必填字段', { username, email, registeredAt })
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 发送 Windows 本地通知
    console.log('[Webhook] 开始发送本地通知')
    sendUserRegisteredNotification({
      type: 'user_registered',
      username,
      email,
      registeredAt,
      source: source || 'vercel'
    })

    // 输出日志（独立格式，与部署通知分离）
    console.log('========================================')
    console.log('User Registered Notification')
    console.log('========================================')
    console.log(`时间：${new Date().toISOString()}`)
    console.log(`用户名：${username}`)
    console.log(`邮箱：${email}`)
    console.log(`来源：${source || 'vercel'}`)
    console.log('========================================')

    return NextResponse.json({
      message: '通知已发送'
    })
  } catch (error) {
    console.error('用户注册通知处理错误:', error)
    return NextResponse.json(
      { error: '通知处理失败' },
      { status: 500 }
    )
  }
}