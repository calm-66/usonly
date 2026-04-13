import { NextRequest, NextResponse } from 'next/server'
import { deleteSessionToken } from '@/lib/auth'

/**
 * 登出 API - 删除 session token
 * 客户端调用此 API 后应清除 localStorage 中的 user 和 sessionToken
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (token) {
      await deleteSessionToken(token)
    }

    return NextResponse.json({
      success: true,
      message: '登出成功',
    })
  } catch (error) {
    console.error('登出失败:', error)
    // 即使删除 token 失败，也返回成功，因为客户端会清除本地数据
    return NextResponse.json({
      success: true,
      message: '登出成功',
    })
  }
}