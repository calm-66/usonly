/**
 * 感谢页面
 * 用户支付成功后显示的感谢页面
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const outTradeNo = searchParams.get('out_trade_no');
  const money = searchParams.get('money');
  
  const [orderStatus, setOrderStatus] = useState<string>('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!outTradeNo) return;

    // 查询订单状态
    const checkOrderStatus = async () => {
      try {
        const response = await fetch(`/api/payment/status/${outTradeNo}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setOrderStatus(result.data.status);
        }
      } catch (error) {
        console.error('查询订单状态失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOrderStatus();

    // 如果订单还未支付，轮询检查状态
    const interval = setInterval(() => {
      checkOrderStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [outTradeNo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        {/* 图标 */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>

        {/* 金额 */}
        {isLoading ? (
          <p className="text-gray-500 mb-6">正在确认支付状态...</p>
        ) : orderStatus === 'PAID' ? (
          <>
            {money && (
              <p className="text-2xl font-bold text-pink-600 mb-6">
                ¥{parseFloat(money).toFixed(2)}
              </p>
            )}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700 text-sm">
                感谢您的支持，我们会继续努力做得更好！🎉
              </p>
            </div>
          </>
        ) : orderStatus === 'PENDING' ? (
          <>
            <p className="text-gray-600 mb-6">
              正在等待支付完成...
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-700 text-sm">
                如果您已完成支付，请等待系统确认
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              订单状态查询中
            </p>
          </>
        )}

        {/* 返回按钮 */}
        <Link
          href="/profile"
          className="inline-block w-full py-3 px-6 bg-gradient-to-r from-pink-500 to-red-500 text-white font-medium rounded-lg hover:from-pink-600 hover:to-red-600 transition-colors"
        >
          返回
        </Link>

        {/* 订单号（用于调试） */}
        {outTradeNo && (
          <p className="text-xs text-gray-400 mt-4">
            订单号：{outTradeNo}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-red-100 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}