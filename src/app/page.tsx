'use client'

import { useState, useEffect, useRef } from 'react'
import { uploadImage, validateImageFile } from '@/lib/imageUpload'

// 生成默认头像颜色（根据用户 ID 哈希）
function getDefaultAvatarColor(id: string): string {
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
function getInitial(str: string): string {
  return str.charAt(0).toUpperCase()
}

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showAvatarEdit, setShowAvatarEdit] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // 检查是否已登录
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      setAvatarUrl(parsed.avatarUrl || '')
    }
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
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
      } else {
        alert('注册成功！请登录')
        setIsLogin(true)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
    setShowAvatarEdit(false)
    setAvatarUrl('')
  }

  const handleSaveAvatar = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          avatarUrl: avatarUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '更新失败')
      }
      const updatedUser = { ...user, avatarUrl: data.user.avatarUrl }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setShowAvatarEdit(false)
      setAvatarPreview(null)
      alert('头像更新成功！')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件
    const validation = validateImageFile(file)
    if (!validation.valid) {
      alert(validation.error!)
      return
    }

    setAvatarUploading(true)

    try {
      // 创建预览
      const reader = new FileReader()
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)

      // 上传图片
      const imageUrl = await uploadImage(file)
      setAvatarUrl(imageUrl)
    } catch (err: any) {
      alert(err.message || '头像上传失败')
      setAvatarPreview(null)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl('')
    setAvatarPreview(null)
    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  // 如果已登录，显示用户信息
  if (user) {
    const userColor = getDefaultAvatarColor(user.id)
    const partnerColor = user.partner ? getDefaultAvatarColor(user.partner.id) : ''

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl text-center text-gray-800 mb-2 font-serif italic tracking-wide">UsOnly</h1>
          <p className="text-center text-gray-500 mb-6">只属于两个人的私密空间</p>
          
          <div className="space-y-4">
            {/* 用户头像和信息 */}
            <div className="bg-pink-50 rounded-lg p-4">
              <div className="flex items-center gap-4 mb-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-pink-300"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${userColor} flex items-center justify-center text-white text-xl font-bold border-2 border-pink-300`}>
                    {getInitial(user.username || user.email)}
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">欢迎</p>
                  <p className="text-lg font-medium text-gray-800">{user.username}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAvatarEdit(!showAvatarEdit)}
                className="text-sm text-pink-600 hover:underline"
              >
                {user.avatarUrl ? '更换头像' : '设置头像'}
              </button>
            </div>

            {/* 头像编辑 */}
            {showAvatarEdit && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {/* 当前头像预览 */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-300 flex-shrink-0">
                    {avatarPreview || avatarUrl ? (
                      <img
                        src={avatarPreview || avatarUrl}
                        alt="头像预览"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${userColor} flex items-center justify-center text-white text-xl font-bold`}>
                        {getInitial(user.username || user.email)}
                      </div>
                    )}
                  </div>
                  {avatarUrl && !avatarPreview && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      移除头像
                    </button>
                  )}
                </div>

                {/* 上传按钮 */}
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileSelect}
                    className="hidden"
                    ref={avatarInputRef}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {avatarUploading ? (
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
                  <p className="text-xs text-gray-500 text-center">
                    支持 JPG、PNG、GIF、WebP 格式，最大 5MB
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAvatar}
                    disabled={loading}
                    className="flex-1 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setAvatarUrl(user.avatarUrl || '')
                      setAvatarPreview(null)
                      setShowAvatarEdit(false)
                    }}
                    className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
            
            {/* 伴侣信息 */}
            {user.partner && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  {user.partner.avatarUrl ? (
                    <img
                      src={user.partner.avatarUrl}
                      alt={user.partner.username}
                      className="w-16 h-16 rounded-full object-cover border-2 border-purple-300"
                    />
                  ) : (
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${partnerColor} flex items-center justify-center text-white text-xl font-bold border-2 border-purple-300`}>
                      {getInitial(user.partner.username || user.partner.email)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">你的伴侣</p>
                    <p className="text-lg font-medium text-gray-800">{user.partner.username}</p>
                    <p className="text-xs text-gray-500">{user.partner.email}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4">
              <a
                href="/timeline"
                className="py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-center rounded-lg hover:from-pink-600 hover:to-purple-600 transition"
              >
                时间轴
              </a>
              <a
                href="/post"
                className="py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center rounded-lg hover:from-purple-600 hover:to-pink-600 transition"
              >
                发布
              </a>
            </div>

            <a
              href="/pair"
              className="block py-3 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-center rounded-lg hover:from-blue-600 hover:to-cyan-600 transition"
            >
              配对中心
            </a>

            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              退出登录
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-100 to-purple-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl text-center text-gray-800 mb-2 font-serif italic tracking-wide">UsOnly</h1>
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