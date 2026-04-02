'use client'

import { useState, useEffect, useRef } from 'react'
import HTMLExportModal from '@/components/HTMLExportModal'
import { uploadImage } from '@/lib/imageUpload'

// 检测是否为移动端设备
function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
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
    pairedAt?: string | null
  } | null
  pairedAt?: string | null
  breakupInitiated?: boolean
  breakupAt?: string | null
  archivedPartnerId?: string | null
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // 用户名编辑相关状态
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [updatingUsername, setUpdatingUsername] = useState(false)

  // 取消配对相关状态
  const [showBreakupModal, setShowBreakupModal] = useState(false)
  const [breakupLoading, setBreakupLoading] = useState(false)
  const [showBreakupConfirm, setShowBreakupConfirm] = useState(false)
  const [breakupDaysLeft, setBreakupDaysLeft] = useState<number | null>(null)
  
  // 冷静期倒计时状态
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number} | null>(null)
  
  // HTML 导出相关状态
  const [showExportModal, setShowExportModal] = useState(false)
  
  // 头像上传相关状态
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [currentCapture, setCurrentCapture] = useState<'user' | 'environment' | undefined>(undefined)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // 计算配对天数
  const calculatePairDays = (pairedAt: string | null | undefined): number => {
    if (!pairedAt) return 0
    const start = new Date(pairedAt)
    const now = new Date()
    const diffTime = now.getTime() - start.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 因为当天也算 1 天
  }

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
  const renderAvatar = (avatarUrl: string | null, name: string, size: string = 'w-20 h-20') => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className={`${size} rounded-full object-cover border-2 border-white shadow-md`}
        />
      )
    }
    const color = getDefaultAvatarColor(name)
    return (
      <div className={`${size} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xl font-bold shadow-md`}>
        {getInitial(name)}
      </div>
    )
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      checkBreakupStatus(parsedUser)
      // 从服务器获取最新用户信息
      fetchLatestUserInfo(parsedUser)
    } else {
      setLoading(false)
    }
  }, [])

  // 冷静期倒计时定时器 - 每分钟更新一次
  useEffect(() => {
    if (!user?.breakupAt) {
      setTimeLeft(null)
      return
    }
    
    const updateCountdown = () => {
      const breakupAt = new Date(user.breakupAt!)
      const deadline = new Date(breakupAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      const now = new Date()
      const diff = deadline.getTime() - now.getTime()
      
      if (diff <= 0) {
        // 冷静期已结束
        setTimeLeft(null)
        return
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      
      setTimeLeft({ days, hours })
    }
    
    updateCountdown() // 立即执行一次
    const timer = setInterval(updateCountdown, 60000) // 每分钟更新一次
    
    return () => clearInterval(timer)
  }, [user?.breakupAt])

  // 从服务器获取最新用户信息
  const fetchLatestUserInfo = async (localUser: User) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'x-user-id': localUser.id },
      })
      const data = await res.json()
      if (data.user) {
        const serverUser = data.user
        // 更新本地存储
        localStorage.setItem('user', JSON.stringify(serverUser))
        setUser(serverUser)
        checkBreakupStatus(serverUser)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 检查冷静期状态
  const checkBreakupStatus = (userData: User) => {
    if (userData.breakupInitiated && userData.breakupAt) {
      const breakupAt = new Date(userData.breakupAt)
      const now = new Date()
      const daysDiff = (now.getTime() - breakupAt.getTime()) / (1000 * 60 * 60 * 24)
      const daysLeft = 7 - daysDiff
      if (daysLeft > 0) {
        setBreakupDaysLeft(Math.ceil(daysLeft))
      } else {
        // 已超过冷静期，清除状态
        setBreakupDaysLeft(null)
        localStorage.setItem('user', JSON.stringify({
          ...userData,
          breakupInitiated: false,
          breakupAt: null,
        }))
        setUser({
          ...userData,
          breakupInitiated: false,
          breakupAt: null,
        })
      }
    }
  }

  // 上传头像
  const handleUploadAvatar = async (imageUrl: string) => {
    if (!user?.id) {
      alert('用户信息未加载，请刷新页面后重试')
      return
    }

    try {
      setUploading(true)
      
      // 先从服务器获取最新的用户信息，确保 user.id 有效
      const res = await fetch('/api/auth/me', {
        headers: { 'x-user-id': user.id },
      })
      const data = await res.json()
      
      if (!data.user) {
        throw new Error('用户信息无效，请重新登录')
      }
      
      const currentUser = data.user

      // 更新用户头像
      const updateRes = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ avatarUrl: imageUrl }),
      })

      const updateData = await updateRes.json()
      console.log('[头像更新] API 响应:', updateData)
      console.log('[头像更新] 检查 updateData.user:', updateData.user)
      if (updateData.user) {
        const updatedUser = { ...currentUser, avatarUrl: imageUrl }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        alert('头像更新成功，页面将刷新...')
        // 刷新页面以显示更新后的头像
        window.location.reload()
      } else {
        console.error('[头像更新] 失败，完整响应:', updateData)
        throw new Error(updateData.error || '更新失败')
      }
    } catch (error: any) {
      console.error('上传头像失败:', error)
      alert('上传失败：' + (error.message || '请重试'))
    } finally {
      setUploading(false)
    }
  }

  // 移除头像
  const handleRemoveAvatar = async () => {
    if (!user) return

    try {
      const updateRes = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ avatarUrl: null }),
      })

      const updateData = await updateRes.json()
      if (updateData.user) {
        const updatedUser = { ...user, avatarUrl: null }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        alert('头像已移除')
      }
    } catch (error) {
      console.error('移除头像失败:', error)
      alert('移除失败，请重试')
    }
  }

  // 发起取消配对
  const handleInitiateBreakup = async () => {
    if (!user || !user.partnerId) return

    try {
      setBreakupLoading(true)
      const res = await fetch('/api/breakup/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ partnerId: user.partnerId }),
      })

      const data = await res.json()
      if (data.success) {
        const updatedUser = {
          ...user,
          breakupInitiated: true,
          breakupAt: data.breakupAt,
        }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setBreakupDaysLeft(7)
        setShowBreakupModal(false)
        alert('已进入冷静期，7 天后将解除配对关系')
      } else {
        alert('操作失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('发起取消配对失败:', error)
      alert('操作失败，请重试')
    } finally {
      setBreakupLoading(false)
    }
  }

  // 撤销取消配对
  const handleCancelBreakup = async () => {
    if (!user) return

    try {
      setBreakupLoading(true)
      const res = await fetch('/api/breakup/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
      })

      const data = await res.json()
      if (data.success) {
        const updatedUser = {
          ...user,
          breakupInitiated: false,
          breakupAt: null,
        }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setBreakupDaysLeft(null)
        alert('已撤销取消配对请求，关系恢复正常')
      } else {
        alert('操作失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('撤销取消配对失败:', error)
      alert('操作失败，请重试')
    } finally {
      setBreakupLoading(false)
    }
  }

  // 确认解除配对
  const handleConfirmBreakup = async () => {
    if (!user) return

    try {
      setBreakupLoading(true)
      const res = await fetch('/api/breakup/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
      })

      const data = await res.json()
      if (data.success) {
        const updatedUser = {
          ...user,
          partnerId: null,
          partner: null,
          breakupInitiated: false,
          breakupAt: null,
        }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setBreakupDaysLeft(null)
        setShowBreakupConfirm(false)
        alert('已解除配对关系')
        window.location.reload()
      } else {
        alert('操作失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('确认解除配对失败:', error)
      alert('操作失败，请重试')
    } finally {
      setBreakupLoading(false)
    }
  }

  // 查看归档回忆
  const handleViewArchived = () => {
    if (user?.archivedPartnerId) {
      window.location.href = `/archive?partnerId=${user.archivedPartnerId}`
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  // 开始编辑用户名
  const handleStartEditUsername = () => {
    if (!user) return
    setUsernameInput(user.username)
    setEditingUsername(true)
  }

  // 取消编辑用户名
  const handleCancelEditUsername = () => {
    setEditingUsername(false)
    setUsernameInput('')
  }

  // 保存用户名
  const handleSaveUsername = async () => {
    if (!user?.id) return
    
    if (usernameInput.trim() === user.username) {
      setEditingUsername(false)
      setUsernameInput('')
      return
    }

    try {
      setUpdatingUsername(true)
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ username: usernameInput.trim() }),
      })

      const data = await res.json()
      if (data.user) {
        const updatedUser = { ...user, username: data.user.username }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        setEditingUsername(false)
        setUsernameInput('')
        alert('用户名修改成功')
      } else {
        alert('修改失败：' + (data.error || '未知错误'))
      }
    } catch (error: any) {
      console.error('修改用户名失败:', error)
      alert('修改失败：' + (error.message || '请重试'))
    } finally {
      setUpdatingUsername(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <p className="text-gray-600">加载中...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">未登录</p>
          <a href="/" className="text-pink-600 hover:underline">去登录</a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 pb-20">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-center relative">
          <h1 className="text-xl font-bold text-gray-800">UsOnly</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* 个人信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {renderAvatar(user.avatarUrl, user.username, 'w-20 h-20')}
              <button
                type="button"
                onClick={() => isMobile() ? setShowAvatarDialog(true) : avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-pink-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-pink-600 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </button>
            </div>
            <div className="flex-1">
              {editingUsername ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveUsername()
                      } else if (e.key === 'Escape') {
                        handleCancelEditUsername()
                      }
                    }}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800"
                    placeholder="输入新用户名"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveUsername}
                    disabled={updatingUsername}
                    className="px-3 py-1.5 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600 disabled:opacity-50"
                  >
                    {updatingUsername ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={handleCancelEditUsername}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-800">{user.username}</h2>
                  <button
                    onClick={handleStartEditUsername}
                    className="p-1.5 text-gray-400 hover:text-pink-600 transition"
                    title="修改用户名"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>

          {/* 隐藏的文件输入 - 用于头像上传 */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            capture={currentCapture}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              
              setUploading(true)
              try {
                const imageUrl = await uploadImage(file)
                await handleUploadAvatar(imageUrl)
              } catch (error: any) {
                alert('上传失败：' + (error.message || '请重试'))
              } finally {
                setUploading(false)
              }
            }}
          />
        </div>

        {/* 配对状态卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">配对状态</h3>

          {user.partnerId && user.partner ? (
            <div className="space-y-4">
              {/* 配对天数显示 */}
              {(user.partner.pairedAt || user.pairedAt) && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">💕 已配对</p>
                  <p className="text-3xl font-bold text-pink-600">
                    {calculatePairDays(user.partner.pairedAt || user.pairedAt)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">天</p>
                </div>
              )}

              {/* 伴侣信息 */}
              <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                {renderAvatar(user.partner.avatarUrl, user.partner.username, 'w-12 h-12')}
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{user.partner.username}</p>
                  <p className="text-sm text-gray-500">你们的配对</p>
                </div>
              </div>

              {/* 冷静期状态 */}
              {timeLeft !== null ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium mb-2">⚠️ 冷静期中</p>
                  <p className="text-sm text-yellow-700 mb-3">
                    还剩 {timeLeft.days}天{timeLeft.hours}小时 将解除配对关系
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelBreakup}
                      disabled={breakupLoading}
                      className="flex-1 px-4 py-2 bg-pink-500 text-white text-sm rounded-full hover:bg-pink-600 disabled:opacity-50"
                    >
                      继续配对
                    </button>
                    <button
                      onClick={() => setShowBreakupConfirm(true)}
                      disabled={breakupLoading}
                      className="flex-1 px-4 py-2 bg-red-500 text-white text-sm rounded-full hover:bg-red-600 disabled:opacity-50"
                    >
                      确认解除
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowBreakupModal(true)}
                  className="w-full py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  取消配对
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">当前没有配对</p>
              <a
                href="/pair"
                className="inline-block px-6 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition"
              >
                去寻找伴侣
              </a>
            </div>
          )}

          {/* 导出回忆 HTML */}
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => setShowExportModal(true)}
              className="w-full py-3 text-sm text-pink-600 hover:bg-pink-50 rounded-lg transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出回忆
            </button>
          </div>

          {/* 归档回忆入口 */}
          {user.archivedPartnerId && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={handleViewArchived}
                className="w-full py-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                查看归档回忆
              </button>
            </div>
          )}
        </div>

        {/* 设置卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">设置</h3>
          <button
            onClick={handleLogout}
            className="w-full py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 取消配对确认弹窗 */}
      {showBreakupModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowBreakupModal(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-3">取消配对</h3>
            <p className="text-gray-600 text-sm mb-4">
              确定要取消配对吗？
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-2">
              <li>• 取消后有 7 天冷静期，期间可随时恢复</li>
              <li>• 7 天后双方关系解除，互动记录将归档</li>
              <li>• 对方会收到通知</li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBreakupModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
              >
                再想想
              </button>
              <button
                onClick={handleInitiateBreakup}
                disabled={breakupLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
              >
                {breakupLoading ? '处理中...' : '确定取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认解除配对弹窗 */}
      {showBreakupConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowBreakupConfirm(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-3">确认解除配对</h3>
            <p className="text-gray-600 text-sm mb-4">
              确认后将立即解除配对关系，双方的互动记录将被归档。
            </p>
            <p className="text-red-600 text-sm mb-6 font-medium">
              ⚠️ 此操作不可逆，请谨慎操作
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBreakupConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleConfirmBreakup}
                disabled={breakupLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
              >
                {breakupLoading ? '处理中...' : '确认解除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTML 导出弹窗 */}
      <HTMLExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        user={user} 
      />

      {/* 移动端头像选择弹窗 */}
      {showAvatarDialog && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAvatarDialog(false)}
        >
          <div
            className="bg-white w-full max-w-xs rounded-xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">更换头像</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setCurrentCapture('environment')
                  setShowAvatarDialog(false)
                  setTimeout(() => avatarInputRef.current?.click(), 100)
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                📷 拍照
              </button>
              <button
                onClick={() => {
                  setCurrentCapture(undefined)
                  setShowAvatarDialog(false)
                  setTimeout(() => avatarInputRef.current?.click(), 100)
                }}
                className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                🖼️ 从相册选择
              </button>
            </div>
            <button
              onClick={() => setShowAvatarDialog(false)}
              className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 transition"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 底部导航 - 3 个按钮 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-3xl mx-auto flex">
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
          <a href="/profile" className="flex-1 py-3 text-center text-pink-600">
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