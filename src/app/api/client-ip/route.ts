import { NextRequest, NextResponse } from 'next/server';

/**
 * 获取客户端真实 IP 地址
 * 
 * 优先级：
 * 1. x-forwarded-for (可能有多个 IP，取第一个)
 * 2. x-real-ip
 * 3. 直接连接的 IP（可能不准确，在 Vercel 等代理后面）
 */
export async function GET(request: NextRequest) {
  // 检查 x-forwarded-for (可能有多个 IP，取第一个)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',');
    const clientIp = ips[0]?.trim() || null;
    if (clientIp) {
      return NextResponse.json({ ip: clientIp, source: 'x-forwarded-for' });
    }
  }
  
  // 检查 x-real-ip
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return NextResponse.json({ ip: realIp.trim(), source: 'x-real-ip' });
  }
  
  // 尝试从 socket 获取（在 Vercel 上可能不可用）
  const socketIp = (request as any).socket?.remoteAddress;
  if (socketIp) {
    return NextResponse.json({ ip: socketIp, source: 'socket' });
  }
  
  return NextResponse.json({ ip: null, source: 'unknown' });
}