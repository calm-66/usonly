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

const prisma = new PrismaClient();

// 从环境变量获取 ZPay 配置
const ZPAY_PID = process.env.ZPAY_PID || '';
const ZPAY_KEY = process.env.ZPAY_KEY || '';
const ZPAY_NOTIFY_URL = process.env.ZPAY_NOTIFY_URL || '';
const ZPAY_RETURN_URL = process.env.ZPAY_RETURN_URL || '';
const SITENAME = process.env.SITENAME || 'UsOnly';

// 从环境变量获取 Monitor 配置
const MONITOR_API_URL = process.env.MONITOR_API_URL || '';
const MONITOR_API_KEY = process.env.MONITOR_API_KEY || '';

// 初始化 ZPay 实例
const zpay = new ZPay({
  pid: ZPAY_PID,
  key: ZPAY_KEY,
  notifyUrl: ZPAY_NOTIFY_URL,
  returnUrl: ZPAY_RETURN_URL,
  sitename: SITENAME,
});

/**
 * 创建支付订单
 * @param data - 创建支付订单请求数据
 * @returns 支付订单响应
 */
export async function createPaymentOrder(
  data: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  try {
    const { amount, paymentType, message, isAnonymous = false } = data;

    // 生成订单号
    const outTradeNo = generateOutTradeNo();

    // 创建支付订单记录
    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        outTradeNo,
        amount, // 存储金额（元）
        currency: 'CNY',
        productName: 'Buy Me a Coffee',
        paymentType,
        status: 'PENDING',
        param: JSON.stringify({
          message,
          isAnonymous,
        }),
      },
    });

    // 生成支付 URL
    const payUrl = zpay.createPaymentUrl(
      amount.toFixed(2),
      'Buy Me a Coffee',
      paymentType,
      paymentOrder.id // 将订单 ID 作为 param 传递
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
      include: { donation: true },
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

    // 4. 更新订单状态
    const amount = parseFloat(money);
    await prisma.paymentOrder.update({
      where: { id: paymentOrder.id },
      data: {
        status: 'PAID',
        tradeNo: trade_no,
        amount,
        paidAt: new Date(),
      },
    });

    // 5. 解析附加参数
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

    // 6. 创建打赏记录
    await prisma.donation.create({
      data: {
        orderId: paymentOrder.id,
        amount,
        message,
        isAnonymous,
      },
    });

    // 7. 推送事件到 Monitor
    await pushPaymentEventToMonitor({
      source: 'usonly',
      eventType: 'payment.completed',
      orderId: paymentOrder.id,
      amount,
      currency: 'CNY',
      metadata: {
        paymentType: type,
        productName: paymentOrder.productName,
        userId: paymentOrder.userId || undefined,
        message,
      },
      timestamp: new Date().toISOString(),
    });

    // 8. 推送打赏事件
    await pushPaymentEventToMonitor({
      source: 'usonly',
      eventType: 'donation.created',
      orderId: paymentOrder.id,
      amount,
      currency: 'CNY',
      metadata: {
        message,
        isAnonymous,
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
    const donations = await prisma.donation.findMany({
      where: {
        isAnonymous: false, // 只显示非匿名打赏
      },
      include: {
        paymentOrder: {
          select: {
            userId: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return donations.map((d) => ({
      id: d.id,
      amount: Number(d.amount),
      message: d.message,
      createdAt: d.createdAt,
      paymentOrder: d.paymentOrder,
    }));
  } catch (error) {
    console.error('获取打赏列表失败:', error);
    return [];
  }
}

export { zpay };