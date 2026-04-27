'use client'

import { useState, useEffect, useRef } from 'react'
import HTMLExportModal from '@/components/HTMLExportModal'
import FeedbackModal from '@/components/FeedbackModal'
import DonationModal from '@/components/DonationModal'
import BottomNav from '@/components/BottomNav'
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

interface Post {
  id: string
  imageUrls: string[] | null
  location?: string | null
}

interface ProfileStats {
  places: number
  records: number
  photos: number
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState<ProfileStats>({
    places: 0,
    records: 0,
    photos: 0,
  })
  
  // 用户名编辑相关状态
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [updatingUsername, setUpdatingUsername] = useState(false)

  // 取消配对相关状态
  const [showBreakupModal, setShowBreakupModal] = useState(false)
  const [showPairManageModal, setShowPairManageModal] = useState(false)
  const [breakupLoading, setBreakupLoading] = useState(false)
  const [showBreakupConfirm, setShowBreakupConfirm] = useState(false)
  const [breakupDaysLeft, setBreakupDaysLeft] = useState<number | null>(null)
  
  // 冷静期倒计时状态
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number} | null>(null)
  
  // HTML 导出相关状态
  const [showExportModal, setShowExportModal] = useState(false)
  
  // 反馈弹窗相关状态
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  
  // 头像上传相关状态
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [currentCapture, setCurrentCapture] = useState<'user' | 'environment' | undefined>(undefined)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [showDonationModal, setShowDonationModal] = useState(false)
  
  // 计算配对天数
  const calculatePairDays = (pairedAt: string | null | undefined): number => {
    if (!pairedAt) return 0
    const start = new Date(pairedAt)
    const now = new Date()
    const diffTime = now.getTime() - start.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 因为当天也算 1 天
  }

  const formatPairDate = (pairedAt: string | null | undefined): string => {
    if (!pairedAt) return '等待开始记录'

    const date = new Date(pairedAt)
    if (Number.isNaN(date.getTime())) return '等待开始记录'

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day} 开始记录`
  }

  const fetchMemoryStats = async (currentUser: User) => {
    try {
      const requests = [
        fetch('/api/post', {
          headers: { 'x-user-id': currentUser.id },
        }),
      ]

      if (currentUser.partnerId) {
        requests.push(
          fetch(`/api/post?partnerId=${currentUser.partnerId}`, {
            headers: { 'x-user-id': currentUser.id },
          })
        )
      }

      const responses = await Promise.all(requests)
      const payloads = await Promise.all(
        responses.map(async (res) => (res.ok ? res.json() : { posts: [] }))
      )
      const posts: Post[] = payloads.flatMap((payload) => payload.posts || [])
      const places = new Set(
        posts
          .map((post) => post.location?.trim())
          .filter((location): location is string => Boolean(location))
      )
      const photos = posts.reduce((total, post) => {
        return total + (Array.isArray(post.imageUrls) ? post.imageUrls.length : 0)
      }, 0)

      setStats({
        places: places.size,
        records: posts.length,
        photos,
      })
    } catch (error) {
      console.error('获取回忆统计失败:', error)
    }
  }

  // 生成默认头像颜色（根据用户 ID 哈希）
  const getDefaultAvatarColor = (id: string): string => {
    const colors = [
      'from-gray-500 to-gray-600',
      'from-gray-600 to-gray-700',
      'from-gray-500 to-gray-600',
      'from-gray-600 to-gray-700',
      'from-gray-500 to-gray-600',
      'from-red-400 to-red-500',
      'from-gray-600 to-gray-700',
      'from-gray-500 to-gray-600',
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
  const renderAvatar = (avatarUrl: string | null, name: string, size: string = 'w-16 h-16') => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className={`${size} rounded-full object-cover border border-gray-100`}
        />
      )
    }
    const color = getDefaultAvatarColor(name)
    return (
      <div className={`${size} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-lg font-bold`}>
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
      fetchMemoryStats(parsedUser)
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
        fetchMemoryStats(serverUser)
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
      if (updateData.user) {
        const updatedUser = { ...currentUser, avatarUrl: imageUrl }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        alert('头像更新成功，页面将刷新...')
        // 刷新页面以显示更新后的头像
        window.location.reload()
      } else {
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
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">加载中...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">未登录</p>
          <a href="/" className="text-gray-600 hover:underline">去登录</a>
        </div>
      </main>
    )
  }

  const isPaired = Boolean(user.partnerId && user.partner)
  const pairedAt = user.partner?.pairedAt || user.pairedAt
  const pairDays = isPaired ? calculatePairDays(pairedAt) : 0
  const pairManagementLabel = timeLeft !== null
    ? '冷静期管理'
    : isPaired
      ? '配对管理'
      : '去寻找伴侣'

  return (
    <main className="min-h-screen bg-[#FBFBFB] pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="relative mx-auto flex max-w-[400px] items-center justify-center px-4 py-3">
          <h1 className="text-base font-bold text-gray-900">UsOnly</h1>
        </div>
      </header>

      <div className="mx-auto max-w-[400px] space-y-3 px-4 py-4">
        {/* 关系纪念卡 */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-[1fr_112px_1fr] items-start gap-1">
            <div className="flex min-w-0 flex-col items-center">
              <div className="relative">
                {renderAvatar(user.avatarUrl, user.username, 'w-14 h-14')}
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => isMobile() ? setShowAvatarDialog(true) : avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
                  title="更换头像"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 flex max-w-full items-center justify-center gap-1">
                <p className="truncate text-xs font-medium text-gray-900">{user.username}</p>
                <button
                  type="button"
                  onClick={handleStartEditUsername}
                  className="shrink-0 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  title="修改用户名"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="relative mt-5 flex h-10 items-center justify-center">
              <svg className="h-8 w-full text-[#F08ABC]" viewBox="0 0 112 32" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 16H12L16 10L21 22L27 6L33 16H44" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M68 16H79L83 10L88 22L94 6L100 16H110" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="profile-heart-pulse absolute flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-[0_4px_14px_rgba(236,72,153,0.12)] ring-1 ring-pink-100">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </span>
            </div>

            <div className="flex min-w-0 flex-col items-center">
              {user.partner ? (
                <>
                  {renderAvatar(user.partner.avatarUrl, user.partner.username, 'w-14 h-14')}
                  <p className="mt-2 max-w-full truncate text-xs font-medium text-gray-900">{user.partner.username}</p>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-gray-200 bg-gray-50 text-gray-300">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="mt-2 text-xs font-medium text-gray-400">未配对</p>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 text-center">
            {editingUsername ? (
              <div className="mb-4 rounded-xl bg-gray-50 p-3">
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
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-pink-100"
                  placeholder="输入新用户名"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveUsername}
                    disabled={updatingUsername}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
                  >
                    {updatingUsername ? '保存中...' : '保存'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditUsername}
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : null}

            {isPaired ? (
              <>
                <p className="text-xs text-gray-500">我们在一起已经</p>
                <div className="mt-1 flex items-end justify-center gap-1">
                  <span className="text-[34px] font-bold leading-none text-primary">{pairDays || 0}</span>
                  <span className="pb-1 text-sm font-medium text-gray-500">天</span>
                </div>
                <p className="mt-2 text-xs text-gray-400">{formatPairDate(pairedAt)}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500">还没有配对</p>
                <p className="mt-2 text-xl font-bold text-gray-900">等待遇见彼此</p>
                <a
                  href="/pair"
                  className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-medium text-white transition hover:bg-primary-hover"
                >
                  去寻找伴侣
                </a>
              </>
            )}
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
        </section>

        {/* 统计条 */}
        <section className="grid grid-cols-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col items-center gap-1 px-2 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-50 text-primary">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10.5h.01" />
              </svg>
            </span>
            <span className="text-[11px] text-gray-500">一起去过</span>
            <strong className="flex items-baseline gap-0.5 text-gray-900">
              <span className="text-base font-semibold">{stats.places}</span>
              <span className="text-[10px] font-medium text-gray-400">个</span>
            </strong>
          </div>
          <div className="flex flex-col items-center gap-1 border-x border-gray-100 px-2 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h8M8 10h8M8 14h5M6 3h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z" />
              </svg>
            </span>
            <span className="text-[11px] text-gray-500">记录</span>
            <strong className="flex items-baseline gap-0.5 text-gray-900">
              <span className="text-base font-semibold">{stats.records}</span>
              <span className="text-[10px] font-medium text-gray-400">条</span>
            </strong>
          </div>
          <div className="flex flex-col items-center gap-1 px-2 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h2l1.2-2h7.6L17 7h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <span className="text-[11px] text-gray-500">照片</span>
            <strong className="flex items-baseline gap-0.5 text-gray-900">
              <span className="text-base font-semibold">{stats.photos}</span>
              <span className="text-[10px] font-medium text-gray-400">张</span>
            </strong>
          </div>
        </section>

        {/* 回忆与配对 */}
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-50 text-primary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <span className="flex-1 text-sm font-medium text-gray-800">导出回忆</span>
            <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              if (timeLeft !== null) {
                setShowPairManageModal(true)
              } else if (isPaired) {
                setShowPairManageModal(true)
              } else {
                window.location.href = '/pair'
              }
            }}
            className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3.5 text-left transition hover:bg-gray-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06A1.65 1.65 0 0015 19.4a1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09A1.65 1.65 0 0019.4 15z" />
              </svg>
            </span>
            <span className="flex-1 text-sm font-medium text-gray-800">{pairManagementLabel}</span>
            <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {user.archivedPartnerId && (
            <button
              type="button"
              onClick={handleViewArchived}
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3.5 text-left transition hover:bg-gray-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </span>
              <span className="flex-1 text-sm font-medium text-gray-800">查看归档回忆</span>
              <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </section>

        {timeLeft !== null && (
          <section className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-800">冷静期中</p>
            <p className="mt-1 text-xs text-amber-700">
              还剩 {timeLeft.days} 天 {timeLeft.hours} 小时，将解除配对关系。
            </p>
            <button
              type="button"
              onClick={handleCancelBreakup}
              disabled={breakupLoading}
              className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:opacity-50"
            >
              继续配对
            </button>
          </section>
        )}

        {/* 设置 */}
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <button
            type="button"
            onClick={() => setShowFeedbackModal(true)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <span className="flex-1 text-sm font-medium text-gray-800">联系作者</span>
            <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowDonationModal(true)}
            className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3.5 text-left transition hover:bg-gray-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 1v3M10 1v3M14 1v3" />
              </svg>
            </span>
            <span className="flex-1 text-sm font-medium text-gray-800">请作者喝咖啡</span>
            <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50"
        >
          退出登录
        </button>
      </div>

      {/* 配对管理弹窗 */}
      {showPairManageModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setShowPairManageModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">配对管理</h3>
              <button
                type="button"
                onClick={() => setShowPairManageModal(false)}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                title="关闭"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-center gap-3">
                {renderAvatar(user.avatarUrl, user.username, 'w-10 h-10')}
                <span className="text-primary">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </span>
                {user.partner
                  ? renderAvatar(user.partner.avatarUrl, user.partner.username, 'w-10 h-10')
                  : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-300 ring-1 ring-gray-200">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  )}
              </div>
              <p className="mt-3 text-center text-sm font-medium text-gray-900">
                {user.partner ? `已和 ${user.partner.username} 配对` : '当前没有配对'}
              </p>
              <p className="mt-1 text-center text-xs text-gray-500">
                {pairDays > 0 ? `已经一起记录 ${pairDays} 天` : '开始记录后会在这里显示天数'}
              </p>
            </div>

            {timeLeft !== null ? (
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">冷静期中</p>
                <p className="mt-1 text-xs leading-5 text-amber-700">
                  还剩 {timeLeft.days} 天 {timeLeft.hours} 小时。你可以继续配对，也可以在冷静期结束后确认解除。
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancelBreakup}
                    disabled={breakupLoading}
                    className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
                  >
                    继续配对
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPairManageModal(false)
                      setShowBreakupConfirm(true)
                    }}
                    disabled={breakupLoading}
                    className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-red-500 ring-1 ring-red-100 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    确认解除
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-xs leading-5 text-gray-500">
                  配对关系会影响双方回忆、足迹和照片的共同展示。取消配对前会先进入 7 天冷静期，期间可以随时恢复。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowPairManageModal(false)
                    setShowBreakupModal(true)
                  }}
                  className="mt-4 w-full rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-100"
                >
                  取消配对
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
            <h3 className="text-lg font-bold text-gray-900 mb-3">取消配对</h3>
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
            <h3 className="text-lg font-bold text-gray-900 mb-3">确认解除配对</h3>
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

      {/* 反馈弹窗 */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        userId={user?.id}
      />

      {/* 打赏弹窗 */}
      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
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
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">更换头像</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setCurrentCapture('environment')
                  setShowAvatarDialog(false)
                  setTimeout(() => avatarInputRef.current?.click(), 100)
                }}
                className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition flex items-center justify-center gap-2"
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

      {/* 底部导航 */}
      <BottomNav activePage="profile" />
    </main>
  )
}
