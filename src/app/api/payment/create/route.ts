/**
 * 创建支付订单 API
 * POST /api/payment/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPaymentOrder } from '@/lib/payment';
import type { CreatePaymentRequest } from '@/types/payment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, paymentType, message, isAnonymous } = body as CreatePaymentRequest;

    // 参数验证
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: '请输入有效的金额' },
        { status: 400 }
      );
    }

    if (!paymentType || !['alipay', 'wxpay'].includes(paymentType)) {
      return NextResponse.json(
        { success: false, error: '请选择有效的支付方式' },
        { status: 400 }
      );
    }

    // 创建支付订单（传入 request 以动态获取回调 URL）
    const result = await createPaymentOrder(
      {
        amount,
        paymentType,
        message,
        isAnonymous,
      },
      request
    );

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('创建支付订单 API 错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
