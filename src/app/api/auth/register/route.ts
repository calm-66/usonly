import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { trackLogin } from '@/lib/monitor'
import { getClientIP } from '@/lib/clientIp'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password, inviteCode } = body

    // 验证必填字段
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: '用户名、邮箱和密码为必填项' },
        { status: 400 }
      )
    }

    // 检查用户名是否已被使用
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUsername) {
      return NextResponse.json(
        { error: '该用户名已被使用' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已注册
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      )
    }

    // 如果提供了邀请码，验证邀请码是否有效
    let inviter: any = null
    if (inviteCode && inviteCode.trim()) {
      inviter = await prisma.user.findUnique({
        where: { inviteCode: inviteCode.trim() },
      })
      
      if (!inviter) {
        return NextResponse.json(
          { error: '无效的邀请码' },
          { status: 400 }
        )
      }
      
      // 检查邀请者是否已有伴侣
      if (inviter.partnerId) {
        return NextResponse.json(
          { error: '该邀请码的主人已有伴侣' },
          { status: 400 }
        )
      }
    }

    // 生成专属邀请码
    const userInviteCode = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()

    // 创建用户
    const userData: any = {
      username,
      email,
      password,
      inviteCode: userInviteCode,
    }

    // 如果有邀请码，自动建立配对关系
    if (inviter) {
      userData.partnerId = inviter.id
    }

    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        username: true,
        email: true,
        inviteCode: true,
        avatarUrl: true,
        partnerId: true,
      },
    })

    // 如果是通过邀请码注册的，更新邀请者的 partnerId 并设置配对时间
    if (inviter) {
      await prisma.user.update({
        where: { id: inviter.id },
        data: {
          partnerId: user.id,
          pairedAt: new Date(),
        },
      })
      
      // 同时更新新用户的 pairedAt
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pairedAt: new Date(),
        },
      })
    }

    // 获取客户端 IP 并上报登录事件到 Monitor（用于 Active Users 统计）
    const clientIP = getClientIP(request);
    trackLogin(user.id, user.username, clientIP)

    return NextResponse.json({
      message: '注册成功',
      user,
      // 返回是否有伴侣（通过邀请码注册时已有伴侣）
      hasPartner: !!inviter,
    })
  } catch (error) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}
