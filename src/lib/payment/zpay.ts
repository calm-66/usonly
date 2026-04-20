/**
 * ZPay SDK
 * 封装 ZPay 支付平台的签名生成、验证和支付 URL 生成功能
 */

import { md5 } from 'utility';
import type { ZPayRequestParams, ZPayNotifyParams } from '../../types/payment';

/**
 * 生成唯一订单号
 * 格式：YYYYMMDDHHmmss + 3 位随机数
 */
export function generateOutTradeNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

/**
 * 生成 MD5 签名
 * 规则：
 * 1. 排除空值、sign、sign_type
 * 2. 按 key 字母排序
 * 3. 拼接成 key=value&key=value 格式
 * 4. 末尾添加 key 后进行 MD5
 * 
 * @param params - 请求参数对象
 * @param key - ZPay 密钥
 * @returns MD5 签名（小写）
 */
export function generateSign(params: Record<string, any>, key: string): string {
  // 1. 过滤空值、sign、sign_type
  const filteredParams: Record<string, any> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === 'sign' || k === 'sign_type') continue;
    if (v === null || v === undefined || v === '') continue;
    filteredParams[k] = v;
  }
  
  // 2. 按 key 字母排序
  const sortedKeys = Object.keys(filteredParams).sort();
  
  // 3. 拼接成 key=value& 格式
  const signString = sortedKeys
    .map(k => `${k}=${filteredParams[k]}`)
    .join('&');
  
  // 4. 末尾添加 key 后进行 MD5
  const signStrWithKey = signString + key;
  return md5(signStrWithKey).toLowerCase();
}

/**
 * 验证 ZPay 回调签名
 * @param params - 回调参数对象（包含 sign）
 * @param key - ZPay 密钥
 * @returns 签名是否有效
 */
export function verifySign(params: ZPayNotifyParams, key: string): boolean {
  const { sign, ...restParams } = params;
  const expectedSign = generateSign(restParams, key);
  return sign.toLowerCase() === expectedSign;
}

/**
 * 生成支付跳转 URL
 * @param params - ZPay 请求参数
 * @param key - ZPay 密钥
 * @returns 完整的支付跳转 URL
 */
export function createPayUrl(params: ZPayRequestParams, key: string): string {
  const baseUrl = 'https://z-pay.cn/submit.php';
  
  // 生成签名
  const sign = generateSign(params, key);
  
  // 构建查询参数
  const queryParams = new URLSearchParams({
    pid: params.pid,
    money: params.money,
    name: params.name,
    notify_url: params.notify_url,
    out_trade_no: params.out_trade_no,
    return_url: params.return_url,
    sitename: params.sitename,
    type: params.type,
    sign: sign,
    sign_type: 'MD5',
  });
  
  // 添加可选参数
  if (params.param) {
    queryParams.append('param', params.param);
  }
  if (params.cid) {
    queryParams.append('cid', params.cid);
  }
  
  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * ZPay 配置接口
 */
export interface ZPayConfig {
  pid: string;
  key: string;
  notifyUrl: string;
  returnUrl: string;
  sitename: string;
}

/**
 * ZPay 支付类
 */
export class ZPay {
  private config: ZPayConfig;

  constructor(config: ZPayConfig) {
    this.config = config;
  }

  /**
   * 生成支付 URL
   * @param money - 金额
   * @param name - 商品名称
   * @param type - 支付类型
   * @param param - 附加参数（可选）
   * @param notifyUrl - 异步通知 URL（可选，动态覆盖）
   * @param returnUrl - 跳转通知 URL（可选，动态覆盖）
   * @returns 支付跳转 URL
   */
  createPaymentUrl(
    money: string,
    name: string,
    type: 'alipay' | 'wxpay',
    param?: string,
    notifyUrl?: string,
    returnUrl?: string
  ): string {
    const outTradeNo = generateOutTradeNo();
    
    const payParams: ZPayRequestParams = {
      pid: this.config.pid,
      money,
      name,
      notify_url: notifyUrl || this.config.notifyUrl,
      out_trade_no: outTradeNo,
      return_url: returnUrl || this.config.returnUrl,
      sitename: this.config.sitename,
      type,
      param,
    };
    
    return createPayUrl(payParams, this.config.key);
  }

  /**
   * 验证回调签名
   * @param params - 回调参数
   * @returns 签名是否有效
   */
  verifyNotify(params: ZPayNotifyParams): boolean {
    return verifySign(params, this.config.key);
  }

  /**
   * 获取配置
   */
  getConfig(): ZPayConfig {
    return this.config;
  }
}

