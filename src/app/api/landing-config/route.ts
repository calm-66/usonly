import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 获取登录页配置
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    // 如果没有userId，返回空配置（使用默认背景图）
    if (!userId) {
      return NextResponse.json({ config: null })
    }

    // @ts-ignore - LandingConfig model not yet in generated Prisma client
    const config = await prisma.landingConfig.findUnique({
      where: { userId }
    })

    return NextResponse.json({ config })
  } catch (error) {
    console.error('获取登录页配置失败:', error)
    return NextResponse.json(
      { error: '获取配置失败' },
      { status: 500 }
    )
  }
}

// 更新登录页背景图
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { backgroundUrl } = body

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 使用 upsert 创建或更新配置
    // @ts-ignore - LandingConfig model not yet in generated Prisma client
    const config = await prisma.landingConfig.upsert({
      where: { userId },
      update: { backgroundUrl },
      create: {
        userId,
        backgroundUrl
      }
    })

    return NextResponse.json({ config })
  } catch (error) {
    console.error('更新登录页配置失败:', error)
    return NextResponse.json(
      { error: '更新配置失败' },
      { status: 500 }
    )
  }
}