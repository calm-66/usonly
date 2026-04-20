/**
 * ZPay 异步回调处理 API
 * POST /api/payment/notify
 * 
 * ZPay 会在用户支付成功后调用此接口
 * 需要返回纯文本 "success" 表示接收成功
 */

import { NextRequest, NextResponse } from 'next/server';
import { handlePaymentNotify } from '@/lib/payment';
import type { ZPayNotifyParams } from '@/types/payment';

export async function POST(request: NextRequest) {
  const startTime = new Date().toISOString();
  console.log('[ZPay Notify] 请求开始:', {
    time: startTime,
    method: request.method,
    url: request.url,
  });

  try {
    // 获取表单数据（ZPay 使用 application/x-www-form-urlencoded）
    const formData = await request.formData();
    
    const params: ZPayNotifyParams = {
      out_trade_no: formData.get('out_trade_no') as string,
      trade_no: formData.get('trade_no') as string,
      type: formData.get('type') as string,
      money: formData.get('money') as string,
      pid: formData.get('pid') as string,
      param: formData.get('param') as string || undefined,
      sign: formData.get('sign') as string,
    };

    console.log('[ZPay Notify] 接收到的参数:', {
      out_trade_no: params.out_trade_no,
      trade_no: params.trade_no,
      type: params.type,
      money: params.money,
      pid: params.pid,
      param: params.param,
      hasSign: !!params.sign,
      sign: params.sign ? params.sign.substring(0, 10) + '...' : 'empty',
    });

    // 验证必填字段
    if (!params.out_trade_no || !params.trade_no || !params.money || !params.sign) {
      console.error('[ZPay Notify] 回调参数不完整，缺少必填字段');
      return new NextResponse('fail', { status: 400 });
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
