import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取用户信息
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        partnerId: true,
        breakupInitiated: true,
        breakupAt: true,
        archivedPartnerId: true,
        partner: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            breakupInitiated: true,
            breakupAt: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    )
  }
}

// 更新用户信息（头像、用户名等）
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const { avatarUrl, username } = body

    console.log('[PUT /api/auth/me] 收到请求:', { userId, avatarUrl, username })

    if (!userId) {
      console.error('[PUT /api/auth/me] 缺少用户 ID')
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 验证用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      console.error('[PUT /api/auth/me] 用户不存在:', userId)
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 构建更新数据对象
    const updateData: any = {}
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl === null ? null : avatarUrl
    }
    if (username !== undefined) {
      // 验证用户名格式
      if (username.trim().length === 0) {
        return NextResponse.json(
          { error: '用户名不能为空' },
          { status: 400 }
        )
      }
      // 检查用户名是否已被其他用户使用
      const existingUsername = await prisma.user.findUnique({
        where: { username: username.trim() },
      })
      if (existingUsername && existingUsername.id !== userId) {
        return NextResponse.json(
          { error: '该用户名已被使用' },
          { status: 400 }
        )
      }
      updateData.username = username.trim()
    }

    // 更新用户信息
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
      },
    })

    console.log('[PUT /api/auth/me] 更新成功:', user.id)
    return NextResponse.json({
      message: '更新成功',
      user,
    })
  } catch (error: any) {
    console.error('[PUT /api/auth/me] 更新用户信息错误:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
    })
    return NextResponse.json(
      { error: error?.message || '更新失败' },
      { status: 500 }
    )
  }
}
