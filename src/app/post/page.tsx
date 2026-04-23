'use client'

import { useState, useEffect, useRef } from 'react'
import ImageUploader from '@/components/ImageUploader'
import PhotoLayoutEditor, { LayoutConfig } from '@/components/PhotoLayoutEditor'
import { MAX_POST_IMAGES } from '@/lib/constants'

interface Post {
  id: string
  date: string
  title: string | null
  imageUrls: string[] | null
  text: string | null
  latitude?: number | null
  longitude?: number | null
  location?: string | null
  layoutConfig?: any | null
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
  const [imageUrls, setImageUrls] = useState<string[] | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  // 位置相关状态
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [location, setLocation] = useState<string>('')
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  console.log('[PostPage] 组件渲染开始')

  useEffect(() => {
    console.log('[PostPage] useEffect 开始执行')
    try {
      const userData = localStorage.getItem('user')
      console.log('[PostPage] localStorage user:', userData)
      if (userData) {
        const parsedUser = JSON.parse(userData)
        console.log('[PostPage] 解析用户成功:', parsedUser)
        setUser(parsedUser)
        // 固定日期为今天
        const today = new Date().toISOString().split('T')[0]
        console.log('[PostPage] 设置日期:', today)
        setDate(today)
        loadPosts(parsedUser)
      } else {
        console.log('[PostPage] 未找到用户，跳转到首页')
        window.location.href = '/'
      }
    } catch (err) {
      console.error('[PostPage] useEffect 错误:', err)
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
          imageUrls: imageUrls || [],
          layoutConfig: layoutConfig || null,
          text: text || null,
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
      // 跳转到时间轴页面
      window.location.href = '/timeline'
      // 重置表单
      setImageUrls(null)
      setLayoutConfig(null)
      setText('')
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

  // 反向地理编码：将经纬度转换为实际地址（使用百度地图 API）
  const fetchAddressFromCoords = async (lat: number, lon: number): Promise<string> => {
    try {
      // 调用本地 API Route，由服务端请求百度地图
      const url = `/api/geocode/reverse?lat=${lat}&lon=${lon}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        return '我的位置'
      }
      
      const data = await response.json()
      
      if (data.error) {
        return '我的位置'
      }
      
      const address = data.address
      
      return address
    } catch (err: any) {
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
        
        let errorMessage = ''
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '定位被拒绝，请在浏览器设置中允许定位权限'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置信息不可用，请检查网络连接'
            break
          case error.TIMEOUT:
            errorMessage = '定位超时，请重试'
            break
          default:
            errorMessage = '定位失败'
        }
        
        setError(errorMessage)
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
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-gray-500">加载中...</div>
      </main>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[500px] mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-900">发布分享</h1>
          <a href="/timeline" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>
      </header>

      <div className="max-w-[500px] mx-auto px-4 py-4">
        {/* 消息提示 */}
        {message && (
          <div className="mb-4 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* 发布表单 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期
              </label>
              <div className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                {today}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题
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
                 图片
               </label>
               <ImageUploader
                 value={imageUrls}
                 onChange={setImageUrls}
                 previewSize="w-full h-48"
                 placeholder="选择图片"
                 accept="image/*"
                 maxCount={MAX_POST_IMAGES}
               />
             </div>

             {/* 照片排版编辑器 */}
             {imageUrls && imageUrls.length > 0 && (
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   照片排版
                 </label>
                 <PhotoLayoutEditor
                   imageUrls={imageUrls}
                   onChange={setLayoutConfig}
                 />
               </div>
             )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                文字内容
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
                位置
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
                    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="w-full py-3 px-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition disabled:opacity-50"
            >
              {loading ? '发布中...' : '发布分享'}
            </button>
          </form>
        </div>

        {/* 今日分享列表 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-base font-bold text-gray-900 mb-3">今日分享</h2>
          {posts.filter(p => p.date === today).length === 0 ? (
            <p className="text-center text-gray-500 py-4">今日还没有分享</p>
          ) : (
            <div className="space-y-3">
              {posts.filter(p => p.date === today).map((post) => (
                <div
                  key={post.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100"
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
                  {post.imageUrls && post.imageUrls.length > 0 && (
                    <div className="mb-2">
                      {post.imageUrls.length === 1 ? (
                        <img
                          src={post.imageUrls[0]}
                          alt="分享图片"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden bg-gray-200">
                          <img
                            src={post.imageUrls[0]}
                            alt="分享图片"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                            {post.imageUrls.length} 张
                          </div>
                        </div>
                      )}
                    </div>
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-[500px] mx-auto flex">
          <a href="/timeline" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px]">时间轴</span>
          </a>
          <a href="/map" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px]">足迹</span>
          </a>
          <a href="/profile" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px]">我的</span>
          </a>
        </div>
      </nav>
    </main>
  )
}