/**
 * ZPay 异步回调处理 API
 * GET /api/payment/notify
 * 
 * ZPay 会在用户支付成功后调用此接口（只有 GET 请求）
 * 需要返回纯文本 "success" 表示接收成功
 */

import { NextRequest, NextResponse } from 'next/server';
import { handlePaymentNotify } from '@/lib/payment';
import type { ZPayNotifyParams } from '@/types/payment';

/**
 * 处理 ZPay GET 回调通知
 */
export async function GET(request: NextRequest) {
  try {
    // GET：从查询参数获取
    const searchParams = request.nextUrl.searchParams;
    
    const params: ZPayNotifyParams = {
      out_trade_no: searchParams.get('out_trade_no') as string,
      trade_no: searchParams.get('trade_no') as string,
      type: searchParams.get('type') as string,
      money: searchParams.get('money') as string,
      pid: searchParams.get('pid') as string,
      name: searchParams.get('name') as string,
      param: searchParams.get('param') || undefined,
      sign: searchParams.get('sign') as string,
      trade_status: searchParams.get('trade_status') || undefined,
      sign_type: searchParams.get('sign_type') || undefined,
    };

    // 验证必填字段
    if (!params.out_trade_no || !params.trade_no || !params.money || !params.sign) {
      return new NextResponse('fail', { status: 400 });
    }

    // 验证支付状态
    if (params.trade_status && params.trade_status !== 'TRADE_SUCCESS') {
      return new NextResponse('success', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 处理支付回调
    const success = await handlePaymentNotify(params);

    if (success) {
      // 返回纯文本 "success" 给 ZPay
      return new NextResponse('success', {
        headers: { 'Content-Type': 'text/plain' },
      });
    } else {
      return new NextResponse('fail', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  } catch (error) {
    return new NextResponse('fail', {
      headers: { 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
}