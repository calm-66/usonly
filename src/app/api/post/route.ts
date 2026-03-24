import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取用户的分享
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partnerId')

    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 如果是获取伴侣的分享
    const targetUserId = partnerId || userId

    const posts = await prisma.post.findMany({
      where: {
        userId: targetUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('获取分享失败:', error)
    return NextResponse.json(
      { error: '获取分享失败' },
      { status: 500 }
    )
  }
}

// 创建分享
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const { date, theme, imageUrl, text, isLatePost } = body

    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    if (!date || !theme) {
      return NextResponse.json(
        { error: '日期和主题为必填项' },
        { status: 400 }
      )
    }

    const post = await prisma.post.create({
      data: {
        userId,
        date,
        theme,
        imageUrl,
        text,
        isLatePost: isLatePost || false,
      },
    })

    return NextResponse.json({
      message: '分享成功',
      post,
    })
  } catch (error) {
    console.error('创建分享失败:', error)
    return NextResponse.json(
      { error: '创建分享失败' },
      { status: 500 }
    )
  }
}

// 删除分享
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: '请指定分享 ID' },
        { status: 400 }
      )
    }

    // 查找分享
    const post = await prisma.post.findUnique({
      where: { id },
    })

    if (!post) {
      return NextResponse.json(
        { error: '分享不存在' },
        { status: 404 }
      )
    }

    if (post.userId !== userId) {
      return NextResponse.json(
        { error: '无权删除此分享' },
        { status: 403 }
      )
    }

    // 检查是否是今日的分享（只有今日的分享可以删除）
    const today = new Date().toISOString().split('T')[0]
    if (post.date !== today) {
      return NextResponse.json(
        { error: '只能删除今日的分享' },
        { status: 400 }
      )
    }

    await prisma.post.delete({
      where: { id },
    })

    return NextResponse.json({
      message: '删除成功',
    })
  } catch (error) {
    console.error('删除分享失败:', error)
    return NextResponse.json(
      { error: '删除分享失败' },
      { status: 500 }
    )
  }
}