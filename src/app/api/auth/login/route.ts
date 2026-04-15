import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSessionToken } from '@/lib/auth'
import { trackLogin } from '@/lib/monitor'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        password: true,
        partnerId: true,
        partner: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 验证密码（注意：实际项目中应该使用 bcrypt 等加密验证）
    if (user.password !== password) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // 上报登录事件到 Monitor（用于 Active Users 统计）
    trackLogin(user.id, user.username)

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user
    
    // 生成 session token
    const { token, expiresAt } = await createSessionToken(user.id)
    
    return NextResponse.json({
      message: '登录成功',
      user: userWithoutPassword,
      token,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}