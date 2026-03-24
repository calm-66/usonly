'use client'

import { useState, useEffect } from 'react'

interface Post {
  id: string
  date: string
  theme: string
  imageUrl: string | null
  text: string | null
  isLatePost: boolean
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
  const [theme, setTheme] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [text, setText] = useState('')
  const [isLatePost, setIsLatePost] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      // 默认日期为今天
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
      loadTheme(today, parsedUser.partnerId)
      loadPosts(parsedUser)
    } else {
      window.location.href = '/'
    }
  }, [])

  const loadTheme = async (selectedDate: string, partnerId: string | null) => {
    try {
      const userData = localStorage.getItem('user')
      if (!userData) return
      const parsedUser = JSON.parse(userData)
      
      const params = new URLSearchParams({
        date: selectedDate,
        userId: parsedUser.id,
      })
      if (partnerId) {
        params.set('partnerId', partnerId)
      }
      
      const res = await fetch(`/api/theme?${params}`)
      const data = await res.json()
      if (data.theme) {
        setTheme(data.theme.text)
      }
    } catch (err) {
      console.error('加载主题失败:', err)
    }
  }

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
          theme,
          imageUrl: imageUrl || null,
          text: text || null,
          isLatePost,
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
    loadTheme(newDate, user?.partnerId || null)
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
          <a href="/" className="text-gray-600 hover:text-gray-800">
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
                今日主题
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="今日主题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                图片 URL（可选）
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
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
                    <span className="text-sm font-medium text-gray-700">{post.theme}</span>
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
                      alt={post.theme}
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                  )}
                  {post.text && (
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{post.text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-2xl mx-auto flex">
          <a href="/timeline" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">时间轴</span>
          </a>
          <a href="/post" className="flex-1 py-3 text-center text-pink-600">
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