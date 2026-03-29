'use client'

import { useState, useEffect, use } from 'react'

interface Post {
  id: string
  userId: string
  date: string
  title: string | null
  imageUrl: string | null
  text: string | null
  isLatePost: boolean
  createdAt: string
  owner: '我' | 'TA'
}

interface DayPosts {
  date: string
  title: string | null
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
  archivedPartnerId?: string | null
}

interface ArchiveInfo {
  partnerId: string
  partnerUsername: string
  partnerAvatarUrl: string | null
  archivedAt: string
  postCount: number
}

export default function ArchivePage({ searchParams }: { searchParams: Promise<{ partnerId: string }> }) {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [partnerPosts, setPartnerPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [archiveInfo, setArchiveInfo] = useState<ArchiveInfo | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // 从 URL 参数获取 partnerId
  const [partnerId, setPartnerId] = useState<string>('')

  useEffect(() => {
    searchParams.then(params => {
      if (params?.partnerId) {
        setPartnerId(params.partnerId)
      }
    })
  }, [searchParams])

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

  // 格式化时间显示 HH:MM
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    }
  }, [])

  useEffect(() => {
    if (!partnerId || !user) return

    const loadArchiveData = async () => {
      try {
        setLoading(true)
        
        // 加载归档数据
        const [myRes, partnerRes] = await Promise.all([
          fetch(`/api/archive?userId=${user.id}&partnerId=${partnerId}`, {
            headers: { 'x-user-id': user.id },
          }),
          fetch(`/api/archive?userId=${partnerId}&partnerId=${user.id}`, {
            headers: { 'x-user-id': user.id },
          }),
        ])

        const myData = await myRes.json()
        const partnerData = await partnerRes.json()

        if (myData.posts) {
          const postsWithOwner = myData.posts.map((p: Post) => ({ ...p, owner: '我' as const }))
          setPosts(postsWithOwner)
        }

        if (partnerData.posts) {
          const postsWithOwner = partnerData.posts.map((p: Post) => ({ ...p, owner: 'TA' as const }))
          setPartnerPosts(postsWithOwner)
        }

        // 设置归档信息
        if (myData.archivedInfo) {
          setArchiveInfo(myData.archivedInfo)
        } else if (partnerData.archivedInfo) {
          setArchiveInfo(partnerData.archivedInfo)
        }
      } catch (error) {
        console.error('加载归档数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadArchiveData()
  }, [partnerId, user])

  // 按日期分组
  const groupByDate = (): DayPosts[] => {
    const allPosts = [
      ...posts.map(p => ({ ...p, owner: '我' as const })),
      ...partnerPosts.map(p => ({ ...p, owner: 'TA' as const })),
    ]

    const grouped: Record<string, { myPosts: Post[]; partnerPosts: Post[]; title: string | null }> = {}
    
    allPosts.forEach(post => {
      if (!grouped[post.date]) {
        grouped[post.date] = { myPosts: [], partnerPosts: [], title: post.title }
      }
      if (post.owner === '我') {
        grouped[post.date].myPosts.push(post)
      } else {
        grouped[post.date].partnerPosts.push(post)
      }
    })

    return Object.entries(grouped)
      .map(([date, data]) => ({
        date,
        title: data.title,
        myPosts: data.myPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        partnerPosts: data.partnerPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const handleDeleteArchive = async () => {
    if (!partnerId) return

    try {
      setDeleting(true)
      const res = await fetch(`/api/archive/delete?partnerId=${partnerId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user!.id,
        },
      })

      const data = await res.json()
      if (data.success) {
        alert('已永久删除归档数据')
        window.location.href = '/profile'
      } else {
        alert('删除失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('删除归档数据失败:', error)
      alert('删除失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    if (dateStr === todayStr) {
      return '今天'
    } else if (dateStr === yesterdayStr) {
      return '昨天'
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
    }
  }

  const dayPosts = groupByDate()

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <p className="text-gray-600">加载中...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 pb-8">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/profile" className="text-gray-600 hover:text-gray-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">归档回忆</h1>
          <div className="w-5" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* 归档信息卡片 */}
        {archiveInfo && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              {renderAvatar(archiveInfo.partnerAvatarUrl, archiveInfo.partnerUsername, 'w-10 h-10')}
              <div className="flex-1">
                <p className="font-medium text-gray-800">{archiveInfo.partnerUsername}</p>
                <p className="text-xs text-gray-500">
                  归档时间：{new Date(archiveInfo.archivedAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
              <span>共 {posts.length + partnerPosts.length} 条分享</span>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
            >
              {deleting ? '删除中...' : '永久删除归档'}
            </button>
          </div>
        )}

        {/* 时间轴 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : dayPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无归档内容</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayPosts.map((day) => (
              <div key={day.date} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* 日期头部 */}
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-800">
                      {formatDate(day.date)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({new Date(day.date).toLocaleDateString('zh-CN')})
                    </span>
                  </div>
                </div>

                {/* 并排内容 */}
                <div className="p-4">
                  <div className="flex gap-4">
                    {/* 我的分享列 */}
                    <div className="flex-1 space-y-3 min-w-0">
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
                          <div key={post.id} className="bg-pink-50 rounded-lg p-3 border border-pink-100">
                            <div className="flex justify-between items-start mb-2">
                              {post.title && (
                                <span className="text-sm font-medium text-gray-700">{post.title}</span>
                              )}
                              <span className="text-xs text-gray-500">{formatTime(post.createdAt)}</span>
                            </div>
                            {post.imageUrl && (
                              <div className="mb-2">
                                <img
                                  src={post.imageUrl}
                                  alt="分享图片"
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
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {renderAvatar(archiveInfo?.partnerAvatarUrl || null, archiveInfo?.partnerUsername || 'TA', 'w-8 h-8')}
                        <span className="text-sm font-medium text-purple-600">
                          {archiveInfo?.partnerUsername || 'TA'}
                        </span>
                      </div>
                      {day.partnerPosts.length === 0 ? (
                        <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-lg">
                          暂无分享
                        </div>
                      ) : (
                        day.partnerPosts.map((post) => (
                          <div key={post.id} className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                            <div className="flex justify-between items-start mb-2">
                              {post.title && (
                                <span className="text-sm font-medium text-gray-700">{post.title}</span>
                              )}
                              <span className="text-xs text-gray-500">{formatTime(post.createdAt)}</span>
                            </div>
                            {post.imageUrl && (
                              <div className="mb-2">
                                <img
                                  src={post.imageUrl}
                                  alt="分享图片"
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
            ))}
          </div>
        )}
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

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-3">确认删除归档</h3>
            <p className="text-gray-600 text-sm mb-4">
              删除后将无法恢复，确定要永久删除这段回忆吗？
            </p>
            <p className="text-red-600 text-sm mb-6 font-medium">
              ⚠️ 此操作不可逆
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
              >
                再想想
              </button>
              <button
                onClick={handleDeleteArchive}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? '删除中...' : '确定删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}