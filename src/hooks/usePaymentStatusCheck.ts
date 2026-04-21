/**
 * 支付状态检查 Hook
 * 用于检测待支付的订单状态，并在支付成功后自动跳转到感谢页面
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PendingOrder {
  outTradeNo: string;
  timestamp: number;
}

/**
 * 检查支付状态的 Hook
 * @param checkInterval - 轮询间隔（毫秒），默认为 3 秒
 * @param timeout - 超时时间（毫秒），默认为 30 分钟
 */
export function usePaymentStatusCheck(
  checkInterval: number = 3000,
  timeout: number = 30 * 60 * 1000
) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedOrder, setLastCheckedOrder] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // 检查 sessionStorage 中是否有待支付的订单
    const checkPendingOrder = async () => {
      if (typeof window === 'undefined') return;

      const pendingOrderStr = sessionStorage.getItem('pendingPaymentOrder');
      if (!pendingOrderStr) {
        setIsChecking(false);
        return;
      }

      try {
        const pendingOrder: PendingOrder = JSON.parse(pendingOrderStr);
        const { outTradeNo, timestamp } = pendingOrder;

        // 检查是否超时
        if (Date.now() - timestamp > timeout) {
          console.log('支付检查超时，清除待支付订单');
          sessionStorage.removeItem('pendingPaymentOrder');
          setIsChecking(false);
          return;
        }

        setIsChecking(true);

        // 查询订单状态
        const response = await fetch(`/api/payment/status/${outTradeNo}`);
        const result = await response.json();

        if (result.success && result.data) {
          const { status, amount } = result.data;

          // 如果订单已支付，跳转到感谢页面
          if (status === 'PAID') {
            console.log('支付成功，跳转到感谢页面');
            sessionStorage.removeItem('pendingPaymentOrder');
            setIsChecking(false);
            setLastCheckedOrder(outTradeNo);
            
            // 跳转到感谢页面，带上订单信息
            router.push(`/payment/thank-you?out_trade_no=${outTradeNo}&money=${amount}`);
            return;
          }

          // 如果订单仍为待支付状态，继续轮询
          if (status === 'PENDING') {
            console.log('订单待支付，继续检查...');
          }
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
      }
    };

    // 立即检查一次
    checkPendingOrder();

    // 设置轮询定时器
    const intervalId = setInterval(checkPendingOrder, checkInterval);

    // 清理定时器
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkInterval, timeout, router]);

  return {
    isChecking,
    lastCheckedOrder,
  };
}