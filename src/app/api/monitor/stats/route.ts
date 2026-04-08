import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 标准化用户统计 API - 用于 Monitor Dashboard 显示用户数据
 * 
 * 响应格式:
 * {
 *   success: true,
 *   data: {
 *     totalUsers: number,        // 总注册用户数
 *     newUsersToday?: number,    // 今日新增用户
 *     newUsersThisWeek?: number, // 本周新增用户
 *     newUsersThisMonth?: number // 本月新增用户
 *     dailyVisitors?: Array<{ date: string, count: number }>,     // 每日访问用户数（30 天）
 *     dailyActiveUsers?: Array<{ date: string, count: number }>   // 每日登录用户数（30 天）
 *   }
 * }
 * 
 * 可选的 API Key 认证（通过 MONITOR_API_KEY 环境变量配置）
 * 
 * CORS: 允许所有域名访问（因为这是公开统计数据）
 */

// CORS 配置 - 允许所有域名访问
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

// 处理 OPTIONS 预检请求
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    // 可选的 API Key 认证
    const apiKey = request.headers.get('X-API-Key');
    const expectedKey = process.env.MONITOR_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // 获取总用户数
    const totalUsers = await prisma.user.count();
    
    // 今日开始时间（零点）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 本周开始时间（周一）
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    
    // 本月开始时间（1 号）
    const monthStart = new Date(today);
    monthStart.setDate(1);

    // 统计各时间段新增用户
    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: today } }
    });
    
    const newUsersThisWeek = await prisma.user.count({
      where: { createdAt: { gte: weekStart } }
    });
    
    const newUsersThisMonth = await prisma.user.count({
      where: { createdAt: { gte: monthStart } }
    });

    // 获取 30 天前的日期
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // 获取每日登录用户数（基于 lastLoginAt）
    const dailyActiveUsersResult = await prisma.user.groupBy({
      by: ['lastLoginAt'],
      _count: { id: true },
      where: {
        lastLoginAt: { gte: thirtyDaysAgo }
      },
      orderBy: {
        lastLoginAt: 'asc'
      }
    });

    // 按日期分组统计登录用户数
    const dailyActiveUsersMap = new Map<string, number>();
    dailyActiveUsersResult.forEach((item: { lastLoginAt: Date | null; _count: { id: number } }) => {
      if (item.lastLoginAt) {
        const dateKey = item.lastLoginAt.toISOString().split('T')[0];
        dailyActiveUsersMap.set(dateKey, (dailyActiveUsersMap.get(dateKey) || 0) + item._count.id);
      }
    });

    const dailyActiveUsers = Array.from(dailyActiveUsersMap.entries()).map(([date, count]) => ({
      date,
      count
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        dailyActiveUsers
      }
    }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error in /api/monitor/stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
