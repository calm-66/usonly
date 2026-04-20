/**
 * ZPay 异步回调处理 API
 * POST /api/payment/notify
 * 
 * ZPay 会在用户支付成功后调用此接口
 * 需要返回纯文本 "success" 表示接收成功
 */

import { NextRequest, NextResponse } from 'next/server';
import { handlePaymentNotify } from '@/lib/payment';
import type { ZPayNotifyParams } from '../../../types/payment';

export async function POST(request: NextRequest) {
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

    // 验证必填字段
    if (!params.out_trade_no || !params.trade_no || !params.money || !params.sign) {
      console.error('回调参数不完整');
      return new NextResponse('fail', { status: 400 });
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
    console.error('处理支付回调异常:', error);
    return new NextResponse('fail', {
      headers: { 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
}