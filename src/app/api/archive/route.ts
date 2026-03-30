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

    // 验证当前用户是否有权查看这个归档
    // 当前用户必须是 queryUserId 或 partnerId 之一
    if (userId !== queryUserId && userId !== partnerId) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 验证双方是否存在归档关系
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        archivedPartnerId: true,
      },
    });

    if (!currentUser || !currentUser.archivedPartnerId) {
      return NextResponse.json({ error: '没有归档记录' }, { status: 404 });
    }

    // 验证归档关系是否匹配
    // currentUser.archivedPartnerId 应该等于 queryUserId 或 partnerId 中的另一个
    const expectedPartnerId = (currentUser.archivedPartnerId === queryUserId) ? queryUserId : partnerId;
    if (currentUser.archivedPartnerId !== expectedPartnerId) {
      return NextResponse.json({ error: '归档关系不匹配' }, { status: 403 });
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

    // 获取双方的归档分享（按日期倒序）
    // 查询条件：双方发布的且已归档的帖子
    const [userPosts, partnerPosts] = await Promise.all([
      prisma.post.findMany({
        where: {
          userId: queryUserId,
          archivedAt: { not: null },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.post.findMany({
        where: {
          userId: partnerId,
          archivedAt: { not: null },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    // 合并双方的帖子
    const allPosts = [...userPosts, ...partnerPosts];

    // 构建归档信息
    const archivedInfo = {
      partnerId: queryUserId,
      partnerUsername: archivedUser.username,
      partnerAvatarUrl: archivedUser.avatarUrl,
      archivedAt: archivedUser.archivedAt || new Date(),
      postCount: allPosts.length,
    };

    return NextResponse.json({
      posts: allPosts,
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
