import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取归档数据
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');
    const partnerId = searchParams.get('partnerId');

    if (!queryUserId || !partnerId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    // 获取归档的用户信息
    const archivedUser = await prisma.user.findUnique({
      where: { id: queryUserId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        archivedAt: true,
      },
    });

    if (!archivedUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 获取归档的分享（按日期倒序）
    const posts = await prisma.post.findMany({
      where: {
        userId: queryUserId,
        archivedAt: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 构建归档信息
    const archivedInfo = {
      partnerId: queryUserId,
      partnerUsername: archivedUser.username,
      partnerAvatarUrl: archivedUser.avatarUrl,
      archivedAt: archivedUser.archivedAt || new Date(),
      postCount: posts.length,
    };

    return NextResponse.json({
      posts,
      archivedInfo,
    });
  } catch (error) {
    console.error('获取归档数据失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}