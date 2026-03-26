'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  username: string
  email: string
  partnerId: string | null
}

interface PairRequest {
  id: string
  senderId: string
  receiverId: string
  status: string
  createdAt: string
  sender: User
}

export default function PairPage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [requests, setRequests] = useState<PairRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'search' | 'requests'>('search')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      loadRequests(parsedUser)
    } else {
      window.location.href = '/'
    }
  }, [])

  const loadRequests = async (userData: User) => {
    try {
      const res = await fetch('/api/pair-request', {
        headers: { 'x-user-id': userData.id },
      })
      const data = await res.json()
      if (data.requests) {
        setRequests(data.requests)
      }
    } catch (err) {
      console.error('加载请求失败:', err)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('请输入搜索内容')
      return
    }

    setLoading(true)
    setError('')
    setSearchResults([])

    try {
      const res = await fetch(`/api/user/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'x-user-id': user!.id },
      })
      const data = await res.json()
      if (data.users) {
        setSearchResults(data.users)
      }
    } catch (err) {
      setError('搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSendRequest = async (receiverId: string) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/pair-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
        body: JSON.stringify({ receiverId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '发送失败')
      }
      setMessage('配对请求已发送！')
      setSearchResults([])
      setSearchQuery('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/pair-request/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
        body: JSON.stringify({ requestId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '接受失败')
      }
      setMessage('配对成功！')
      setRequests([])
      // 更新本地存储的用户信息（使用 API 返回的完整用户数据，包含 partner 对象）
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="text-center text-gray-600">加载中...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">配对中心</h1>
          <a href="/" className="text-gray-600 hover:text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* 标签页 */}
        <div className="flex bg-white rounded-lg shadow-sm p-1 mb-4">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              activeTab === 'search' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'
            }`}
          >
            搜索用户
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              activeTab === 'requests' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'
            }`}
          >
            收到的请求
            {requests.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {requests.length}
              </span>
            )}
          </button>
        </div>

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

        {/* 搜索用户 */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入用户名搜索"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
              >
                搜索
              </button>
            </div>

            {searchResults.length === 0 && !loading && (
              <p className="text-center text-gray-500 py-4">
                {searchQuery ? '未找到匹配的用户' : '输入用户名开始搜索'}
              </p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{result.username}</p>
                      <p className="text-sm text-gray-500">{result.email}</p>
                    </div>
                    <button
                      onClick={() => handleSendRequest(result.id)}
                      disabled={loading || !!result.partnerId}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      {result.partnerId ? '已有伴侣' : '发送请求'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 收到的请求 */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {requests.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                暂无配对请求
              </p>
            ) : (
              <div className="space-y-2">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{request.sender.username}</p>
                      <p className="text-sm text-gray-500">{request.sender.email}</p>
                    </div>
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                    >
                      接受
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
          <a href="/post" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs">发布</span>
          </a>
          <a href="/pair" className="flex-1 py-3 text-center text-blue-600">
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