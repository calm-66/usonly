import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

/**
 * 生成加密安全的随机 token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * 获取 session token 的过期时间
 * @param days - 过期天数，默认 30 天
 */
function getExpiryDate(days: number = 30): Date {
  const now = new Date()
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}

/**
 * 创建新的 session token
 * @param userId - 用户 ID
 * @param expiresInDays - 过期天数
 */
export async function createSessionToken(
  userId: string,
  expiresInDays: number = 30
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken()
  const expiresAt = getExpiryDate(expiresInDays)

  await prisma.sessionToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

/**
 * 验证 session token 是否有效
 * @param token - token 字符串
 * @returns 验证结果，包含用户信息（如果有效）
 */
export async function validateSessionToken(
  token: string
): Promise<{ valid: boolean; user?: any }> {
  try {
    const session = await prisma.sessionToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            partnerId: true,
            pairedAt: true,
            breakupInitiated: true,
            breakupAt: true,
            partner: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                pairedAt: true,
                breakupInitiated: true,
                breakupAt: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      return { valid: false }
    }

    // 检查是否过期
    if (session.expiresAt < new Date()) {
      // 删除过期的 session
      await prisma.sessionToken.delete({
        where: { id: session.id },
      })
      return { valid: false }
    }

    // 更新 session 的过期时间（滑动过期）
    const newExpiryDate = getExpiryDate(30)
    await prisma.sessionToken.update({
      where: { id: session.id },
      data: { expiresAt: newExpiryDate },
    })

    return {
      valid: true,
      user: session.user,
    }
  } catch (error) {
    return { valid: false }
  }
}

/**
 * 删除 session token（用于登出）
 * @param token - token 字符串
 */
export async function deleteSessionToken(token: string): Promise<void> {
  try {
    await prisma.sessionToken.delete({
      where: { token },
    })
  } catch (error) {
    // 忽略错误，因为 token 可能已经不存在了
  }
}

/**
 * 清理所有过期的 session tokens
 * 可以定期调用（例如每天）来清理数据库
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await prisma.sessionToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  } catch (error) {
  }
}

/**
 * 获取用户的活跃 session 数量
 * @param userId - 用户 ID
 */
export async function getUserActiveSessionsCount(userId: string): Promise<number> {
  try {
    const count = await prisma.sessionToken.count({
      where: {
        userId,
        expiresAt: {
          gte: new Date(),
        },
      },
    })
    return count
  } catch (error) {
    return 0
  }
}