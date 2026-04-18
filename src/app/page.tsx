'use client'

import { useState, useEffect } from 'react'
import { setLoggedInUserId } from '@/lib/monitor'
import OnboardingGuide from '@/components/OnboardingGuide'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('') // 邀请码输入
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [showInviteCode, setShowInviteCode] = useState(false) // 显示邀请码弹窗
  const [userInviteCode, setUserInviteCode] = useState('') // 用户的邀请码

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
            // Token 有效，设置登录用户 ID（用于关联后续的页面访问事件）
            // 登录事件已在服务器端 /api/auth/session 中上报
            const user = JSON.parse(userData)
            setLoggedInUserId(user.id)
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
      const body: any = isLogin 
        ? { email, password } 
        : { username, email, password, inviteCode: inviteCode.trim() || undefined }

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
        // 设置登录用户 ID（用于关联后续的页面访问事件）
        // 登录事件已在服务器端 /api/auth/login 中上报
        setLoggedInUserId(data.user.id)
        // 登录成功直接跳转到时间轴
        window.location.href = '/timeline'
      } else {
        // 注册成功：先清除旧的本地数据，防止污染
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('user')
        
        // 保存新用户信息和 session token
        localStorage.setItem('user', JSON.stringify(data.user))
        if (data.token) {
          localStorage.setItem('sessionToken', data.token)
        }
        // 设置登录用户 ID（用于关联后续的页面访问事件）
        setLoggedInUserId(data.user.id)
        // 保存用户的邀请码
        setUserInviteCode(data.user.inviteCode)
        
        console.log('注册成功，用户数据:', data.user)
        console.log('是否有伴侣:', data.hasPartner)
        
        // 如果是通过邀请码注册的（已有伴侣），直接跳转到时间轴
        if (data.hasPartner) {
          // 强制刷新页面，确保使用最新的 localStorage 数据
          window.location.href = '/timeline'
        } else {
          // 否则显示邀请码弹窗，让用户邀请伴侣
          setShowInviteCode(true)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    // 检查用户是否已配对
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.partner_id) {
      // 已配对，跳转到时间轴
      window.location.href = '/timeline'
    } else {
      // 未配对，跳转到配对页面
      window.location.href = '/pair'
    }
  }

  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">UsOnly</h1>
        <p className="text-center text-gray-500 mb-6">只属于两个人的私密空间</p>
        
        {/* 产品介绍区域 */}
        <div className="mb-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-100">
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-pink-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">什么是 UsOnly？</span>
          </div>
          <p className="text-xs text-gray-600 mb-3 leading-relaxed">
            UsOnly 是一个只属于你们两个人的私密空间。为想要记录日常却不想公开发布到社交媒体的情侣设计——没有他人的点赞和评论，只有你们彼此分享的真实瞬间。不需要精心修图、写文案，想发就发，随心记录。
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white rounded-lg">
              <div className="text-lg mb-1">🔒</div>
              <div className="text-xs text-gray-600">私密安全</div>
            </div>
            <div className="p-2 bg-white rounded-lg">
              <div className="text-lg mb-1">📸</div>
              <div className="text-xs text-gray-600">日常分享</div>
            </div>
            <div className="p-2 bg-white rounded-lg">
              <div className="text-lg mb-1">💕</div>
              <div className="text-xs text-gray-600">情感连接</div>
            </div>
          </div>
        </div>
        
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

        {/* 如何开始步骤 */}
          <div className="mb-6 space-y-2">
          <div className="flex items-start text-xs text-gray-600">
            <span className="flex-shrink-0 w-5 h-5 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-medium mr-2">1</span>
            <span>注册账号，获取专属邀请码</span>
          </div>
          <div className="flex items-start text-xs text-gray-600">
            <span className="flex-shrink-0 w-5 h-5 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-medium mr-2">2</span>
            <span>将邀请码分享给 TA，TA 输入邀请码注册后自动配对</span>
          </div>
          <div className="flex items-start text-xs text-gray-600">
            <span className="flex-shrink-0 w-5 h-5 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-medium mr-2">3</span>
            <span>每天轻松分享，记录美好日常</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邀请码（可选）
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="如果你有邀请码，请输入"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent uppercase"
                maxLength={8}
              />
            </div>
            </>
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
      
      {/* 新用户引导 */}
      {showOnboarding && isNewUser && (
        <OnboardingGuide onComplete={handleOnboardingComplete} />
      )}
      
      {/* 邀请码显示弹窗 */}
      {showInviteCode && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInviteCode(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowInviteCode(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
              title="关闭"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">注册成功！</h3>
              <p className="text-sm text-gray-600">
                下面是你的专属邀请码，分享给 TA 后即可完成配对
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 text-center mb-2">你的专属邀请码</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-bold text-pink-600 tracking-wider">
                  {userInviteCode}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userInviteCode)
                    alert('邀请码已复制！')
                  }}
                  className="p-2 hover:bg-white rounded-lg transition"
                  title="复制邀请码"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 备选配对方式提示 */}
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 text-center">
                如果 TA 已经注册，可以在"我的"页面通过用户名搜索进行匹配
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
