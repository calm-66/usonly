import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    if (!query) {
      return NextResponse.json(
        { error: '请输入搜索内容' },
        { status: 400 }
      )
    }

    // 搜索用户（按用户名）
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
        },
        id: {
          not: userId, // 排除自己
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        partnerId: true,
      },
      take: 10, // 最多返回 10 条结果
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('搜索用户错误:', error)
    return NextResponse.json(
      { error: '搜索失败' },
      { status: 500 }
    )
  }
}