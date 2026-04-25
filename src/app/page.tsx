'use client'

import { useState, useEffect } from 'react'
import { setLoggedInUserId } from '@/lib/monitor'
import OnboardingGuide from '@/components/OnboardingGuide'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [showInviteCode, setShowInviteCode] = useState(false)
  const [userInviteCode, setUserInviteCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showLoginCard, setShowLoginCard] = useState(false)

  // 页面加载动画
  useEffect(() => {
    const timer = setTimeout(() => setShowLoginCard(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // 预填充邮箱
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      if (user?.email) {
        setEmail(user.email)
      }
    }
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
        localStorage.setItem('user', JSON.stringify(data.user))
        if (data.token) {
          localStorage.setItem('sessionToken', data.token)
        }
        setLoggedInUserId(data.user.id)
        window.location.href = '/timeline'
      } else {
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('user')
        
        localStorage.setItem('user', JSON.stringify(data.user))
        if (data.token) {
          localStorage.setItem('sessionToken', data.token)
        }
        setLoggedInUserId(data.user.id)
        setUserInviteCode(data.user.inviteCode)
        
        if (data.hasPartner) {
          window.location.href = '/timeline'
        } else {
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
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.partner_id) {
      window.location.href = '/timeline'
    } else {
      window.location.href = '/pair'
    }
  }

  return (
    <>
        <main className="min-h-screen relative overflow-hidden flex items-center justify-center"
          style={{
            backgroundImage: 'url(/images/landing_page_background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat'
          }}
        >
        {/* 背景遮罩层 */}
        <div className="absolute inset-0 bg-black/30"></div>

        {/* 主内容 */}
        <div className={`relative z-10 w-full max-w-[420px] px-4 transition-all duration-700 ${showLoginCard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* 品牌区域 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">UsOnly</h1>
            <div className="flex items-center justify-center gap-1 mb-3">
              <span className="text-white/90 text-sm">只属于两个人的私密空间</span>
              <svg className="w-4 h-4 text-pink-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
            </div>
            {/* 手写体文字 */}
            <p className="text-white/60 text-sm italic font-light" style={{ fontFamily: 'cursive' }}>
              记录只属于你们的日常 ♡
            </p>
          </div>

          {/* 登录/注册表单卡片 */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 注册时的用户名 */}
              {!isLogin && (
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="用户名（支持中文）"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent text-sm"
                  />
                </div>
              )}

              {/* 邮箱 */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="邮箱地址"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent text-sm"
                />
              </div>

              {/* 密码 */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="输入密码"
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent text-sm"
                />
                {/* 显示/隐藏密码按钮 */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* 注册时的邀请码 */}
              {!isLogin && (
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="邀请码（可选）"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent text-sm uppercase"
                    maxLength={8}
                  />
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="text-red-300 text-sm bg-red-500/20 p-3 rounded-xl border border-red-500/30">
                  {error}
                </div>
              )}

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:from-pink-600 hover:to-rose-600 transition disabled:opacity-50 font-medium shadow-lg text-sm"
              >
                {loading ? '加载中...' : isLogin ? '登录' : '注册'}
              </button>
            </form>

            {/* 忘记密码链接（仅登录模式） */}
            {isLogin && (
              <div className="text-center mt-4">
                <button
                  onClick={() => window.location.href = '/forgot-password'}
                  className="text-white/60 hover:text-white text-xs transition"
                >
                  忘记密码？
                </button>
              </div>
            )}

            {/* 分隔线 */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-white/40 text-xs">或</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* 注册/登录切换链接 */}
            <div className="text-center">
              {isLogin ? (
                <p className="text-white/60 text-xs">
                  还没有账号？{' '}
                  <button
                    onClick={() => { setIsLogin(false); setError(''); }}
                    className="text-pink-400 hover:text-pink-300 font-medium transition"
                  >
                    去注册
                  </button>
                </p>
              ) : (
                <p className="text-white/60 text-xs">
                  已有账号？{' '}
                  <button
                    onClick={() => { setIsLogin(true); setError(''); }}
                    className="text-pink-400 hover:text-pink-300 font-medium transition"
                  >
                    去登录
                  </button>
                </p>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* 新用户引导 */}
      {showOnboarding && isNewUser && (
        <OnboardingGuide onComplete={handleOnboardingComplete} />
      )}

      {/* 邀请码显示弹窗 */}
      {showInviteCode && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInviteCode(false)}
        >
          <div 
            className="bg-white rounded-xl border border-gray-100 p-6 max-w-sm w-full shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInviteCode(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
              title="关闭"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">注册成功！</h3>
              <p className="text-sm text-gray-600">
                下面是你的专属邀请码，分享给 TA 后即可完成配对
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
              <p className="text-xs text-gray-500 text-center mb-2">你的专属邀请码</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                  {userInviteCode}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userInviteCode)
                    alert('邀请码已复制！')
                  }}
                  className="p-2 hover:bg-white rounded-lg transition border border-gray-200"
                  title="复制邀请码"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="border-t border-gray-100 pt-4">
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
