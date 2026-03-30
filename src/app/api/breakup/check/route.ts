import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 检查并处理冷静期到期的用户
// 这个 API 应该被定时调用（如每天凌晨）
export async function GET() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 查找所有冷静期到期的用户
    const expiredUsers = await prisma.user.findMany({
      where: {
        breakupInitiated: true,
        breakupAt: {
          lte: sevenDaysAgo,
        },
        partnerId: {
          not: null,
        },
      },
      select: {
        id: true,
        partnerId: true,
        pairedAt: true,
      },
    });

    let processedCount = 0;

    for (const user of expiredUsers) {
      if (!user.partnerId) continue;

      const partnerId = user.partnerId;

      try {
        // 获取伴侣的 pairedAt
        const partner = await prisma.user.findUnique({
          where: { id: partnerId },
          select: { pairedAt: true },
        });

        // 执行解除配对操作（事务）
        await prisma.$transaction([
          // 1. 清空双方的 partnerId 和冷静期状态
          prisma.user.update({
            where: { id: user.id },
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
              archivedPartnerId: user.id,
              archivedAt: now,
            },
          }),
          // 2. 归档配对期间的分享（根据 pairedAt 和 archivedAt 时间范围）
          ...(user.pairedAt ? [
            prisma.post.updateMany({
              where: {
                userId: user.id,
                archivedAt: null,
                createdAt: {
                  gte: user.pairedAt,
                  lte: now,
                },
              },
              data: {
                archivedAt: now,
                archivedBy: user.id,
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
                archivedBy: user.id,
              },
            }),
          ] : []),
        ]);

        // 3. 给对方发送通知
        await prisma.notification.create({
          data: {
            receiverId: partnerId,
            senderId: user.id,
            type: 'breakup_auto_confirmed',
            content: '冷静期已结束，你们的配对关系已自动解除',
          },
        });

        processedCount++;
      } catch (error) {
        console.error(`处理用户 ${user.id} 的冷静期到期失败:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `已处理 ${processedCount} 个冷静期到期的用户`,
      processedCount,
      totalFound: expiredUsers.length,
    });
  } catch (error) {
    console.error('检查冷静期到期失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}