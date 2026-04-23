'use client'

import { useState, useEffect } from 'react'
import CommentModal from '@/components/CommentModal'
import ImageGallery from '@/components/ImageGallery'

interface Post {
  id: string
  userId: string
  date: string
  title: string | null
  imageUrls: string[] | null
  text: string | null
  createdAt: string
  owner: '我' | 'TA'
  latitude?: number | null
  longitude?: number | null
  location?: string | null
  layoutConfig?: { images: Array<{ url: string; col: number; row: number; colSpan: number; rowSpan: number }> } | null
}

interface DayPosts {
  date: string
  title: string | null
  posts: Post[]
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
    breakupInitiated?: boolean
    breakupAt?: string | null
  } | null
  breakupInitiated?: boolean
  breakupAt?: string | null
  pairedAt?: string | null
}

interface Comment {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  user: {
    id: string
    username: string
    avatarUrl: string | null
  }
  replies: Comment[]
}

interface Notification {
  id: string
  type: string
  content: string
  isRead: boolean
  createdAt: string
  sender: {
    id: string
    username: string
    avatarUrl: string | null
  } | null
  post: {
    id: string
    imageUrls: string[] | null
  } | null
}

interface ReplyToState {
  commentId: string
  username: string
}

export default function TimelinePage() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  
  // 评论相关状态
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComment, setNewComment] = useState<string>('')
  const [replyTo, setReplyTo] = useState<ReplyToState | undefined>(undefined)
  
  // 评论弹窗状态
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showCommentModal, setShowCommentModal] = useState(false)
  
  // 通知相关状态
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  // 挽回配对相关状态
  const [showAppealBanner, setShowAppealBanner] = useState(false)
  const [appealLoading, setAppealLoading] = useState(false)
  const [showAppealResponseModal, setShowAppealResponseModal] = useState(false)
  const [selectedAppealNotification, setSelectedAppealNotification] = useState<Notification | null>(null)
  
  // 时间筛选相关状态
  const [timeFilter, setTimeFilter] = useState<'all' | '7days' | '30days' | 'custom'>('all')
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  
  // 日期筛选弹窗状态
  const [showDateFilter, setShowDateFilter] = useState(false)
  
  // 自定义时间段状态
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  // 图片放大查看器状态
  const [selectedPostImages, setSelectedPostImages] = useState<{ images: string[]; index: number } | null>(null)

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

  // 计算配对天数
  const calculatePairDays = (pairedAt: string | null | undefined): number => {
    if (!pairedAt) return 0
    const start = new Date(pairedAt)
    const now = new Date()
    const diffTime = now.getTime() - start.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  // 格式化时间显示 HH:MM
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 格式化相对时间
  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  // 提取地址中的城市部分
  const extractCity = (fullAddress: string): string => {
    if (!fullAddress) return ''
    const parts = fullAddress.split(/\s+/)
    if (parts.length === 0) return fullAddress
    if (parts.length === 1) return parts[0]
    const cityIndex = parts.findIndex(p => p.includes('市') || p.includes('区'))
    if (cityIndex !== -1 && cityIndex < parts.length - 1) {
      return parts.slice(0, cityIndex + 2).join(' ')
    }
    return parts.slice(0, 2).join(' ')
  }

  // 渲染头像组件
  const renderAvatar = (avatarUrl: string | null, name: string, size: string = 'w-10 h-10') => {
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
      <div className={`${size} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold`}>
        {getInitial(name)}
      </div>
    )
  }

  // 检查是否可以删除评论
  const canDeleteComment = (comment: Comment, postOwnerId: string): boolean => {
    if (comment.user.id === user?.id) return true
    if (postOwnerId === user?.id) return true
    return false
  }

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const sessionToken = localStorage.getItem('sessionToken')
      const userData = localStorage.getItem('user')
      
      if (!sessionToken && userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        loadPosts(parsedUser)
        loadNotifications(parsedUser)
        checkAppealStatus(parsedUser)
        fetchLatestUserInfo(parsedUser)
        return
      }
      
      if (sessionToken) {
        try {
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: sessionToken }),
          })
          
          if (res.ok) {
            const data = await res.json()
            const serverUser = data.user
            setUser(serverUser)
            localStorage.setItem('user', JSON.stringify(serverUser))
            loadPosts(serverUser)
            loadNotifications(serverUser)
            checkAppealStatus(serverUser)
            fetchLatestUserInfo(serverUser)
          } else {
            localStorage.removeItem('sessionToken')
            localStorage.removeItem('user')
            window.location.href = '/'
          }
        } catch (error) {
          localStorage.removeItem('sessionToken')
          localStorage.removeItem('user')
          window.location.href = '/'
        }
      } else {
        window.location.href = '/'
      }
    }
    
    checkAuthAndLoad()
  }, [])

  const fetchLatestUserInfo = async (localUser: User) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'x-user-id': localUser.id },
      })
      const data = await res.json()
      if (data.user) {
        const serverUser = data.user
        localStorage.setItem('user', JSON.stringify(serverUser))
        setUser(serverUser)
        checkAppealStatus(serverUser)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  const checkAppealStatus = (userData: User) => {
    if (userData.partnerId && !userData.breakupInitiated && userData.partner) {
      if (userData.partner.breakupInitiated) {
        setShowAppealBanner(true)
      } else {
        setShowAppealBanner(false)
      }
    }
  }

  const handleAppeal = async () => {
    if (!user) return
    try {
      setAppealLoading(true)
      const res = await fetch('/api/breakup/appeal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
      })
      const data = await res.json()
      if (data.success) {
        setShowAppealBanner(false)
        alert('已发送挽回请求，等待对方确认')
      } else {
        alert('操作失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('发起挽回失败:', error)
      alert('操作失败，请重试')
    } finally {
      setAppealLoading(false)
    }
  }

  const handleAppealResponse = async (accept: boolean) => {
    if (!user) return
    try {
      setAppealLoading(true)
      const res = await fetch('/api/breakup/appeal-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ accept }),
      })
      const data = await res.json()
      if (data.success) {
        setShowAppealResponseModal(false)
        setSelectedAppealNotification(null)
        if (user) {
          await loadNotifications(user)
        }
        alert(accept ? '已接受挽回请求，关系已恢复' : '已拒绝挽回请求')
      } else {
        alert('操作失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('处理挽回请求失败:', error)
      alert('操作失败，请重试')
    } finally {
      setAppealLoading(false)
    }
  }

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
      const partnerData = partnerRes ? await partnerRes.json() : null

      const allPosts: Post[] = [
        ...(myData.posts || []),
        ...(partnerData?.posts || []),
      ]

      const postsWithOwner = allPosts.map((p: Post): Post => ({
        ...p,
        owner: p.userId === userData.id ? '我' : 'TA',
      }))

      setPosts(postsWithOwner)
    } catch (error) {
      console.error('加载分享失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (posts.length === 0) return
    const allPostIds = posts.map(p => p.id)
    const loadedPostIds = Object.keys(comments)
    const postsToLoad = allPostIds.filter(id => !loadedPostIds.includes(id))
    if (postsToLoad.length === 0) return
    postsToLoad.forEach(postId => loadCommentCount(postId))
  }, [posts])

  const loadCommentCount = async (postId: string) => {
    try {
      const res = await fetch(`/api/comment?postId=${postId}`)
      const data = await res.json()
      if (data.comments) {
        setComments(prev => ({ ...prev, [postId]: data.comments }))
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    }
  }

  const loadNotifications = async (userData: User) => {
    try {
      const res = await fetch('/api/notification', {
        headers: { 'x-user-id': userData.id },
      })
      const data = await res.json()
      if (data.notifications !== undefined) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('加载通知失败:', error)
    }
  }

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const res = await fetch('/api/notification', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
        body: JSON.stringify({ markAllAsRead: true }),
      })

      const data = await res.json()
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('标记通知为已读失败:', error)
    }
  }

  const loadComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/comment?postId=${postId}`)
      const data = await res.json()
      if (data.comments) {
        setComments(prev => ({ ...prev, [postId]: data.comments }))
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    }
  }

  const handleSendComment = async (postId: string) => {
    const content = newComment.trim()
    if (!content) return

    try {
      const body: { postId: string; content: string; parentId?: string } = {
        postId,
        content,
      }
      if (replyTo) {
        body.parentId = replyTo.commentId
      }

      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        await loadComments(postId)
        setNewComment('')
        setReplyTo(undefined)
        if (user) {
          await loadNotifications(user)
        }
      } else {
        alert('评论失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('发表评论失败:', error)
      alert('评论失败，请重试')
    }
  }

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return

    try {
      const res = await fetch(`/api/comment/delete?id=${commentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user!.id,
        },
      })

      const data = await res.json()
      if (data.success) {
        await loadComments(postId)
      }
    } catch (error) {
      console.error('删除评论失败:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notification?id=${notificationId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user!.id,
        },
      })

      const data = await res.json()
      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('删除通知失败:', error)
    }
  }

  const handleDeleteAllNotifications = async () => {
    if (!confirm('确定要删除所有通知吗？')) return

    try {
      const res = await fetch('/api/notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
        body: JSON.stringify({ deleteAll: true }),
      })

      const data = await res.json()
      if (data.success) {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('删除所有通知失败:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if ((notification.type === 'comment' || notification.type === 'comment_reply' || notification.type === 'new_post') && notification.post) {
      const targetPost = posts.find(p => p.id === notification.post!.id)
      
      if (targetPost) {
        setSelectedPost(targetPost)
        setShowCommentModal(true)
        setNewComment('')
        setReplyTo(undefined)
        await loadComments(targetPost.id)
        await markNotificationAsRead(notification.id)
      }
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notification', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
        body: JSON.stringify({ notificationId }),
      })

      const data = await res.json()
      if (data.success) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('标记通知为已读失败:', error)
    }
  }

  const openCommentModal = (post: Post) => {
    setSelectedPost(post)
    setShowCommentModal(true)
    setNewComment('')
    setReplyTo(undefined)
    loadComments(post.id)
  }

  const closeCommentModal = () => {
    setShowCommentModal(false)
    setSelectedPost(null)
    setNewComment('')
    setReplyTo(undefined)
  }

  const handleReplyClick = (commentId: string, username: string) => {
    setReplyTo({ commentId, username })
    setNewComment(`@${username} `)
  }

  const cancelReply = () => {
    setReplyTo(undefined)
    setNewComment('')
  }

  const filterPostsByDate = (posts: Post[]): Post[] => {
    if (timeFilter === 'all') {
      return posts
    }
    
    if (posts.length === 0) {
      return []
    }
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    
    let cutoffDate = new Date(0)
    let endDate = today
    
    if (timeFilter === '7days') {
      cutoffDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeFilter === '30days') {
      cutoffDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (timeFilter === 'custom' && customStartDate && customEndDate) {
      const startParts = customStartDate.split('-')
      const endParts = customEndDate.split('-')
      cutoffDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]), 0, 0, 0, 0)
      endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]), 23, 59, 59, 999)
    }
    
    return posts.filter(post => {
      const postParts = post.date.split('-')
      const postYear = parseInt(postParts[0])
      const postMonth = parseInt(postParts[1]) - 1
      const postDay = parseInt(postParts[2])
      const postDate = new Date(postYear, postMonth, postDay, 0, 0, 0, 0)
      
      if (timeFilter === 'custom') {
        return postDate >= cutoffDate && postDate <= endDate
      }
      return postDate >= cutoffDate && postDate <= today
    })
  }

  useEffect(() => {
    setFilteredPosts(filterPostsByDate(posts))
  }, [posts, timeFilter])

  const groupByDate = (): DayPosts[] => {
    const allPosts = filteredPosts

    const grouped: Record<string, Post[]> = {}
    
    allPosts.forEach(post => {
      if (!grouped[post.date]) {
        grouped[post.date] = []
      }
      grouped[post.date].push(post)
    })

    return Object.entries(grouped)
      .map(([date, posts]) => ({
        date,
        title: posts[0]?.title || null,
        posts: posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const handleLogout = async () => {
    const sessionToken = localStorage.getItem('sessionToken')
    
    if (sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: sessionToken }),
        })
      } catch (error) {
        console.error('登出失败:', error)
      }
    }
    
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPostImages(null)
        setShowNotifications(false)
        closeCommentModal()
      }
    }
    if (selectedPostImages || showNotifications || showCommentModal) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [selectedPostImages, showNotifications, showCommentModal])

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">加载中...</p>
          <a href="/" className="text-pink-600 hover:underline">返回首页</a>
        </div>
      </main>
    )
  }

  const dayPosts = groupByDate()
  
  const pairDays = calculatePairDays(user?.partner?.pairedAt || user?.pairedAt)
  const showPairDays = user?.partnerId && pairDays > 0

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
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${year}/${month}/${day}`
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_post':
        return '📝'
      case 'comment':
      case 'comment_reply':
        return '💬'
      case 'pair_accepted':
        return '💕'
      case 'breakup_initiated':
        return '💔'
      case 'breakup_cancelled':
        return '💗'
      case 'breakup_confirmed':
      case 'breakup_auto_confirmed':
        return '🍂'
      case 'breakup_appeal':
        return '💌'
      case 'breakup_appeal_accepted':
        return '💞'
      case 'breakup_appeal_rejected':
        return '💔'
      default:
        return '🔔'
    }
  }

  const handleAppealNotificationClick = (notification: Notification) => {
    if (notification.type === 'breakup_appeal') {
      setSelectedAppealNotification(notification)
      setShowAppealResponseModal(true)
      markNotificationAsRead(notification.id)
    }
  }

  // 渲染评论列表组件
  const renderCommentList = (postId: string, postOwnerId: string) => {
    const postComments = comments[postId] || []
    
    return (
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {postComments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">暂无评论，快来抢沙发吧～</div>
        ) : (
          postComments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {renderAvatar(comment.user.avatarUrl, comment.user.username, 'w-7 h-7 shrink-0')}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-700">{comment.user.username}</span>
                      <span className="text-xs text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {canDeleteComment(comment, postOwnerId) && (
                  <button
                    onClick={() => handleDeleteComment(comment.id, postId)}
                    className="text-xs text-gray-400 hover:text-red-500 shrink-0 ml-2"
                  >
                    删除
                  </button>
                )}
              </div>
              <p className="text-gray-700 break-words text-sm mb-2">{comment.content}</p>
              <button
                onClick={() => handleReplyClick(comment.id, comment.user.username)}
                className="text-xs text-pink-600 hover:underline"
              >
                回复
              </button>
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 space-y-2 ml-4 border-l-2 border-pink-100 pl-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-pink-50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {renderAvatar(reply.user.avatarUrl, reply.user.username, 'w-6 h-6 shrink-0')}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-700">{reply.user.username}</span>
                              <span className="text-xs text-gray-400">{formatRelativeTime(reply.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        {canDeleteComment(reply, postOwnerId) && (
                          <button
                            onClick={() => handleDeleteComment(reply.id, postId)}
                            className="text-xs text-gray-400 hover:text-red-500 shrink-0 ml-2"
                          >
                            删除
                          </button>
                        )}
                      </div>
                      <p className="text-gray-700 break-words text-sm">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    )
  }

  // 渲染评论输入框组件
  const renderCommentInput = (postId: string) => (
    <div className="flex items-center gap-2 border-t border-gray-200 p-3 bg-white">
      {renderAvatar(user.avatarUrl, user.username, 'w-8 h-8')}
      <div className="flex-1 flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendComment(postId)}
          placeholder={replyTo ? `回复 @${replyTo.username}` : '发表评论...'}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-pink-300"
        />
        <button
          onClick={() => handleSendComment(postId)}
          disabled={!newComment.trim()}
          className="px-4 py-2 text-sm bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          发送
        </button>
      </div>
    </div>
  )

  // 评论弹窗组件
  const renderCommentModal = () => {
    if (!selectedPost) return null
    
    return (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        onClick={closeCommentModal}
      >
        <div
          className="bg-white w-full sm:max-w-lg sm:rounded-xl sm:max-h-[80vh] flex flex-col animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">评论</h3>
            <button
              onClick={closeCommentModal}
              className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span>{selectedPost.date}</span>
              <span>•</span>
              <span>{formatTime(selectedPost.createdAt)}</span>
            </div>
            {selectedPost.title && (
              <p className="text-sm font-medium text-gray-700 truncate">{selectedPost.title}</p>
            )}
            {selectedPost.text && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{selectedPost.text}</p>
            )}
          </div>
          
          {renderCommentList(selectedPost.id, selectedPost.userId)}
          {renderCommentInput(selectedPost.id)}
        </div>
      </div>
    )
  }

  // 图片网格布局组件
  const renderPhotoGrid = (imageUrls: string[], postId: string) => {
    if (imageUrls.length === 0) return null

    // 1 张图：通栏大图
    if (imageUrls.length === 1) {
      return (
        <div
          className="relative w-full h-80 rounded-xl overflow-hidden bg-gray-100 cursor-pointer mb-3"
          onClick={() => setSelectedPostImages({ images: imageUrls, index: 0 })}
        >
          <img
            src={imageUrls[0]}
            alt="分享图片"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>
      )
    }

    // 2 张图：2 列均分
    if (imageUrls.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden bg-gray-100 cursor-pointer mb-3"
          onClick={() => setSelectedPostImages({ images: imageUrls, index: 0 })}
        >
          {imageUrls.map((url, idx) => (
            <div key={idx} className="relative h-48 overflow-hidden">
              <img
                src={url}
                alt={`分享图片 ${idx + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          ))}
        </div>
      )
    }

    // 3+ 张图：固定排布的 2 列网格
    const gridLayouts = [
      // 布局 1: 左图跨 2 行
      { main: 0, side: [1, 2], extra: [] },
      // 布局 2: 右图跨 2 行
      { main: 1, side: [0, 2], extra: [] },
      // 布局 3: 4 图 - 左上跨 2 行
      { main: 0, side: [1, 2], extra: [3] },
      // 布局 4: 4 图 - 右上跨 2 行
      { main: 1, side: [0, 2], extra: [3] },
      // 布局 5: 5 图 + 随机
      { main: 0, side: [1, 2], extra: [3, 4] },
    ]

    // 根据帖子 ID 生成确定性哈希，确保布局固定
    const getLayoutIndex = (postId: string, imageCount: number): number => {
      let hash = 0
      for (let i = 0; i < postId.length; i++) {
        hash = ((hash << 5) - hash) + postId.charCodeAt(i)
        hash = hash & hash
      }
      
      if (imageCount === 3) {
        return Math.abs(hash) % 2
      } else if (imageCount === 4) {
        return 2 + (Math.abs(hash) % 2)
      } else {
        return 4 + (Math.abs(hash) % 3)
      }
    }

    const layoutIndex = getLayoutIndex(postId, imageUrls.length)
    const layout = gridLayouts[Math.min(layoutIndex, gridLayouts.length - 1)]
    const displayedImages = imageUrls.slice(0, 9)

    return (
      <div 
        className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden bg-gray-100 cursor-pointer mb-3"
        onClick={() => setSelectedPostImages({ images: imageUrls, index: 0 })}
      >
        {/* 主图 - 跨 2 行 */}
        <div className="row-span-2 relative h-96 overflow-hidden">
          <img
            src={displayedImages[layout.main]}
            alt={`分享图片 ${layout.main + 1}`}
            className="w-full h-full object-cover rounded-xl"
          />
        </div>
        
        {/* 侧边图 */}
        {layout.side.map((imgIdx) => (
          <div key={imgIdx} className="relative h-48 overflow-hidden">
            <img
              src={displayedImages[imgIdx]}
              alt={`分享图片 ${imgIdx + 1}`}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        ))}
        
        {/* 额外图片 */}
        {layout.extra && layout.extra.map((imgIdx) => (
          <div key={imgIdx} className="relative h-48 overflow-hidden">
            <img
              src={displayedImages[imgIdx]}
              alt={`分享图片 ${imgIdx + 1}`}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        ))}
        
        {/* 超过 9 张图显示数量 */}
        {imageUrls.length > 9 && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl font-bold">+{imageUrls.length - 9}</span>
          </div>
        )}
      </div>
    )
  }

  // 自定义排版渲染组件
  const renderCustomLayout = (post: Post) => {
    if (!post.layoutConfig?.images || post.layoutConfig.images.length === 0) return null

    const allImageUrls = post.imageUrls || []
    const layoutImages = post.layoutConfig.images

    return (
      <div 
        className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer mb-3"
        onClick={() => setSelectedPostImages({ images: allImageUrls, index: 0 })}
      >
        {layoutImages.map((img, index) => (
          <div
            key={img.url + index}
            className="absolute overflow-hidden"
            style={{
              left: `${(img.col / 3) * 100}%`,
              top: `${(img.row / 3) * 100}%`,
              width: `${(img.colSpan / 3) * 100}%`,
              height: `${(img.rowSpan / 3) * 100}%`,
              padding: '2px',
            }}
          >
            <img
              src={img.url}
              alt={`分享图片 ${index + 1}`}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        ))}
      </div>
    )
  }

  // 帖子卡片组件
  const renderPostCard = (post: Post) => {
    const postOwner = post.owner === '我' ? user : user?.partner

    return (
      <div key={post.id} className="bg-white border-b border-gray-100 pb-4 px-4">
        {/* 头部 - 用户信息 */}
        <div className="flex items-center gap-3 mb-3 pt-4">
          {renderAvatar(postOwner?.avatarUrl || null, postOwner?.username || '未知', 'w-10 h-10')}
          <span className="font-semibold text-gray-900 text-base">
            {postOwner?.username || '未知'}
          </span>
        </div>

        {/* 图片网格/自定义排版 */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          post.layoutConfig?.images 
            ? renderCustomLayout(post)
            : renderPhotoGrid(post.imageUrls, post.id)
        )}

        {/* 文字内容 */}
        {(post.text || post.location) && (
          <div className="mb-3">
            {post.text && (
              <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap break-words mb-2">
                {post.text}
              </p>
            )}
            {post.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {extractCity(post.location)}
              </div>
            )}
          </div>
        )}

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => openCommentModal(post)}
              className={`flex items-center gap-1.5 text-sm ${
                comments[post.id]?.length > 0 
                  ? 'text-pink-500' 
                  : 'text-gray-400'
              } hover:text-pink-600 transition`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {comments[post.id]?.length > 0 && (
                <span>{comments[post.id].length}</span>
              )}
            </button>
          </div>
          <span className="text-xs text-gray-400">{formatTime(post.createdAt)}</span>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[500px] mx-auto px-4 py-3 flex items-center justify-between">
          {/* 左侧：时间筛选图标 */}
          {user?.partnerId && (
            <div className="flex items-center relative">
              <button
                onClick={() => setShowDateFilter(true)}
                className="p-2 hover:bg-gray-50 rounded-full transition"
                title="时间筛选"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              {timeFilter !== 'all' && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full"></span>
              )}
            </div>
          )}
          
          {/* 中间：标题 */}
          <h1 className="text-lg font-bold text-gray-900">UsOnly</h1>
          
          {/* 右侧：发布 + 通知 */}
          <div className="flex items-center gap-1">
            <a
              href="/post"
              className="p-2 hover:bg-gray-50 rounded-full transition"
              title="发布分享"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </a>

            {/* 通知图标 */}
            <div className="relative inline-flex items-center">
              <button
                onClick={async () => {
                  const newState = !showNotifications
                  setShowNotifications(newState)
                  if (newState && user) {
                    await loadNotifications(user)
                  }
                }}
                className="relative p-2 hover:bg-gray-50 rounded-full transition"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
              )}
              
              {/* 通知下拉面板 */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-[80vh] overflow-y-auto">
                  <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">通知</h3>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllNotificationsAsRead}
                          className="text-xs text-pink-600 hover:underline"
                        >
                          全部已读
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={handleDeleteAllNotifications}
                          className="text-xs text-red-600 hover:underline"
                        >
                          一键删除
                        </button>
                      )}
                    </div>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      暂无通知
                    </div>
                  ) : (
                    <div>
                      {notifications.map(notification => {
                        const isClickable = (notification.type === 'comment' || notification.type === 'comment_reply' || notification.type === 'new_post') && notification.post
                        const isAppealClickable = notification.type === 'breakup_appeal'
                        
                        return (
                          <div
                            key={notification.id}
                            onClick={() => {
                              if (isClickable) handleNotificationClick(notification)
                              else if (isAppealClickable) handleAppealNotificationClick(notification)
                            }}
                            className={`p-3 border-b border-gray-100 last:border-b-0 transition relative ${
                              !notification.isRead ? 'bg-pink-50' : ''
                            } ${(isClickable || isAppealClickable) ? 'hover:bg-gray-50 cursor-pointer' : 'hover:bg-gray-50'}`}
                          >
                            <div className="flex gap-2">
                              <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 truncate">
                                  {notification.sender && (
                                    <span className="font-medium">{notification.sender.username}</span>
                                  )}
                                  {' '}{notification.content}
                                </p>
                                <p className="text-xs text-gray-500">{formatRelativeTime(notification.createdAt)}</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteNotification(notification.id)
                              }}
                              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 日期筛选弹窗 */}
      {showDateFilter && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDateFilter(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">时间筛选</h3>
              <button
                onClick={() => setShowDateFilter(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setTimeFilter('all')
                  setShowDateFilter(false)
                }}
                className={`w-full py-3 px-4 rounded-lg text-left flex items-center justify-between ${
                  timeFilter === 'all' 
                    ? 'bg-pink-100 text-pink-600' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">全部</span>
                {timeFilter === 'all' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => {
                  setTimeFilter('7days')
                  setShowDateFilter(false)
                }}
                className={`w-full py-3 px-4 rounded-lg text-left flex items-center justify-between ${
                  timeFilter === '7days' 
                    ? 'bg-pink-100 text-pink-600' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">最近 7 天</span>
                {timeFilter === '7days' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => {
                  setTimeFilter('30days')
                  setShowDateFilter(false)
                }}
                className={`w-full py-3 px-4 rounded-lg text-left flex items-center justify-between ${
                  timeFilter === '30days' 
                    ? 'bg-pink-100 text-pink-600' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">最近 30 天</span>
                {timeFilter === '30days' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDateFilter(false)
                  setShowCustomDateRange(true)
                }}
                className={`w-full py-3 px-4 rounded-lg text-left flex items-center justify-between ${
                  timeFilter === 'custom' 
                    ? 'bg-pink-100 text-pink-600' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">自定义</span>
                {timeFilter === 'custom' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowDateFilter(false)}
                className="w-full py-2 text-gray-500 hover:text-gray-700"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自定义日期范围弹窗 */}
      {showCustomDateRange && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCustomDateRange(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">自定义时间范围</h3>
              <button
                onClick={() => setShowCustomDateRange(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-300"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setCustomStartDate('')
                  setCustomEndDate('')
                  setTimeFilter('all')
                  setShowCustomDateRange(false)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
              >
                清空
              </button>
              <button
                onClick={() => {
                  if (customStartDate && customEndDate) {
                    setTimeFilter('custom')
                    setShowCustomDateRange(false)
                  } else {
                    alert('请选择开始和结束日期')
                  }
                }}
                className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 挽回配对横幅 */}
      {showAppealBanner && user?.partnerId && (
        <div className="max-w-[500px] mx-auto px-4 mb-4">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg mb-1">💕 挽回配对</p>
                <p className="text-sm text-pink-100">你的伴侣发起了取消配对，现在还有 7 天冷静期，发送挽回请求恢复关系吧！</p>
              </div>
              <button
                onClick={handleAppeal}
                disabled={appealLoading}
                className="px-6 py-2 bg-white text-pink-600 rounded-full font-medium hover:bg-pink-50 disabled:opacity-50 shrink-0 ml-4"
              >
                {appealLoading ? '发送中...' : '发送挽回请求'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 时间轴内容 */}
      <div className="max-w-[500px] mx-auto pb-20">
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : dayPosts.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="mb-2">还没有分享</p>
            {timeFilter !== 'all' && (
              <button
                onClick={() => setTimeFilter('all')}
                className="text-pink-600 hover:underline text-sm"
              >
                切换为"全部"时间范围
              </button>
            )}
          </div>
        ) : (
          <div>
            {dayPosts.map((day) => (
              <div key={day.date}>
                {/* 日期标签 */}
                <div className="sticky top-14 z-30 bg-white/90 backdrop-blur-sm py-2 px-4 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">
                    {formatDate(day.date)}
                  </span>
                </div>
                
                {/* 帖子列表 */}
                <div className="divide-y divide-gray-100">
                  {day.posts.map((post) => renderPostCard(post))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 图片放大查看器 */}
      {selectedPostImages && (
        <ImageGallery
          images={selectedPostImages.images}
          initialIndex={selectedPostImages.index}
          onClose={() => setSelectedPostImages(null)}
        />
      )}

      {/* 评论弹窗 */}
      {showCommentModal && (
        <CommentModal
          post={selectedPost}
          user={user ? { id: user.id, username: user.username, avatarUrl: user.avatarUrl } : null}
          isOpen={showCommentModal}
          onClose={closeCommentModal}
          onCommentSuccess={() => {
            if (user) {
              loadNotifications(user)
            }
          }}
        />
      )}

      {/* 挽回响应弹窗 */}
      {showAppealResponseModal && selectedAppealNotification && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAppealResponseModal(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <span className="text-4xl">💌</span>
              <h3 className="text-lg font-bold text-gray-800 mt-2">挽回配对请求</h3>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              {selectedAppealNotification.sender?.username} 发送了挽回请求
            </p>
            <p className="text-gray-500 text-xs mb-6">
              {selectedAppealNotification.content}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleAppealResponse(false)}
                disabled={appealLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50"
              >
                拒绝
              </button>
              <button
                onClick={() => handleAppealResponse(true)}
                disabled={appealLoading}
                className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50"
              >
                {appealLoading ? '处理中...' : '接受'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-[500px] mx-auto flex">
          <a href="/timeline" className="flex-1 py-3 text-center text-pink-600">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px]">时间轴</span>
          </a>
          <a href="/map" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px]">足迹</span>
          </a>
          <a href="/profile" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px]">我的</span>
          </a>
        </div>
      </nav>
    </main>
  )
}