/**
 * 支付服务统一出口
 * 封装支付相关的业务逻辑
 */

import { PrismaClient } from '@prisma/client';
import { ZPay, generateOutTradeNo, verifySign } from './zpay';
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentEventPayload,
  ZPayNotifyParams,
} from '../../types/payment';
import type { NextRequest } from 'next/server';

const prisma = new PrismaClient();

// 从环境变量获取 ZPay 配置
const ZPAY_PID = process.env.ZPAY_PID || '';
const ZPAY_KEY = process.env.ZPAY_KEY || '';
const SITENAME = process.env.SITENAME || 'UsOnly';

// 从环境变量获取 Monitor 配置
const MONITOR_API_URL = process.env.MONITOR_API_URL || '';
const MONITOR_API_KEY = process.env.MONITOR_API_KEY || '';

// 初始化 ZPay 实例（notifyUrl 和 returnUrl 使用占位符，实际使用时动态生成）
const zpay = new ZPay({
  pid: ZPAY_PID,
  key: ZPAY_KEY,
  notifyUrl: 'https://placeholder.com/api/payment/notify',
  returnUrl: 'https://placeholder.com/api/payment/return',
  sitename: SITENAME,
});

/**
 * 动态获取当前请求的基础 URL
 * @param request - Next.js 请求对象（可选）
 * @returns 基础 URL（如：https://usonly.vercel.app）
 */
export function getBaseUrl(request?: NextRequest): string {
  // 优先从请求头获取 host
  if (request) {
    const host = request.headers.get('host');
    if (host) {
      const protocol = host.includes('localhost') ? 'http' : 'https';
      return `${protocol}://${host}`;
    }
  }
  
  // 回退到环境变量或默认值
  return process.env.NEXT_PUBLIC_USONLY_BASE_URL || 'https://usonly.vercel.app';
}

/**
 * 获取动态回调 URL
 * @param request - Next.js 请求对象（可选）
 * @returns 包含 notifyUrl 和 returnUrl 的对象
 */
export function getCallbackUrls(request?: NextRequest): {
  notifyUrl: string;
  returnUrl: string;
  baseUrl: string;
} {
  const baseUrl = getBaseUrl(request);
  return {
    notifyUrl: `${baseUrl}/api/payment/notify`,
    returnUrl: `${baseUrl}/api/payment/return`,
    baseUrl,
  };
}

/**
 * 创建支付订单
 * @param data - 创建支付订单请求数据
 * @param request - Next.js 请求对象（用于动态获取回调 URL）
 * @returns 支付订单响应
 */
export async function createPaymentOrder(
  data: CreatePaymentRequest & { userId?: string },
  request?: NextRequest
): Promise<CreatePaymentResponse> {
  try {
    const { amount, paymentType, message, isAnonymous = false, userId } = data;

    // 生成订单号
    const outTradeNo = generateOutTradeNo();

    // 获取动态回调 URLs
    const { notifyUrl, returnUrl } = getCallbackUrls(request);

    // 创建支付订单记录
    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        outTradeNo,
        userId, // 关联用户 ID（如果已登录）
        amount, // 存储金额（元）
        currency: 'CNY',
        productName: 'Buy Me a Coffee',
        paymentType,
        status: 'PENDING',
        message, // 打赏留言
        isAnonymous, // 是否匿名
      },
    });

    // 生成支付 URL（使用动态回调 URLs）
    // 关键修复：将生成的订单号传给 createPaymentUrl，确保 ZPay 使用和数据库相同的订单号
    const payUrl = zpay.createPaymentUrl(
      amount.toFixed(2),
      'Buy Me a Coffee',
      paymentType,
      paymentOrder.id, // 将订单 ID 作为 param 传递
      notifyUrl,
      returnUrl,
      outTradeNo // 传入已生成的订单号，确保一致性
    );

    return {
      success: true,
      data: {
        orderId: paymentOrder.id,
        outTradeNo: paymentOrder.outTradeNo,
        payUrl,
      },
    };
  } catch (error) {
    console.error('创建支付订单失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建订单失败',
    };
  }
}

/**
 * 处理 ZPay 异步回调
 * @param params - ZPay 回调参数
 * @returns 处理是否成功
 */
