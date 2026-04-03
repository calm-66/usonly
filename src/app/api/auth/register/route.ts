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
      
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody)
      })
        .then(res => {
          console.log('[注册通知] Webhook 响应状态:', res.status)
          return res.json()
        })
        .then(data => {
          console.log('[注册通知] Webhook 响应数据:', data)
        })
        .catch(err => {
          console.error('[注册通知] Webhook 发送失败:', err)
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