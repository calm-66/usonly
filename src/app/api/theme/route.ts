import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 简单的哈希函数（用于根据日期和伴侣 ID 生成一致的索引）
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const userId = searchParams.get('userId')
    const partnerId = searchParams.get('partnerId')

    // 获取所有活跃的主题
    const themes = await prisma.theme.findMany({
      where: {
        isActive: true,
      },
    })

    if (themes.length === 0) {
      return NextResponse.json({
        theme: {
          text: '分享你的今日心情',
          category: 'daily',
        },
      })
    }

    let themeIndex = 0

    // 如果有伴侣，使用日期 + 伴侣 ID 的哈希值来选择主题
    // 这样同一对伴侣在同一天会获得相同的主题
    if (partnerId) {
      // 使用较小的 ID 在前，确保双方计算结果一致
      const ids = [userId || '', partnerId].sort()
      const hashInput = `${date}-${ids[0]}-${ids[1]}`
      const hash = simpleHash(hashInput)
      themeIndex = hash % themes.length
    } else {
      // 没有伴侣，使用日期哈希
      const hash = simpleHash(date)
      themeIndex = hash % themes.length
    }

    return NextResponse.json({
      theme: themes[themeIndex],
    })
  } catch (error) {
    console.error('获取主题失败:', error)
    return NextResponse.json(
      { error: '获取主题失败' },
      { status: 500 }
    )
  }
}