export async function handlePaymentNotify(
  params: ZPayNotifyParams
): Promise<boolean> {
  try {
    const { out_trade_no, trade_no, money, type } = params;

    // 1. 验证签名
    const isValid = zpay.verifyNotify(params);
    if (!isValid) {
      console.error('签名验证失败');
      return false;
    }

    // 2. 查找订单
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { outTradeNo: out_trade_no },
    });

    if (!paymentOrder) {
      console.error('订单不存在:', out_trade_no);
      return false;
    }

    // 3. 幂等性处理 - 已支付的订单不重复处理
    if (paymentOrder.status === 'PAID') {
      console.log('订单已支付，跳过处理:', out_trade_no);
      return true;
    }

    // 4. 校验金额一致性（防止假通知）
    // 使用误差范围比较，允许 0.01 元（1 分）的误差，避免浮点数精度问题
    const expectedAmount = Number(paymentOrder.amount);
    const notifyAmount = parseFloat(money);
    if (Math.abs(expectedAmount - notifyAmount) > 0.01) {
      console.error('金额不一致，拒绝处理:', {
        expected: expectedAmount,
        received: notifyAmount,
        diff: Math.abs(expectedAmount - notifyAmount),
      });
      return false;
    }

    // 5. 更新订单状态
    await prisma.paymentOrder.update({
      where: { id: paymentOrder.id },
      data: {
        status: 'PAID',
        tradeNo: trade_no,
        amount: notifyAmount,
        paidAt: new Date(),
      },
    });

    // 6. 更新订单的消息和匿名状态（如果 param 中有）
    let message: string | undefined;
    let isAnonymous = false;

    if (paymentOrder.param) {
      try {
        const extraData = JSON.parse(paymentOrder.param);
        message = extraData.message;
        isAnonymous = extraData.isAnonymous || false;
      } catch (e) {
        console.error('解析附加参数失败:', e);
      }
    }

    // 使用 param 中的值更新订单（如果解析成功）
    if (message !== undefined || isAnonymous) {
      await prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          message: message || paymentOrder.message,
          isAnonymous: isAnonymous || paymentOrder.isAnonymous,
        },
      });
    }

    // 7. 推送事件到 Monitor
    await pushPaymentEventToMonitor({
      source: 'usonly',
      eventType: 'payment.completed',
      orderId: paymentOrder.id,
      amount: notifyAmount,
      currency: 'CNY',
      metadata: {
        paymentType: type,
        productName: paymentOrder.productName,
        userId: paymentOrder.userId || undefined,
        message,
      },
      timestamp: new Date().toISOString(),
    });

    console.log('支付回调处理成功:', out_trade_no);
    return true;
  } catch (error) {
    console.error('处理支付回调失败:', error);
    return false;
  }
}

/**
 * 查询支付订单状态
 * @param orderId - 订单 ID
 * @returns 支付状态
 */
export async function getPaymentStatus(orderId: string): Promise<{
  status: string;
  paidAt: Date | null;
  amount: number;
  productName: string;
} | null> {
  try {
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        paidAt: true,
        amount: true,
        productName: true,
      },
    });

    if (!paymentOrder) {
      return null;
    }

    return {
      status: paymentOrder.status,
      paidAt: paymentOrder.paidAt,
      amount: Number(paymentOrder.amount), // 直接使用（元）
      productName: paymentOrder.productName,
    };
  } catch (error) {
    console.error('查询订单状态失败:', error);
    return null;
  }
}

/**
 * 推送支付事件到 Monitor
 * @param event - 支付事件数据
 */
export async function pushPaymentEventToMonitor(
  event: PaymentEventPayload
): Promise<void> {
  if (!MONITOR_API_URL || !MONITOR_API_KEY) {
    console.warn('Monitor 配置缺失，跳过事件推送');
    return;
  }

  try {
    const response = await fetch(`${MONITOR_API_URL}/api/payment/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MONITOR_API_KEY}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error('推送事件到 Monitor 失败:', response.status);
    }
  } catch (error) {
    console.error('推送事件到 Monitor 失败:', error);
  }
}

/**
 * 获取打赏列表（公开，匿名过滤）
 * @param limit - 数量限制
 * @returns 打赏列表
 */
export async function getDonations(limit = 20) {
  try {
    const paymentOrders = await prisma.paymentOrder.findMany({
      where: {
        status: 'PAID',
        isAnonymous: false, // 只显示非匿名打赏
      },
      select: {
        id: true,
        amount: true,
        message: true,
        createdAt: true,
        userId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return paymentOrders.map((order) => ({
      id: order.id,
      amount: Number(order.amount),
      message: order.message,
      createdAt: order.createdAt,
      userId: order.userId,
    }));
  } catch (error) {
    console.error('获取打赏列表失败:', error);
    return [];
  }
}

export { zpay };