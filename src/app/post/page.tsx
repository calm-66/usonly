'use client'

import { useState, useEffect, useRef } from 'react'
import { uploadImage, validateImageFile } from '@/lib/imageUpload'

interface Post {
  id: string
  date: string
  title: string | null
  imageUrl: string | null
  text: string | null
  isLatePost: boolean
  latitude?: number | null
  longitude?: number | null
  location?: string | null
}

interface User {
  id: string
  username: string
  email: string
  partnerId: string | null
  partner?: {
    id: string
    username: string
    email: string
  } | null
}

export default function PostPage() {
  const [user, setUser] = useState<User | null>(null)
  const [date, setDate] = useState('')
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [text, setText] = useState('')
  const [isLatePost, setIsLatePost] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 位置相关状态
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [location, setLocation] = useState<string>('')
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      // 默认日期为今天
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
      loadPosts(parsedUser)
    } else {
      window.location.href = '/'
    }
  }, [])

  const loadPosts = async (userData: User) => {
    try {
      const res = await fetch('/api/post', {
        headers: { 'x-user-id': userData.id },
      })
      const data = await res.json()
      if (data.posts) {
        setPosts(data.posts)
      }
    } catch (err) {
      console.error('加载分享失败:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
        body: JSON.stringify({
          date,
          title: title || null,
          imageUrl: imageUrl || null,
          text: text || null,
          isLatePost,
          latitude: latitude || null,
          longitude: longitude || null,
          location: location || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '发布失败')
      }
      setMessage('分享成功！')
      // 重置表单
      setImageUrl('')
      setText('')
      setIsLatePost(false)
      setLatitude(null)
      setLongitude(null)
      setLocation('')
      setShowLocationInput(false)
      // 重新加载分享列表
      loadPosts(user!)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('确定要删除这条分享吗？')) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch(`/api/post?id=${postId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user!.id,
        },
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '删除失败')
      }
      setMessage('删除成功！')
      loadPosts(user!)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setDate(newDate)
    const isToday = newDate === new Date().toISOString().split('T')[0]
    setIsLatePost(!isToday)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error!)
      return
    }

    setSelectedFile(file)
    setUploading(true)
    setError('')

    try {
      // 创建预览 URL
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string)
      }
      reader.readAsDataURL(file)

      // 上传图片
      const imageUrl = await uploadImage(file)
      setImageUrl(imageUrl)
      setMessage('图片上传成功！')
    } catch (err: any) {
      setError(err.message || '图片上传失败')
      setSelectedFile(null)
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setImageUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 反向地理编码：将经纬度转换为实际地址
  const fetchAddressFromCoords = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh-CN&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'zh-CN'
          }
        }
      )
      const data = await response.json()
      
      console.log('=== Nominatim API 响应 ===')
      console.log('完整数据:', data)
      console.log('address 对象:', data.address)
      
      // 构建中文地址：市 + 区 + 街道
      const address = data.address
      const parts: string[] = []
      
      console.log('--- 地址解析过程 ---')
      console.log('city:', address?.city)
      console.log('town:', address?.town)
      console.log('village:', address?.village)
      console.log('state:', address?.state)
      console.log('district:', address?.district)
      console.log('suburb:', address?.suburb)
      console.log('county:', address?.county)
      console.log('road:', address?.road)
      
      // 添加省级/市级信息
      if (address?.state) {
        console.log('添加 state:', address.state)
        parts.push(address.state)
      }
      
      // 添加城市/区级信息（如果是区则添加）
      if (address?.city && address.city !== address.state) {
        console.log('添加 city:', address.city)
        parts.push(address.city)
      } else if (address?.town) {
        console.log('添加 town:', address.town)
        parts.push(address.town)
      } else if (address?.village) {
        console.log('添加 village:', address.village)
        parts.push(address.village)
      }
      
      // 添加区县/街道信息（避免与 state 重复）
      if (address?.suburb && address.suburb !== address.state && address.suburb !== address.city) {
        console.log('添加 suburb:', address.suburb)
        parts.push(address.suburb)
      }
      if (address?.district && address.district !== address.state && address.district !== address.city) {
        console.log('添加 district:', address.district)
        parts.push(address.district)
      }
      if (address?.county && address.county !== address.state && address.county !== address.city) {
        console.log('添加 county:', address.county)
        parts.push(address.county)
      }
      
      // 添加道路信息
      if (address?.road) {
        console.log('添加 road:', address.road)
        parts.push(address.road)
      }
      
      // 组合地址
      let addressString = parts.join(' ')
      console.log('最终地址 parts:', parts)
      console.log('最终地址字符串:', addressString)
      console.log('=== 地址解析结束 ===')
      
      // 如果解析失败，使用默认名称
      if (!addressString) {
        addressString = data.display_name || '我的位置'
      }
      
      return addressString
    } catch (err) {
      console.error('地址解析失败:', err)
      return '我的位置'
    }
  }

  // 获取当前位置
  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('浏览器不支持地理定位')
      return
    }

    setGettingLocation(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        setLatitude(lat)
        setLongitude(lon)
        
        // 获取实际地址
        const address = await fetchAddressFromCoords(lat, lon)
        setLocation(address)
        setShowLocationInput(true)
        setGettingLocation(false)
        setMessage(`已获取位置：${address}`)
      },
      (error) => {
        setGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('用户拒绝了定位请求')
            break
          case error.POSITION_UNAVAILABLE:
            setError('位置信息不可用')
            break
          case error.TIMEOUT:
            setError('定位超时，请重试')
            break
          default:
            setError('定位失败')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const handleClearLocation = () => {
    setLatitude(null)
    setLongitude(null)
    setLocation('')
    setShowLocationInput(false)
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="text-center text-gray-600">加载中...</div>
      </main>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">发布分享</h1>
          <a href="/timeline" className="text-gray-600 hover:text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* 消息提示 */}
        {message && (
          <div className="mb-4 text-green-500 text-sm bg-green-50 p-3 rounded-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 发布表单 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期
              </label>
              <input
                type="date"
                value={date}
                onChange={handleDateChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              {date !== today && (
                <p className="text-xs text-gray-500 mt-1">补传 {date} 的分享</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题（可选）
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                图片（可选）
              </label>
              <div className="space-y-2">
                {/* 上传按钮和预览区域 */}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        上传中...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        选择图片
                      </>
                    )}
                  </button>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      移除
                    </button>
                  )}
                </div>

                {/* 图片预览 */}
                {previewUrl && (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="预览"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {/* 提示文字 */}
                <p className="text-xs text-gray-500">
                  支持 JPG、PNG、GIF、WebP 格式，最大 5MB
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                文字内容（可选）
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="写下你想说的..."
              />
            </div>

            {/* 位置选择器 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                位置（可选）
              </label>
              {!showLocationInput ? (
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={gettingLocation}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-pink-500 hover:text-pink-500 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {gettingLocation ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      获取位置中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      获取当前位置
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="输入位置名称（如：公司、家）"
                    />
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="text-red-500 hover:text-red-700 text-sm px-2"
                    >
                      清除
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    坐标：{latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50"
            >
              {loading ? '发布中...' : '发布分享'}
            </button>
          </form>
        </div>

        {/* 今日分享列表 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">今日分享</h2>
          {posts.filter(p => p.date === today).length === 0 ? (
            <p className="text-center text-gray-500 py-4">今日还没有分享</p>
          ) : (
            <div className="space-y-3">
              {posts.filter(p => p.date === today).map((post) => (
                <div
                  key={post.id}
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    {post.title && (
                      <span className="text-sm font-medium text-gray-700">{post.title}</span>
                    )}
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      删除
                    </button>
                  </div>
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="分享图片"
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                  )}
                  {post.text && (
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{post.text}</p>
                  )}
                  {post.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {post.location}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 底部导航 - 3 个按钮：时间轴、足迹、我的 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-2xl mx-auto flex">
          <a href="/timeline" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">时间轴</span>
          </a>
          <a href="/map" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">足迹</span>
          </a>
          <a href="/profile" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">我的</span>
          </a>
        </div>
      </nav>
    </main>
  )
}