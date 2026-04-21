/**
 * 打赏弹窗组件
 * 支持支付宝支付，金额输入，留言和匿名选项
 * 移动端使用 H5 支付，PC 端显示二维码
 */

'use client';

import { useState } from 'react';
import type { CreatePaymentResponse, ZPayMapiResponse } from '../types/payment';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_AMOUNT = 5;
const CUSTOM_AMOUNTS = [5, 10, 20, 50];

// 检测是否为移动端设备
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // H5 支付相关状态
  const [h5Data, setH5Data] = useState<ZPayMapiResponse | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const isMobileDevice = isMobile();

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setAmount(numValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 获取当前登录用户的 ID（如果已登录）
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || undefined;

      // 移动端使用 H5 支付 API
      const endpoint = isMobileDevice ? '/api/payment/create-h5' : '/api/payment/create';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({
          amount,
          paymentType: 'alipay' as const,
          message: message.trim() || undefined,
          isAnonymous,
        }),
      });

      const result: CreatePaymentResponse & { 
        isMobile?: boolean;
        h5Data?: ZPayMapiResponse;
      } = await response.json();

      if (result.success && result.data) {
        // 保存订单号到 sessionStorage，用于支付完成后检查状态
        if (result.data.outTradeNo) {
          savePendingOrder(result.data.outTradeNo);
        }
        
        if (isMobileDevice) {
          // 移动端处理
          if (result.h5Data) {
            setH5Data(result.h5Data);
            
            // 支付宝 H5 支付链接
            const h5Url = result.h5Data.payurl;
            
            if (h5Url) {
              // 延迟跳转，让用户看到按钮点击效果
              setTimeout(() => {
                window.location.href = h5Url;
              }, 300);
              return;
            }
            
            // 如果没有 H5 链接但有二维码，显示二维码弹窗
            if (result.h5Data.img) {
              setQrCodeUrl(result.h5Data.img);
              setShowQrModal(true);
              return;
            }
          }
          
          // 回退到传统方式
          window.location.href = result.data.payUrl;
        } else {
          // PC 端：显示二维码或直接跳转
          if (result.h5Data?.img) {
            // 有二维码图片，显示弹窗
            setQrCodeUrl(result.h5Data.img);
            setShowQrModal(true);
          } else {
            // 直接跳转支付页面
            window.location.href = result.data.payUrl;
          }
        }
      } else {
        setError(result.error || '创建订单失败，请重试');
      }
    } catch (err) {
      console.error('创建支付订单失败:', err);
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 保存待支付订单到 sessionStorage，用于支付完成后检查状态
   */
  const savePendingOrder = (outTradeNo: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingPaymentOrder', JSON.stringify({
        outTradeNo,
        timestamp: Date.now(),
      }));
    }
  };

  const handlePayNow = () => {
    if (h5Data?.payurl) {
      window.location.href = h5Data.payurl;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-pink-500 to-red-500 px-6 py-4">
            <h2 className="text-xl font-bold text-white text-center flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 1v3M10 1v3M14 1v3" />
              </svg>
              请作者喝咖啡
            </h2>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* 金额选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                打赏金额
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {CUSTOM_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setAmount(val);
                      setCustomAmount(val.toString());
                    }}
                    className={`py-2 px-3 rounded-lg border-2 transition-colors ${
                      amount === val && customAmount === val.toString()
                        ? 'border-pink-500 bg-pink-50 text-pink-600'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    ¥{val}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  placeholder="自定义金额"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  min="0.01"
                  step="0.01"
                />
              </div>
              {amount > 0 && (
                <p className="text-sm text-pink-600 mt-2 font-medium">
                  当前金额：¥{amount.toFixed(2)}
                </p>
              )}
            </div>

            {/* 支付方式 - 仅支持支付宝 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                支付方式
              </label>
              <div className="py-3 px-4 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-600 flex items-center gap-2">
                <span className="font-medium">支付宝</span>
              </div>
            </div>

            {/* 留言输入 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                留言（可选）
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="写下你想对作者说的话..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {message.length}/200
              </p>
            </div>

            {/* 匿名选项 */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                />
                <span className="text-sm text-gray-600">匿名打赏</span>
              </label>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 移动端提示 */}
            {isMobileDevice && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  💡 点击支付后将自动跳转到支付宝 App 完成支付
                </p>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading || amount <= 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-red-500 text-white font-medium rounded-lg hover:from-pink-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading 
                ? '处理中...' 
                : isMobileDevice 
                  ? `立即支付 ¥${amount.toFixed(2)}`
                  : `打赏 ¥${amount.toFixed(2)}`
              }
            </button>

            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-2 py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              取消
            </button>
          </form>
        </div>
      </div>

      {/* 二维码弹窗（PC 端使用） */}
      {showQrModal && qrCodeUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-xl overflow-hidden max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-pink-500 to-red-500 px-4 py-3">
              <h3 className="text-lg font-bold text-white text-center">
                扫码支付
              </h3>
            </div>
            <div className="p-6">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                <img 
                  src={qrCodeUrl} 
                  alt="支付二维码"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-center text-gray-600 text-sm mb-4">
                打开支付宝扫一扫
              </p>
              {h5Data?.payurl && (
                <button
                  onClick={handlePayNow}
                  className="w-full py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
                >
                  点击跳转支付
                </button>
              )}
            </div>
            <div className="border-t px-4 py-3">
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}