import { NextRequest, NextResponse } from 'next/server'

/**
 * Monitor 数据转发 API
 * 
 * 功能：将客户端数据转发到 Monitor 平台，避免在客户端暴露 API Key
 * 
 * 环境变量配置（服务器端，不带 NEXT_PUBLIC_）：
 * - MONITOR_PREVIEW_API_KEY: Preview 环境 API Key
 * - MONITOR_PRODUCTION_API_KEY: Production 环境 API Key
 * - MONITOR_PREVIEW_PROJECT_ID: Preview 环境 Project ID
 * - MONITOR_PRODUCTION_PROJECT_ID: Production 环境 Project ID
 * - MONITOR_ENDPOINT: Monitor API 端点
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 从服务器端环境变量获取配置（不暴露给客户端）
    const isPreview = process.env.VERCEL_ENV === 'preview'
    const apiKey = isPreview
      ? process.env.MONITOR_PREVIEW_API_KEY
      : process.env.MONITOR_PRODUCTION_API_KEY
    const projectId = isPreview
      ? process.env.MONITOR_PREVIEW_PROJECT_ID
      : process.env.MONITOR_PRODUCTION_PROJECT_ID
    const endpoint = process.env.MONITOR_ENDPOINT

    // 验证配置
    if (!apiKey || !projectId || !endpoint) {
      console.error('[Monitor] Missing configuration:', {
        hasApiKey: !!apiKey,
        hasProjectId: !!projectId,
        hasEndpoint: !!endpoint,
      })
      return NextResponse.json(
        { error: 'Monitor configuration error' },
        { status: 500 }
      )
    }

    // 转发到 Monitor
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Project-ID': projectId,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Monitor] Forward error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to forward to Monitor' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Monitor] Forwarding error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 支持 OPTIONS 预检请求（CORS）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}