/**
 * 打赏弹窗组件
 * 支持支付宝/微信支付，金额输入，留言和匿名选项
 */

'use client';

import { useState } from 'react';
import type { CreatePaymentResponse } from '../types/payment';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_AMOUNT = 5;
const CUSTOM_AMOUNTS = [5, 10, 20, 50];

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'alipay' | 'wxpay'>('alipay');
  const [message, setMessage] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          paymentType,
          message: message.trim() || undefined,
          isAnonymous,
        }),
      });

      const result: CreatePaymentResponse = await response.json();

      if (result.success && result.data) {
        // 跳转到支付页面
        window.location.href = result.data.payUrl;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-pink-500 to-red-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white text-center">
            ☕ 请作者喝杯咖啡
          </h2>
          <p className="text-pink-100 text-sm text-center mt-1">
            支持我们，让爱继续传递
          </p>
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
                    setCustomAmount('');
                  }}
                  className={`py-2 px-3 rounded-lg border-2 transition-colors ${
                    amount === val && !customAmount
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

          {/* 支付方式选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支付方式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('alipay')}
                className={`py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors ${
                  paymentType === 'alipay'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <span className="font-medium">支付宝</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('wxpay')}
                className={`py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors ${
                  paymentType === 'wxpay'
                    ? 'border-green-500 bg-green-50 text-green-600'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <span className="font-medium">微信支付</span>
              </button>
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

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isLoading || amount <= 0}
            className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-red-500 text-white font-medium rounded-lg hover:from-pink-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '处理中...' : `打赏 ¥${amount.toFixed(2)}`}
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
  );
}