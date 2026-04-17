/**
 * 从请求头获取客户端真实 IP 地址
 * 
 * 优先级：
 * 1. x-forwarded-for (可能有多个 IP，取第一个)
 * 2. x-real-ip
 * 3. undefined (在 Vercel 等代理后面，直接获取可能不准确)
 * 
 * @param request - Next.js Request 对象
 * @returns 客户端 IP 地址或 undefined
 */
export function getClientIP(request: Request): string | undefined {
  const headers = request.headers;
  
  // 检查 x-forwarded-for (可能有多个 IP，取第一个)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',');
    const clientIp = ips[0]?.trim();
    if (clientIp) return clientIp;
  }
  
  // 检查 x-real-ip
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  return undefined;
}