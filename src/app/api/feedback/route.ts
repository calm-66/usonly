import { NextRequest, NextResponse } from 'next/server'

/**
 * 反馈 API - 接收用户反馈并通过 mailto 链接发送邮件
 * 
 * 注意：由于 Vercel Serverless 环境限制，此 API 返回反馈数据，
 * 前端收到成功后会触发 mailto 链接打开用户默认邮件客户端
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, content, userId, timestamp, userAgent } = body

    // 验证必填字段
    if (!type || !content) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 获取接收邮箱
    const contactEmail = process.env.CONTACT_EMAIL
    if (!contactEmail) {
      console.error('CONTACT_EMAIL 环境变量未配置')
      return NextResponse.json(
        { error: '服务器配置错误，请联系管理员' },
        { status: 500 }
      )
    }

    // 格式化反馈类型
    const typeMap: Record<string, string> = {
      suggestion: '💡 建议',
      bug: '🐛 Bug 报告',
      other: '📝 其他',
    }
    const formattedType = typeMap[type] || '📝 其他'

    // 构建邮件内容
    const subject = encodeURIComponent(`[UsOnly 反馈] ${formattedType}`)
    
    // 构建邮件正文
    let bodyText = `尊敬的开发者：

${content}

---
【用户信息】
用户 ID: ${userId || '未登录'}
提交时间：${timestamp || new Date().toISOString()}
设备信息：${userAgent || '未知'}

---
此邮件来自 UsOnly 应用反馈系统`

    const mailtoBody = encodeURIComponent(bodyText)

    // 返回 mailto 链接，前端将使用此链接打开邮件客户端
    return NextResponse.json({
      success: true,
      mailtoLink: `mailto:${contactEmail}?subject=${subject}&body=${mailtoBody}`,
      contactEmail,
    })
  } catch (error: any) {
    console.error('处理反馈失败:', error)
    return NextResponse.json(
      { error: error?.message || '发送失败，请稍后重试' },
      { status: 500 }
    )
  }
}