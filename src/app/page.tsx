'use client'

import { useState, useEffect } from 'react'
import { trackLogin } from '@/lib/monitor'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 检查是否有有效的 session token，如果有则自动登录
    const checkAutoLogin = async () => {
      const sessionToken = localStorage.getItem('sessionToken')
      const userData = localStorage.getItem('user')
      
      if (sessionToken && userData) {
        try {
          // 验证 session token 是否有效
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: sessionToken }),
          })
          
          if (res.ok) {
            const data = await res.json()
            // Token 有效，获取客户端真实 IP 并上报登录事件（自动登录）
            const user = JSON.parse(userData)
            const clientIp = await getClientIp()
            trackLogin(user.id, user.username, clientIp || undefined)
            console.log('[Monitor] Auto-login tracked:', user.id, 'IP:', clientIp)
            // 直接跳转到时间轴
            window.location.href = '/timeline'
            return
          }
        } catch (error) {
          console.error('自动登录检查失败:', error)
        }
      }
      
      // Token 无效或不存在，预填充邮箱（如果之前有保存）
      if (userData) {
        const user = JSON.parse(userData)
        if (user && user.email) {
          setEmail(user.email)
        }
      }
    }
    
    checkAutoLogin()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body: any = isLogin ? { email, password } : { username, email, password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '操作失败')
      }

      if (isLogin) {
        // 登录成功：保存用户信息和 session token
        localStorage.setItem('user', JSON.stringify(data.user))
        if (data.token) {
          localStorage.setItem('sessionToken', data.token)
        }
        // 获取客户端真实 IP 并上报登录事件
        const clientIp = await getClientIp()
        trackLogin(data.user.id, data.user.username, clientIp || undefined)
        console.log('[Monitor] Manual login tracked:', data.user.id, 'IP:', clientIp)
        // 登录成功直接跳转到时间轴
        window.location.href = '/timeline'
      } else {
        alert('注册成功！')
        // 注册成功：保存用户信息和 session token
        localStorage.setItem('user', JSON.stringify(data.user))
        if (data.token) {
          localStorage.setItem('sessionToken', data.token)
        }
        // 注册成功也直接跳转到时间轴
        window.location.href = '/timeline'
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 获取客户端真实 IP 地址
  const getClientIp = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/client-ip')
      if (res.ok) {
        const data = await res.json()
        return data.ip
      }
    } catch (error) {
      console.error('Failed to get client IP:', error)
    }
    return null
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-100 to-purple-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">UsOnly</h1>
        <p className="text-center text-gray-500 mb-6">只属于两个人的私密空间</p>
        
        <div className="flex mb-6 border-b">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-center font-medium transition ${
              isLogin
                ? 'text-pink-600 border-b-2 border-pink-600'
                : 'text-gray-400'
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-center font-medium transition ${
              !isLogin
                ? 'text-pink-600 border-b-2 border-pink-600'
                : 'text-gray-400'
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="你的用户名（支持中文）"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50"
          >
            {loading ? '加载中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </main>
  )
}