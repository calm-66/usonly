import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取某分享的评论列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    // 获取所有顶级评论（parentId 为 null）
    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST - 发表评论
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { postId, content, imageUrl, parentId } = body;

    if (!postId || !content) {
      return NextResponse.json({ error: 'postId and content are required' }, { status: 400 });
    }

    // 验证帖子是否存在
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // 创建评论
    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        content,
        imageUrl: imageUrl || null,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // 创建通知逻辑
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 2) // 2 天后过期
    
    if (parentId) {
      // 如果是回复评论，获取父评论的作者并发送通知
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      
      // 如果父评论作者与当前评论者不是同一人，则发送通知
      if (parentComment && parentComment.userId !== userId) {
        await prisma.notification.create({
          data: {
            receiverId: parentComment.userId,
            senderId: userId,
            type: 'comment_reply',
            content: '回复了你的评论',
            postId,
            commentId: comment.id,
            expiresAt,
          },
        });
      }
    } else {
      // 如果是直接评论分享，给分享作者发送通知（如果不是自己评论自己）
      if (post.userId !== userId) {
        await prisma.notification.create({
          data: {
            receiverId: post.userId,
            senderId: userId,
            type: 'comment',
            content: '评论了你的分享',
            postId,
            commentId: comment.id,
            expiresAt,
          },
        });
      }
    }

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}