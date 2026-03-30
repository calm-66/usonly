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
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 如果是获取伴侣的分享
    const targetUserId = partnerId || userId

    // 过滤掉已归档的帖子（配对期间的帖子在解除配对后会被归档）
    const posts = await prisma.post.findMany({
      where: {
        userId: targetUserId,
        archivedAt: null, // 只显示未归档的帖子
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// 创建分享
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const { date, title, imageUrl, text, isLatePost } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true },
    })

    const post = await prisma.post.create({
      data: {
        userId,
        date,
        title: title || null,
        imageUrl,
        text,
        isLatePost: isLatePost || false,
      },
    })

    // 如果有配对对象，创建通知
    if (user?.partnerId) {
      await prisma.notification.create({
        data: {
          receiverId: user.partnerId,
          senderId: userId,
          type: 'new_post',
          content: '发布了新的分享',
          postId: post.id,
        },
      })
    }

    return NextResponse.json({
      message: 'Post created successfully',
      post,
    })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
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
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // 查找分享
    const post = await prisma.post.findUnique({
      where: { id },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 检查是否是今日的分享（只有今日的分享可以删除）
    const today = new Date().toISOString().split('T')[0]
    if (post.date !== today) {
      return NextResponse.json(
        { error: 'Can only delete today\'s post' },
        { status: 400 }
      )
    }

    await prisma.post.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Post deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}
