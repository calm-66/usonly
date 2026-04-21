/**
 * 支付状态检查组件
 * 在应用级别检查待支付订单状态，支付成功后自动跳转到感谢页面
 */

'use client';

import { usePaymentStatusCheck } from '@/hooks/usePaymentStatusCheck';

export default function PaymentStatusChecker() {
  // 使用支付状态检查 Hook
  // 每 3 秒检查一次，超时时间为 30 分钟
  usePaymentStatusCheck(3000, 30 * 60 * 1000);

  // 此组件不渲染任何内容，只负责后台检查
  return null;
}