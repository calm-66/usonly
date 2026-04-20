/**
 * 查询支付订单状态 API
 * GET /api/payment/status/[orderId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/payment';

interface RouteParams {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '订单 ID 不能为空' },
        { status: 400 }
      );
    }

    const status = await getPaymentStatus(orderId);

    if (status) {
      return NextResponse.json({
        success: true,
        data: status,
      });
    } else {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('查询订单状态 API 错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}