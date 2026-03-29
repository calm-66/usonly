import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取收到的配对请求
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const requests = await prisma.pairRequest.findMany({
      where: {
        receiverId: userId,
        status: 'pending',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('获取配对请求错误:', error)
    return NextResponse.json(
      { error: '获取配对请求失败' },
      { status: 500 }
    )
  }
}

// 发送配对请求
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const { receiverId } = body

    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    if (!receiverId) {
      return NextResponse.json(
        { error: '请指定接收者' },
        { status: 400 }
      )
    }

    if (userId === receiverId) {
      return NextResponse.json(
        { error: '不能向自己发送请求' },
        { status: 400 }
      )
    }

    // 检查是否已有伴侣
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true },
    })

    if (sender?.partnerId) {
      return NextResponse.json(
        { error: '你已经有伴侣了' },
        { status: 400 }
      )
    }

    // 检查接收者是否已有伴侣
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { partnerId: true },
    })

    if (receiver?.partnerId) {
      return NextResponse.json(
        { error: '对方已有伴侣' },
        { status: 400 }
      )
    }

    // 检查是否已有请求
    const existingRequest = await prisma.pairRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: userId,
          receiverId,
        },
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: '已发送过请求，请勿重复发送' },
        { status: 400 }
      )
    }

    // 创建配对请求
    const pairRequest = await prisma.pairRequest.create({
      data: {
        senderId: userId,
        receiverId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    })

    // 创建通知记录，通知接收者有新的配对请求
    await prisma.notification.create({
      data: {
        receiverId: receiverId,
        senderId: userId,
        type: 'pair_request',
        content: `${pairRequest.sender.username} 向你发送了配对请求`,
      },
    })

    return NextResponse.json({
      message: '配对请求已发送',
      request: pairRequest,
    })
  } catch (error) {
    console.error('发送配对请求错误:', error)
    return NextResponse.json(
      { error: '发送配对请求失败' },
      { status: 500 }
    )
  }
}