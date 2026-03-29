import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 确认解除配对（立即解除，不等待冷静期到期）
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        partnerId: true,
        breakupInitiated: true,
        breakupAt: true,
      },
    });

    if (!user || !user.partnerId) {
      return NextResponse.json({ error: '没有配对关系' }, { status: 400 });
    }

    if (!user.breakupInitiated || !user.breakupAt) {
      return NextResponse.json({ error: '当前不在冷静期' }, { status: 400 });
    }

    const partnerId = user.partnerId;

    // 获取双方所有未归档的帖子 ID（用于删除评论）
    const userPosts = await prisma.post.findMany({
      where: {
        userId: userId,
        archivedAt: null,
      },
      select: { id: true },
    });
    const partnerPosts = await prisma.post.findMany({
      where: {
        userId: partnerId,
        archivedAt: null,
      },
      select: { id: true },
    });
    const allPostIds = [...userPosts.map(p => p.id), ...partnerPosts.map(p => p.id)];

    // 执行解除配对操作（事务）
    await prisma.$transaction([
      // 1. 清空双方的 partnerId
      prisma.user.update({
        where: { id: userId },
        data: {
          partnerId: null,
          breakupInitiated: false,
          breakupAt: null,
          archivedPartnerId: partnerId,
          archivedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: partnerId },
        data: {
          partnerId: null,
          breakupInitiated: false,
          breakupAt: null,
          archivedPartnerId: userId,
          archivedAt: new Date(),
        },
      }),
      // 2. 归档双方的所有分享
      prisma.post.updateMany({
        where: {
          userId: userId,
          archivedAt: null,
        },
        data: {
          archivedAt: new Date(),
          archivedBy: userId,
        },
      }),
      prisma.post.updateMany({
        where: {
          userId: partnerId,
          archivedAt: null,
        },
        data: {
          archivedAt: new Date(),
          archivedBy: userId,
        },
      }),
      // 3. 删除双方的所有评论（包括顶级评论和回复）
      prisma.comment.deleteMany({
        where: {
          userId: { in: [userId, partnerId] },
        },
      }),
    ]);

    // 3. 给对方发送通知
    await prisma.notification.create({
      data: {
        receiverId: partnerId,
        senderId: userId,
        type: 'breakup_confirmed',
        content: '你的伴侣确认了解除配对，你们的关系已结束',
      },
    });

    return NextResponse.json({
      success: true,
      message: '已确认解除配对关系',
    });
  } catch (error) {
    console.error('确认解除配对失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}