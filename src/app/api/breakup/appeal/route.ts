import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 发起挽回配对请求（被取消方向发起方请求挽回）
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

    // 检查是否对方发起了取消配对（即对方是 breakupInitiated 方）
    const partner = await prisma.user.findUnique({
      where: { id: user.partnerId },
      select: {
        breakupInitiated: true,
        breakupAt: true,
      },
    });

    if (!partner?.breakupInitiated) {
      return NextResponse.json({ error: '对方没有发起取消配对，无法挽回' }, { status: 400 });
    }

    // 创建挽回请求通知
    await prisma.notification.create({
      data: {
        receiverId: user.partnerId,
        senderId: userId,
        type: 'breakup_appeal',
        content: '请求挽回配对关系',
      },
    });

    return NextResponse.json({
      success: true,
      message: '已发送挽回请求，等待对方确认',
    });
  } catch (error) {
    console.error('发起挽回配对失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}