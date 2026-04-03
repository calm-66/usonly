import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password } = body

    // 验证必填字段
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: '用户名、邮箱和密码为必填项' },
        { status: 400 }
      )
    }

    // 检查用户名是否已被使用
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUsername) {
      return NextResponse.json(
        { error: '该用户名已被使用' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已注册
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      )
    }

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        partnerId: true,
      },
    })

    // 发送注册通知（生产环境）
    // 只在 WEBHOOK_URL 配置时发送（本地开发可选）
    console.log('[注册通知] 用户注册成功:', { username, email })
    console.log('[注册通知] WEBHOOK_URL:', process.env.WEBHOOK_URL ? '已配置' : '未配置')
    
    if (process.env.WEBHOOK_URL) {
      const webhookUrl = `${process.env.WEBHOOK_URL}/api/user-registered`
      const webhookBody = {
        type: 'user_registered',
        username,
        email,
        registeredAt: new Date().toISOString(),
        source: 'vercel'
      }
      
      console.log('[注册通知] 发送 Webhook 到:', webhookUrl)
      console.log('[注册通知] Webhook 请求体:', JSON.stringify(webhookBody, null, 2))
      
      // 异步发送 Webhook，不阻塞注册响应
      // 使用 fire-and-forget 模式，添加超时和重试处理
      sendWebhookWithRetry(webhookUrl, webhookBody).catch(err => {
        console.error('[注册通知] Webhook 最终失败:', err)
      })
    }

    return NextResponse.json({
      message: '注册成功',
      user,
    })
  } catch (error) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * 带重试机制的 Webhook 发送函数
 * @param url Webhook 目标 URL
 * @param body 请求体
 * @param maxRetries 最大重试次数（默认 2 次）
 * @param timeout 超时时间（默认 5000ms）
 */
async function sendWebhookWithRetry(
  url: string,
  body: object,
  maxRetries: number = 2,
  timeout: number = 5000
): Promise<void> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`[注册通知] 第 ${attempt} 次尝试发送 Webhook`)
      
      // 使用 AbortController 实现超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[注册通知] Webhook 发送成功 (第 ${attempt} 次尝试)`)
        console.log('[注册通知] Webhook 响应数据:', data)
        return
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error: any) {
      lastError = error
      console.error(`[注册通知] 第 ${attempt} 次尝试失败:`, error.message || error)
      
      // 如果不是最后一次尝试，等待一段时间后重试
      if (attempt <= maxRetries) {
        const delay = 1000 * attempt // 指数退避：1s, 2s
        console.log(`[注册通知] 等待 ${delay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  // 所有重试都失败
  console.error('[注册通知] 所有重试都失败，放弃发送')
  throw lastError
}
