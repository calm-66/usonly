import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 永久删除归档数据
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId');

    if (!partnerId) {
      return NextResponse.json({ error: '缺少伴侣 ID' }, { status: 400 });
    }

    // 验证归档关系存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { archivedPartnerId: true },
    });

    if (!user || user.archivedPartnerId !== partnerId) {
      return NextResponse.json({ error: '归档关系不存在' }, { status: 400 });
    }

    // 删除归档的分享
    await prisma.post.deleteMany({
      where: {
        OR: [
          { userId, archivedBy: partnerId },
          { userId: partnerId, archivedBy: userId },
        ],
      },
    });

    // 清空归档记录
    await prisma.user.update({
      where: { id: userId },
      data: {
        archivedPartnerId: null,
        archivedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: '已永久删除归档数据',
    });
  } catch (error) {
    console.error('删除归档数据失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}