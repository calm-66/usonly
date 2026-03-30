import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 撤销取消配对（冷静期内恢复关系）
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

    // 检查是否还在冷静期内（7 天）
    const now = new Date();
    const breakupAt = new Date(user.breakupAt);
    const daysDiff = (now.getTime() - breakupAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 7) {
      // 超过 7 天，已经自动解除，无法撤销
      await prisma.user.update({
        where: { id: userId },
        data: {
          breakupInitiated: false,
          breakupAt: null,
        },
      });
      return NextResponse.json({ error: '已超过冷静期，无法撤销' }, { status: 400 });
    }

    // 撤销冷静期状态
    await prisma.user.update({
      where: { id: userId },
      data: {
        breakupInitiated: false,
        breakupAt: null,
      },
    });

    // 给对方发送通知
    await prisma.notification.create({
      data: {
        receiverId: user.partnerId,
        senderId: userId,
        type: 'breakup_cancelled',
        content: '撤销了取消配对请求',
      },
    });

    return NextResponse.json({
      success: true,
      message: '已撤销取消配对请求，关系恢复正常',
    });
  } catch (error) {
    console.error('撤销取消配对失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}