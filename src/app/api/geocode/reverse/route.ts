import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json(
      { error: '缺少经纬度参数' },
      { status: 400 }
    )
  }

  const ak = process.env.BAIDU_MAP_AK
  if (!ak) {
    console.error('[百度地图] 未找到 BAIDU_MAP_AK 环境变量')
    return NextResponse.json(
      { error: '服务器配置错误' },
      { status: 500 }
    )
  }

  try {
    // 百度地图逆地理编码 API
    const url = `https://api.map.baidu.com/reverse_geocoding/v3/?ak=${ak}&output=json&coordtype=wgs84ll&location=${lat},${lon}`
    
    console.log('[百度地图] 请求 URL:', url)
    
    const response = await fetch(url, {
      method: 'GET',
    })

    const data = await response.json()
    
    console.log('[百度地图] 响应数据:', data)

    if (data.status !== 0) {
      console.error('[百度地图] API 错误:', data.message)
      return NextResponse.json(
        { address: '我的位置', raw: data },
        { status: response.status }
      )
    }

    // 解析地址
    const result = data.result
    const addressComponent = result.addressComponent
    
    // 构建中文地址：省 + 市 + 区 + 街道
    const parts: string[] = []
    
    if (addressComponent.province) {
      parts.push(addressComponent.province)
    }
    if (addressComponent.city && addressComponent.city !== addressComponent.province) {
      parts.push(addressComponent.city)
    }
    if (addressComponent.district && addressComponent.district !== addressComponent.city) {
      parts.push(addressComponent.district)
    }
    if (addressComponent.town && addressComponent.town !== addressComponent.district) {
      parts.push(addressComponent.town)
    }
    if (addressComponent.street) {
      parts.push(addressComponent.street)
    }

    const address = parts.join(' ') || result.formatted_address || '我的位置'
    
    console.log('[百度地图] 解析地址:', address)

    return NextResponse.json({
      address,
      raw: data
    })
  } catch (error: any) {
    console.error('[百度地图] 请求失败:', error.message)
    return NextResponse.json(
      { error: '地址解析失败', message: error.message },
      { status: 500 }
    )
  }
}