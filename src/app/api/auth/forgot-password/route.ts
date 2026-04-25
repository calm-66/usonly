import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 忘记密码 - 发送重置链接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: '请输入邮箱地址' },
        { status: 400 }
      )
    }

    // 检查邮箱是否存在
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: '该邮箱未注册' },
        { status: 404 }
      )
    }

    // TODO: 实现邮件发送功能
    // 当前返回成功，实际项目中需要集成邮件服务（如SendGrid、Resend等）
    console.log('密码重置请求 - 邮箱:', email)
    console.log('注意：当前未集成邮件服务，需要后续实现')

    return NextResponse.json({
      success: true,
      message: '如果邮箱已注册，我们会发送重置链接'
    })
  } catch (error) {
    console.error('忘记密码处理失败:', error)
    return NextResponse.json(
      { error: '操作失败，请稍后重试' },
      { status: 500 }
    )
  }
}