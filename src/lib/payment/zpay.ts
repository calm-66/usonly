/**
 * ZPay SDK
 * 封装 ZPay 支付平台的签名生成、验证和支付 URL 生成功能
 */

import { md5 } from 'utility';
import type { ZPayRequestParams, ZPayNotifyParams, ZPayMapiRequestParams, ZPayMapiResponse } from '../../types/payment';

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
  
  // 生成签名并验证
  const expectedSign = generateSign(restParams, key);
  
  return sign.toLowerCase() === expectedSign;
}

/**
 * 生成支付跳转 URL（页面跳转支付 - submit.php）
 * @param params - ZPay 请求参数
 * @param key - ZPay 密钥
 * @returns 完整的支付跳转 URL
 */
export function createPayUrl(params: ZPayRequestParams, key: string): string {
  const baseUrl = 'https://zpayz.cn/submit.php';
  
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
 * 调用 API 接口支付（mapi.php）
 * 支持 H5 支付和二维码支付
 * @param params - Mapi 请求参数
 * @param key - ZPay 密钥
 * @returns API 响应（包含 payurl、payurl2、qrcode、img 等）
 */
export async function callMapiApi(
  params: ZPayMapiRequestParams,
  key: string
): Promise<ZPayMapiResponse> {
  // 生成签名
  const sign = generateSign(params, key);
  
  // 构建 FormData 请求参数
  const formData = new FormData();
  formData.append('pid', params.pid);
  formData.append('type', params.type);
  formData.append('out_trade_no', params.out_trade_no);
  formData.append('notify_url', params.notify_url);
  formData.append('name', params.name);
  formData.append('money', params.money);
  formData.append('clientip', params.clientip);
  formData.append('sign', sign);
  formData.append('sign_type', 'MD5');
  
  // 添加可选参数
  if (params.cid) {
    formData.append('cid', params.cid);
  }
  if (params.device) {
    formData.append('device', params.device);
  }
  if (params.param) {
    formData.append('param', params.param);
  }
  
  // 发送 POST 请求
  const response = await fetch('https://zpayz.cn/mapi.php', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  
  // 检查是否成功
  if (result.code !== 1) {
    throw new Error(result.msg || 'API 请求失败');
  }
  
  return result as ZPayMapiResponse;
}

/**
 * 调用 API 接口支付（mapi.php），支持 returnUrl 参数
 * 支持 H5 支付和二维码支付
 * @param params - Mapi 请求参数
 * @param returnUrl - 支付成功后的跳转地址
 * @param key - ZPay 密钥
 * @returns API 响应（包含 payurl、payurl2、qrcode、img 等）
 */
export async function callMapiApiWithReturnUrl(
  params: ZPayMapiRequestParams & { return_url?: string },
  returnUrl: string,
  key: string
): Promise<ZPayMapiResponse> {
  // 生成签名
  const sign = generateSign(params, key);
  
  // 构建 FormData 请求参数
  const formData = new FormData();
  formData.append('pid', params.pid);
  formData.append('type', params.type);
  formData.append('out_trade_no', params.out_trade_no);
  formData.append('notify_url', params.notify_url);
  formData.append('return_url', returnUrl); // 添加 returnUrl 参数
  formData.append('name', params.name);
  formData.append('money', params.money);
  formData.append('clientip', params.clientip);
  formData.append('sign', sign);
  formData.append('sign_type', 'MD5');
  
  // 添加可选参数
  if (params.cid) {
    formData.append('cid', params.cid);
  }
  if (params.device) {
    formData.append('device', params.device);
  }
  if (params.param) {
    formData.append('param', params.param);
  }
  
  // 发送 POST 请求
  const response = await fetch('https://zpayz.cn/mapi.php', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  
  // 检查是否成功
  if (result.code !== 1) {
    throw new Error(result.msg || 'API 请求失败');
  }
  
  return result as ZPayMapiResponse;
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
   * 生成支付 URL（页面跳转 - submit.php）
   * @param money - 金额
   * @param name - 商品名称
   * @param type - 支付类型
   * @param param - 附加参数（可选）
   * @param notifyUrl - 异步通知 URL（可选，动态覆盖）
   * @param returnUrl - 跳转通知 URL（可选，动态覆盖）
   * @param outTradeNo - 外部传入的订单号（可选，不传则自动生成）
   * @returns 支付跳转 URL
   */
  createPaymentUrl(
    money: string,
    name: string,
    type: 'alipay' | 'wxpay',
    param?: string,
    notifyUrl?: string,
    returnUrl?: string,
    outTradeNo?: string
  ): string {
    const finalOutTradeNo = outTradeNo || generateOutTradeNo();
    
    const payParams: ZPayRequestParams = {
      pid: this.config.pid,
      money,
      name,
      notify_url: notifyUrl || this.config.notifyUrl,
      out_trade_no: finalOutTradeNo,
      return_url: returnUrl || this.config.returnUrl,
      sitename: this.config.sitename,
      type,
      param,
    };
    
    return createPayUrl(payParams, this.config.key);
  }

  /**
   * 调用 API 接口支付（mapi.php）
   * @param money - 金额
   * @param name - 商品名称
   * @param type - 支付类型
   * @param clientIp - 用户 IP 地址
   * @param device - 设备类型（pc 或 mobile）
   * @param param - 附加参数（可选）
   * @param notifyUrl - 异步通知 URL（可选，动态覆盖）
   * @param outTradeNo - 外部传入的订单号（可选，不传则自动生成）
   * @returns API 响应
   */
  async callMapiApi(
    money: string,
    name: string,
    type: 'alipay' | 'wxpay',
    clientIp: string,
    device: 'pc' | 'mobile' = 'pc',
    param?: string,
    notifyUrl?: string,
    outTradeNo?: string
  ): Promise<ZPayMapiResponse> {
    const finalOutTradeNo = outTradeNo || generateOutTradeNo();
    
    const payParams: ZPayMapiRequestParams = {
      pid: this.config.pid,
      type,
      out_trade_no: finalOutTradeNo,
      notify_url: notifyUrl || this.config.notifyUrl,
      name,
      money,
      clientip: clientIp,
      device,
      param,
    };
    
    return callMapiApi(payParams, this.config.key);
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
   * 调用 API 接口支付（mapi.php），支持 returnUrl 参数
   * @param money - 金额
   * @param name - 商品名称
   * @param type - 支付类型
   * @param clientIp - 用户 IP 地址
   * @param device - 设备类型（pc 或 mobile）
   * @param param - 附加参数（可选）
   * @param notifyUrl - 异步通知 URL（可选，动态覆盖）
   * @param returnUrl - 支付成功后的跳转地址（可选，动态覆盖）
   * @param outTradeNo - 外部传入的订单号（可选，不传则自动生成）
   * @returns API 响应
   */
  async callMapiApiWithReturnUrl(
    money: string,
    name: string,
    type: 'alipay' | 'wxpay',
    clientIp: string,
    device: 'pc' | 'mobile' = 'pc',
    param?: string,
    notifyUrl?: string,
    returnUrl?: string,
    outTradeNo?: string
  ): Promise<ZPayMapiResponse> {
    const finalOutTradeNo = outTradeNo || generateOutTradeNo();
    
    const payParams: ZPayMapiRequestParams & { return_url?: string } = {
      pid: this.config.pid,
      type,
      out_trade_no: finalOutTradeNo,
      notify_url: notifyUrl || this.config.notifyUrl,
      return_url: returnUrl, // 使用传入的 returnUrl
      name,
      money,
      clientip: clientIp,
      device,
      param,
    };
    
    return callMapiApiWithReturnUrl(payParams, returnUrl || '', this.config.key);
  }

  /**
   * 获取配置
   */
  getConfig(): ZPayConfig {
    return this.config;
  }
}
