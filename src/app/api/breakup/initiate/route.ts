import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 发起取消配对（进入冷静期）
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { partnerId } = body;

    if (!partnerId) {
      return NextResponse.json({ error: '缺少伴侣 ID' }, { status: 400 });
    }

    // 验证用户确实与该用户配对
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true },
    });

    if (!user || user.partnerId !== partnerId) {
      return NextResponse.json({ error: '配对关系不存在' }, { status: 400 });
    }

    // 设置冷静期状态
    const breakupAt = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: {
        breakupInitiated: true,
        breakupAt,
      },
    });

    // 给对方发送通知
    await prisma.notification.create({
      data: {
        receiverId: partnerId,
        senderId: userId,
        type: 'breakup_initiated',
        content: '你的伴侣发起了取消配对，有 7 天冷静期',
      },
    });

    return NextResponse.json({
      success: true,
      message: '已进入冷静期，7 天后将解除配对关系',
      breakupAt,
    });
  } catch (error) {
    console.error('发起取消配对失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}