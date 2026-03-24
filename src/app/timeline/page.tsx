'use client'

import { useState, useEffect } from 'react'

interface Post {
  id: string
  date: string
  theme: string
  imageUrl: string | null
  text: string | null
  isLatePost: boolean
  createdAt: string
  owner: '我' | 'TA'
}

interface DayPosts {
  date: string
  theme: string
  myPosts: Post[]
  partnerPosts: Post[]
}

interface User {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  partnerId: string | null
  partner?: {
    id: string
    username: string
    email: string
    avatarUrl: string | null
  } | null
}

export default function TimelinePage() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [partnerPosts, setPartnerPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'mine' | 'partner' | 'both'>('both')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // 生成默认头像颜色（根据用户 ID 哈希）
  const getDefaultAvatarColor = (id: string): string => {
    const colors = [
      'from-pink-400 to-pink-500',
      'from-purple-400 to-purple-500',
      'from-blue-400 to-blue-500',
      'from-green-400 to-green-500',
      'from-yellow-400 to-yellow-500',
      'from-red-400 to-red-500',
      'from-indigo-400 to-indigo-500',
      'from-teal-400 to-teal-500',
    ]
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i)
      hash = hash & hash
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // 获取首字母
  const getInitial = (str: string): string => {
    return str.charAt(0).toUpperCase()
  }

  // 格式化时间显示 HH:MM
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 渲染头像组件
  const renderAvatar = (avatarUrl: string | null, name: string, size: string = 'w-8 h-8') => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className={`${size} rounded-full object-cover border border-gray-200`}
        />
      )
    }
    const color = getDefaultAvatarColor(name)
    return (
      <div className={`${size} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold`}>
        {getInitial(name)}
      </div>
    )
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      loadPosts(parsedUser)
    }
  }, [])

  const loadPosts = async (userData: User) => {
    try {
      setLoading(true)
      const [myRes, partnerRes] = await Promise.all([
        fetch('/api/post', {
          headers: { 'x-user-id': userData.id },
        }),
        userData.partnerId
          ? fetch(`/api/post?partnerId=${userData.partnerId}`, {
              headers: { 'x-user-id': userData.id },
            })
          : Promise.resolve(null),
      ])

      const myData = await myRes.json()
      if (myData.posts) setPosts(myData.posts)

      if (partnerRes) {
        const partnerData = await partnerRes.json()
        if (partnerData.posts) setPartnerPosts(partnerData.posts)
      }
    } catch (error) {
      console.error('加载分享失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 按日期分组
  const groupByDate = (): DayPosts[] => {
    const allPosts = [
      ...posts.map(p => ({ ...p, owner: '我' as const })),
      ...partnerPosts.map(p => ({ ...p, owner: 'TA' as const })),
    ]

    // 按日期分组
    const grouped: Record<string, { myPosts: Post[]; partnerPosts: Post[]; theme: string }> = {}
    
    allPosts.forEach(post => {
      if (!grouped[post.date]) {
        grouped[post.date] = { myPosts: [], partnerPosts: [], theme: post.theme }
      }
      if (post.owner === '我') {
        grouped[post.date].myPosts.push(post)
      } else {
        grouped[post.date].partnerPosts.push(post)
      }
    })

    // 转换为数组并按日期排序
    return Object.entries(grouped)
      .map(([date, data]) => ({
        date,
        theme: data.theme,
        myPosts: data.myPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        partnerPosts: data.partnerPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const getDisplayPosts = () => {
    if (activeTab === 'mine') return posts.map(p => ({ ...p, owner: '我' as const }))
    if (activeTab === 'partner') return partnerPosts.map(p => ({ ...p, owner: 'TA' as const }))
    return []
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  // 处理 ESC 键关闭图片
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null)
      }
    }
    if (selectedImage) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [selectedImage])

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">加载中...</p>
          <a href="/" className="text-pink-600 hover:underline">返回首页</a>
        </div>
      </main>
    )
  }

  const dayPosts = groupByDate()
  const displayPosts = getDisplayPosts()

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) {
      return '今天'
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return '昨天'
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">UsOnly</h1>
          <div className="flex gap-4">
            <a href="/post" className="text-pink-600 hover:text-pink-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </a>
            <button onClick={handleLogout} className="text-gray-600 hover:text-gray-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 标签页 */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex bg-white rounded-lg shadow-sm p-1">
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              activeTab === 'mine' ? 'bg-pink-100 text-pink-600' : 'text-gray-500'
            }`}
          >
            我的
          </button>
          <button
            onClick={() => setActiveTab('both')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              activeTab === 'both' ? 'bg-pink-100 text-pink-600' : 'text-gray-500'
            }`}
          >
            我们的
          </button>
          <button
            onClick={() => setActiveTab('partner')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              activeTab === 'partner' ? 'bg-pink-100 text-pink-600' : 'text-gray-500'
            }`}
          >
            TA 的
          </button>
        </div>
      </div>

      {/* 图片放大查看模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full">
            <button
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-3xl font-bold"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt="放大图片"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* 时间轴 */}
      <div className="max-w-3xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : activeTab !== 'both' ? (
          /* 单列模式 */
          <div className="space-y-4">
            {displayPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>还没有分享</p>
                <a href="/post" className="text-pink-600 hover:underline">去发布第一条</a>
              </div>
            ) : (
              displayPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-gray-400">
                          {new Date(post.date).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{formatTime(post.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">主题：{post.theme}</p>
                    {post.imageUrl && (
                      <div className="mb-3">
                        <img
                          src={post.imageUrl}
                          alt={post.theme}
                          className="w-full h-48 object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition"
                          onClick={() => setSelectedImage(post.imageUrl!)}
                        />
                      </div>
                    )}
                    {post.text && (
                      <p className="text-gray-700 whitespace-pre-wrap">{post.text}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* 并排模式 */
          <div className="space-y-4">
            {dayPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>还没有分享</p>
                <a href="/post" className="text-pink-600 hover:underline">去发布第一条</a>
              </div>
            ) : (
              dayPosts.map((day) => (
                <div
                  key={day.date}
                  className="bg-white rounded-xl shadow-sm overflow-hidden"
                >
                  {/* 日期和主题头部 */}
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-800">
                          {formatDate(day.date)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({new Date(day.date).toLocaleDateString('zh-CN')})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-600">{day.theme}</span>
                      </div>
                    </div>
                  </div>

                  {/* 并排内容 */}
                  <div className="p-4">
                    <div className="flex gap-4">
                      {/* 我的分享列 */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          {renderAvatar(user.avatarUrl, user.username, 'w-8 h-8')}
                          <span className="text-sm font-medium text-pink-600">{user.username}</span>
                        </div>
                        {day.myPosts.length === 0 ? (
                          <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-lg">
                            暂无分享
                          </div>
                        ) : (
                          day.myPosts.map((post) => (
                            <div
                              key={post.id}
                              className="bg-pink-50 rounded-lg p-3 border border-pink-100"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-500">{formatTime(post.createdAt)}</span>
                              </div>
                              {post.imageUrl && (
                                <div className="mb-2">
                                  <img
                                    src={post.imageUrl}
                                    alt={post.theme}
                                    className="w-full h-32 object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition"
                                    onClick={() => setSelectedImage(post.imageUrl!)}
                                  />
                                </div>
                              )}
                              {post.text && (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.text}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* 分隔线 */}
                      <div className="w-px bg-gradient-to-b from-pink-200 via-purple-200 to-pink-200" />

                      {/* TA 的分享列 */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          {renderAvatar(user.partner?.avatarUrl || null, user.partner?.username || 'TA', 'w-8 h-8')}
                          <span className="text-sm font-medium text-purple-600">
                            {user.partner?.username || 'TA'}
                          </span>
                        </div>
                        {day.partnerPosts.length === 0 ? (
                          <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-lg">
                            暂无分享
                          </div>
                        ) : (
                          day.partnerPosts.map((post) => (
                            <div
                              key={post.id}
                              className="bg-purple-50 rounded-lg p-3 border border-purple-100"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-500">{formatTime(post.createdAt)}</span>
                              </div>
                              {post.imageUrl && (
                                <div className="mb-2">
                                  <img
                                    src={post.imageUrl}
                                    alt={post.theme}
                                    className="w-full h-32 object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition"
                                    onClick={() => setSelectedImage(post.imageUrl!)}
                                  />
                                </div>
                              )}
                              {post.text && (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.text}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-3xl mx-auto flex">
          <a href="/timeline" className="flex-1 py-3 text-center text-pink-600">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">时间轴</span>
          </a>
          <a href="/post" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs">发布</span>
          </a>
          <a href="/pair" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs">配对</span>
          </a>
          <a href="/" className="flex-1 py-3 text-center text-gray-500">
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