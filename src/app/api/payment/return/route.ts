/**
 * ZPay 同步跳转处理 API
 * GET /api/payment/return
 * 
 * 用户支付成功后会跳转到此页面
 * 显示感谢信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/payment';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const outTradeNo = searchParams.get('out_trade_no');
  const tradeNo = searchParams.get('trade_no');
  const money = searchParams.get('money');

  // 如果没有订单号，返回首页
  if (!outTradeNo) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 构建感谢页面 URL
  const thankYouUrl = new URL('/payment/thank-you', request.url);
  thankYouUrl.searchParams.set('out_trade_no', outTradeNo);
  if (tradeNo) {
    thankYouUrl.searchParams.set('trade_no', tradeNo);
  }
  if (money) {
    thankYouUrl.searchParams.set('money', money);
  }

  return NextResponse.redirect(thankYouUrl);
}