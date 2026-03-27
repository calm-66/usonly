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

// 硬编码主题列表（30 个主题）- 作为数据库主题不足时的后备
const HARDCODED_THEMES = [
  // 日常类 (0-14)
  { text: "此刻你在...", category: "daily" },
  { text: "今天的午餐", category: "daily" },
  { text: "窗外的风景", category: "daily" },
  { text: "此刻的心情", category: "daily" },
  { text: "今天的小确幸", category: "daily" },
  { text: "今天的工作/学习", category: "daily" },
  { text: "今天的穿搭", category: "daily" },
  { text: "此刻的天空", category: "daily" },
  { text: "今天听到的歌", category: "daily" },
  { text: "今天读到的一句话", category: "daily" },
  { text: "今天的运动", category: "daily" },
  { text: "此刻的桌面", category: "daily" },
  { text: "今天的晚餐", category: "daily" },
  { text: "今天的笑点", category: "daily" },
  { text: "今天买的东西", category: "daily" },
  // 回忆类 (15-19)
  { text: "今天想起我们的...", category: "memory" },
  { text: "想和你一起做的...", category: "memory" },
  { text: "我们的第一次...", category: "memory" },
  { text: "最喜欢的回忆", category: "memory" },
  { text: "想对你说的话", category: "memory" },
  // 趣味类 (20-29)
  { text: "如果现在在一起，我们会...", category: "fun" },
  { text: "猜猜对方此刻在...", category: "fun" },
  { text: "想和你去的城市", category: "fun" },
  { text: "今天的烦恼", category: "fun" },
  { text: "期待的事情", category: "fun" },
  { text: "此刻的音乐", category: "fun" },
  { text: "想推荐给你的...", category: "fun" },
  { text: "此刻的温度", category: "fun" },
  { text: "今天的宠物（如果有）", category: "fun" },
  { text: "自由主题（自拟）", category: "fun" },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const userId = searchParams.get('userId')
    const partnerId = searchParams.get('partnerId')

    // 获取所有活跃的主题
    const dbThemes = await prisma.theme.findMany({
      where: {
        isActive: true,
      },
    })

    // 使用数据库主题或硬编码主题（确保至少有 30 个主题可供选择）
    const themes = dbThemes.length >= 30 ? dbThemes : HARDCODED_THEMES

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