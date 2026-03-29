import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 处理挽回配对请求（接受或拒绝）
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { accept } = body; // true = 接受挽回，false = 拒绝挽回

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
      return NextResponse.json({ error: '你不是取消配对的发起方' }, { status: 400 });
    }

    const partnerId = user.partnerId;

    if (accept) {
      // 接受挽回：撤销取消配对请求
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            breakupInitiated: false,
            breakupAt: null,
          },
        }),
        // 给对方发送通知
        prisma.notification.create({
          data: {
            receiverId: partnerId,
            senderId: userId,
            type: 'breakup_appeal_accepted',
            content: '你的伴侣接受了挽回请求，你们的关系已恢复',
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: '已接受挽回请求，关系已恢复',
      });
    } else {
      // 拒绝挽回：不做额外操作，继续保持取消状态
      // 给对方发送通知
      await prisma.notification.create({
        data: {
          receiverId: partnerId,
          senderId: userId,
          type: 'breakup_appeal_rejected',
          content: '你的伴侣拒绝了挽回请求',
        },
      });

      return NextResponse.json({
        success: true,
        message: '已拒绝挽回请求',
      });
    }
  } catch (error) {
    console.error('处理挽回配对请求失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}