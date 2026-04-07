import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 标准化用户统计 API - 用于 Monitor Dashboard 显示注册用户数
 * 
 * 响应格式:
 * {
 *   success: true,
 *   data: {
 *     totalUsers: number,        // 总注册用户数
 *     newUsersToday?: number,    // 今日新增用户
 *     newUsersThisWeek?: number, // 本周新增用户
 *     newUsersThisMonth?: number // 本月新增用户
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

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth
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
