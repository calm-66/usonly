import { NextRequest, NextResponse } from 'next/server'
import { validateSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { trackLogin } from '@/lib/monitor'

/**
 * 验证 session token 并返回用户信息
 * 客户端在 localStorage 中存储 token，每次需要验证时调用此 API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: '缺少 token' },
        { status: 400 }
      )
    }

    const result = await validateSessionToken(token)

    if (!result.valid) {
      return NextResponse.json(
        { error: 'Token 无效或已过期' },
        { status: 401 }
      )
    }

    // 更新最后登录时间（用于 Monitor 统计活跃用户）
    await prisma.user.update({
      where: { id: result.user.id },
      data: { lastLoginAt: new Date() }
    })

    // 获取客户端 IP 并上报登录事件到 Monitor（用于 Active Users 统计）
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')?.[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     undefined;
    trackLogin(result.user.id, result.user.username, clientIP)

    return NextResponse.json({
      user: result.user,
    })
  } catch (error) {
    console.error('验证 session 失败:', error)
    return NextResponse.json(
      { error: '验证失败，请稍后重试' },
      { status: 500 }
    )
  }
}