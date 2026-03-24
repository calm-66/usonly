import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 接受配对请求
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const { requestId } = body

    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    if (!requestId) {
      return NextResponse.json(
        { error: '请指定请求 ID' },
        { status: 400 }
      )
    }

    // 查找请求
    const pairRequest = await prisma.pairRequest.findUnique({
      where: { id: requestId },
    })

    if (!pairRequest) {
      return NextResponse.json(
        { error: '请求不存在' },
        { status: 404 }
      )
    }

    if (pairRequest.receiverId !== userId) {
      return NextResponse.json(
        { error: '无权操作此请求' },
        { status: 403 }
      )
    }

    if (pairRequest.status !== 'pending') {
      return NextResponse.json(
        { error: '请求已处理' },
        { status: 400 }
      )
    }

    // 检查是否已有伴侣
    const receiver = await prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true },
    })

    if (receiver?.partnerId) {
      return NextResponse.json(
        { error: '你已经有伴侣了' },
        { status: 400 }
      )
    }

    // 使用事务更新请求和用户关系
    await prisma.$transaction([
      // 更新请求状态
      prisma.pairRequest.update({
        where: { id: requestId },
        data: { status: 'accepted' },
      }),
      // 更新接收者的伴侣关系
      prisma.user.update({
        where: { id: userId },
        data: { partnerId: pairRequest.senderId },
      }),
      // 更新发送者的伴侣关系
      prisma.user.update({
        where: { id: pairRequest.senderId },
        data: { partnerId: userId },
      }),
    ])

    return NextResponse.json({
      message: '配对成功',
    })
  } catch (error) {
    console.error('接受配对请求错误:', error)
    return NextResponse.json(
      { error: '接受配对请求失败' },
      { status: 500 }
    )
  }
}