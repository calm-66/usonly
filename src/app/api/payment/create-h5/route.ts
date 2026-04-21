/**
 * 创建 H5 支付订单 API
 * POST /api/payment/create-h5
 * 
 * 使用 ZPay mapi.php API，支持移动端 H5 支付和 PC 端二维码支付
 */

import { NextRequest, NextResponse } from 'next/server';
import { createH5PaymentOrder } from '@/lib/payment';
import type { CreatePaymentRequest } from '@/types/payment';

// 检测是否为移动端设备
function isMobile(userAgent: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, paymentType, message, isAnonymous } = body as CreatePaymentRequest;
    
    // 从请求头获取用户 ID（如果用户已登录）
    const userId = request.headers.get('x-user-id') || undefined;

    // 从 User-Agent 检测是否为移动端
    const userAgent = request.headers.get('user-agent') || '';
    const mobile = isMobile(userAgent);

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

    // 创建 H5 支付订单
    const result = await createH5PaymentOrder(
      {
        amount,
        paymentType,
        message,
        isAnonymous,
        userId,
      },
      request,
      mobile
    );

    if (result.success) {
      // 添加移动端标识，方便前端处理
      return NextResponse.json({
        ...result,
        isMobile: mobile,
      });
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('创建 H5 支付订单 API 错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}