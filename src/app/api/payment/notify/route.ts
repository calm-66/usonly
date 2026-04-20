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
  const startTime = new Date().toISOString();
  console.log('[ZPay Notify] 请求开始:', {
    time: startTime,
    method: request.method,
    url: request.url,
  });

  try {
    // GET：从查询参数获取
    const searchParams = request.nextUrl.searchParams;
    
    const params: ZPayNotifyParams = {
      out_trade_no: searchParams.get('out_trade_no') as string,
      trade_no: searchParams.get('trade_no') as string,
      type: searchParams.get('type') as string,
      money: searchParams.get('money') as string,
      pid: searchParams.get('pid') as string,
      param: searchParams.get('param') || undefined,
      sign: searchParams.get('sign') as string,
      trade_status: searchParams.get('trade_status') || undefined,
    };

    console.log('[ZPay Notify] 接收到的参数:', {
      out_trade_no: params.out_trade_no,
      trade_no: params.trade_no,
      type: params.type,
      money: params.money,
      pid: params.pid,
      param: params.param,
      trade_status: params.trade_status,
      hasSign: !!params.sign,
      sign: params.sign ? params.sign.substring(0, 10) + '...' : 'empty',
    });

    // 验证必填字段
    if (!params.out_trade_no || !params.trade_no || !params.money || !params.sign) {
      console.error('[ZPay Notify] 回调参数不完整，缺少必填字段');
      return new NextResponse('fail', { status: 400 });
    }

    // 验证支付状态
    if (params.trade_status && params.trade_status !== 'TRADE_SUCCESS') {
      console.log('[ZPay Notify] 支付状态不是 TRADE_SUCCESS，跳过处理:', params.trade_status);
      return new NextResponse('success', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.log('[ZPay Notify] 参数验证通过，开始处理支付回调...');

    // 处理支付回调
    const success = await handlePaymentNotify(params);

    console.log('[ZPay Notify] handlePaymentNotify 返回结果:', success);

    if (success) {
      // 返回纯文本 "success" 给 ZPay
      console.log('[ZPay Notify] 返回 success');
      return new NextResponse('success', {
        headers: { 'Content-Type': 'text/plain' },
      });
    } else {
      console.error('[ZPay Notify] 处理失败，返回 fail');
      return new NextResponse('fail', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  } catch (error) {
    console.error('[ZPay Notify] 处理支付回调异常:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new NextResponse('fail', {
      headers: { 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
}
