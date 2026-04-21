/**
 * ZPay 支付相关类型定义
 */

/**
 * ZPay 请求参数类型
 */
export interface ZPayRequestParams {
  pid: string;        // 商户 ID
  money: string;      // 金额（字符串，最多 2 位小数）
  name: string;       // 商品名称
  notify_url: string; // 异步通知 URL
  out_trade_no: string; // 商户订单号
  return_url: string; // 跳转通知 URL
  sitename: string;   // 网站名称
  type: 'alipay' | 'wxpay' | 'qqpay' | 'tenpay';
  param?: string;     // 附加内容（可选）
  cid?: string;       // 支付渠道 ID（可选）
}

/**
 * ZPay 回调参数类型
 */
export interface ZPayNotifyParams {
  out_trade_no: string;  // 商户订单号
  trade_no: string;      // ZPay 交易号
  type: string;          // 支付方式
  money: string;         // 订单金额
  pid: string;           // 商户 ID
  name: string;          // 商品名称
  param?: string;        // 附加内容
  sign: string;          // 签名
  trade_status?: string; // 支付状态（TRADE_SUCCESS 表示成功）
  sign_type?: string;    // 签名类型（MD5）
}

/**
 * 创建支付订单请求体
 */
export interface CreatePaymentRequest {
  amount: number;       // 打赏金额
  paymentType: 'alipay' | 'wxpay';
  message?: string;     // 打赏留言
  isAnonymous?: boolean; // 是否匿名
}

/**
 * 支付订单响应
 */
export interface CreatePaymentResponse {
  success: boolean;
  data?: {
    orderId: string;
    outTradeNo: string;
    payUrl: string;     // 跳转支付的 URL
  };
  error?: string;
}

/**
 * 支付事件上报类型 (Monitor)
 */
export interface PaymentEventPayload {
  source: 'usonly';
  eventType: 'payment.completed' | 'donation.created';
  orderId: string;
  amount: number;
  currency: string;
  metadata?: {
    paymentType?: string;
    productName?: string;
    userId?: string;
    message?: string;
    isAnonymous?: boolean;
  };
  timestamp: string;
}