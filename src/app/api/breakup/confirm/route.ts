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
        pairedAt: true,
      },
    });

    if (!user || !user.partnerId) {
      return NextResponse.json({ error: '没有配对关系' }, { status: 400 });
    }

    if (!user.breakupInitiated || !user.breakupAt) {
      return NextResponse.json({ error: '当前不在冷静期' }, { status: 400 });
    }

    const partnerId = user.partnerId;
    const now = new Date();

    // 获取伴侣的 pairedAt（双方的 pairedAt 应该相同）
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { pairedAt: true },
    });

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
          archivedAt: now,
        },
      }),
      prisma.user.update({
        where: { id: partnerId },
        data: {
          partnerId: null,
          breakupInitiated: false,
          breakupAt: null,
          archivedPartnerId: userId,
          archivedAt: now,
        },
      }),
      // 2. 归档配对期间的分享（根据 pairedAt 和 archivedAt 时间范围）
      ...(user.pairedAt ? [
        prisma.post.updateMany({
          where: {
            userId: userId,
            archivedAt: null,
            createdAt: {
              gte: user.pairedAt,
              lte: now,
            },
          },
          data: {
            archivedAt: now,
            archivedBy: userId,
          },
        }),
      ] : []),
      ...(partner?.pairedAt ? [
        prisma.post.updateMany({
          where: {
            userId: partnerId,
            archivedAt: null,
            createdAt: {
              gte: partner.pairedAt,
              lte: now,
            },
          },
          data: {
            archivedAt: now,
            archivedBy: userId,
          },
        }),
      ] : []),
      // 注意：保留评论，不删除
    ]);

    // 3. 给对方发送通知
    await prisma.notification.create({
      data: {
        receiverId: partnerId,
        senderId: userId,
        type: 'breakup_confirmed',
        content: '确认了解除配对，你们的关系已结束',
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