import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取用户的通知列表（自动过滤过期通知，但不标记为已读）
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // 先删除所有过期的通知
    await prisma.notification.deleteMany({
      where: {
        receiverId: userId,
        expiresAt: {
          lt: now,
        },
      },
    });

    // 获取未过期的通知
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId: userId,
        expiresAt: {
          gte: now,
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 获取未读数量（只计算未过期的）
    const unreadCount = await prisma.notification.count({
      where: {
        receiverId: userId,
        isRead: false,
        expiresAt: {
          gte: now,
        },
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// DELETE - 删除单条通知
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification id is required' }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.receiverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}

// PUT - 标记通知为已读
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { markAllAsRead, notificationId } = body;

    const now = new Date();

    if (markAllAsRead) {
      // 标记所有未过期通知为已读
      await prisma.notification.updateMany({
        where: {
          receiverId: userId,
          isRead: false,
          expiresAt: {
            gte: now,
          },
        },
        data: {
          isRead: true,
        },
      });
    } else if (notificationId) {
      // 标记单个通知为已读
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification || notification.receiverId !== userId) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}

// POST - 删除所有通知
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deleteAll } = body;

    if (deleteAll) {
      // 删除该用户的所有通知
      await prisma.notification.deleteMany({
        where: {
          receiverId: userId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
}
