'use client'

import { useState, useEffect } from 'react'

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
  expiresAt: string
  sender: {
    id: string
    username: string
    avatarUrl: string | null
  } | null
  post: {
    id: string
    imageUrl: string | null
  } | null
}

interface ReplyToState {
  commentId: string
  username: string
}

export default function TimelinePage() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [partnerPosts, setPartnerPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'mine' | 'partner' | 'both'>('both')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
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

  // 渲染标签页小头像组件（w-5 h-5）
  const renderTabAvatar = (avatarUrl: string | null, name: string) => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className="w-5 h-5 rounded-full object-cover border border-gray-200"
        />
      )
    }
    const color = getDefaultAvatarColor(name)
    return (
      <div className="w-5 h-5 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[10px] font-bold">
        {getInitial(name)}
      </div>
    )
  }

  // 检查是否可以删除评论
  const canDeleteComment = (comment: Comment, postOwnerId: string): boolean => {
    // 评论者可以删除自己的评论
    if (comment.user.id === user?.id) return true
    // 分享作者可以删除他人对自己分享的评论
    if (postOwnerId === user?.id) return true
    return false
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      loadPosts(parsedUser)
      loadNotifications(parsedUser)
    }
  }, [])

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
      if (myData.posts) {
        const postsWithOwner = myData.posts.map((p: Post) => ({ ...p, owner: '我' as const }))
        setPosts(postsWithOwner)
      }

      if (partnerRes) {
        const partnerData = await partnerRes.json()
        if (partnerData.posts) {
          const postsWithOwner = partnerData.posts.map((p: Post) => ({ ...p, owner: 'TA' as const }))
          setPartnerPosts(postsWithOwner)
        }
      }
    } catch (error) {
      console.error('加载分享失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 当帖子列表加载完成后，加载所有帖子的评论数据
  useEffect(() => {
    if (posts.length === 0 && partnerPosts.length === 0) return

    const allPostIds = [...posts, ...partnerPosts].map(p => p.id)
    const loadedPostIds = Object.keys(comments)

    // 只加载尚未加载的帖子评论
    const postsToLoad = allPostIds.filter(id => !loadedPostIds.includes(id))

    if (postsToLoad.length === 0) return

    postsToLoad.forEach(postId => loadCommentCount(postId))
  }, [posts, partnerPosts])

  // 只加载评论数据（包含完整评论列表，用于显示数量）
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
      if (data.notifications) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('加载通知失败:', error)
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
      }
    } catch (error) {
      console.error('发表评论失败:', error)
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

  // 删除单条通知
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

  // 删除所有通知
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

  // 处理通知点击
  const handleNotificationClick = async (notification: Notification) => {
    setShowNotifications(false)
    
    // 如果是评论相关的通知，跳转到对应分享并打开评论弹窗
    if ((notification.type === 'comment' || notification.type === 'comment_reply') && notification.post) {
      // 找到对应的帖子
      const targetPost = posts.find(p => p.id === notification.post!.id) || 
                         partnerPosts.find(p => p.id === notification.post!.id)
      
      if (targetPost) {
        // 打开评论弹窗
        setSelectedPost(targetPost)
        setShowCommentModal(true)
        setNewComment('')
        setReplyTo(undefined)
        await loadComments(targetPost.id)
      }
    }
  }

  // 打开评论弹窗
  const openCommentModal = (post: Post) => {
    setSelectedPost(post)
    setShowCommentModal(true)
    setNewComment('')
    setReplyTo(undefined)
    loadComments(post.id)
  }

  // 关闭评论弹窗
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

  const getDisplayPosts = () => {
    if (activeTab === 'mine') return posts.map(p => ({ ...p, owner: '我' as const }))
    if (activeTab === 'partner') return partnerPosts.map(p => ({ ...p, owner: 'TA' as const }))
    return []
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null)
        setShowNotifications(false)
        closeCommentModal()
      }
    }
    if (selectedImage || showNotifications || showCommentModal) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [selectedImage, showNotifications, showCommentModal])

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">加载中...</p>
          <a href="/" className="text-pink-600 hover:underline">返回首页</a>
        </div>
      </main>
    )
  }

  const dayPosts = groupByDate()
  const displayPosts = getDisplayPosts()

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_post':
        return '📝'
      case 'comment':
      case 'comment_reply':
        return '💬'
      case 'pair_accepted':
        return '💕'
      default:
        return '🔔'
    }
  }

  // 渲染评论列表组件（弹窗内使用）
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
              {/* 回复列表 */}
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
          {/* 顶部栏 */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">评论</h3>
            <button
              onClick={closeCommentModal}
              className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          
          {/* 帖子信息 */}
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
          
          {/* 评论列表 */}
          {renderCommentList(selectedPost.id, selectedPost.userId)}
          
          {/* 评论输入框 */}
          {renderCommentInput(selectedPost.id)}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex relative">
          <h1 className="text-xl font-bold text-gray-800 absolute left-1/2 -translate-x-1/2">UsOnly</h1>
          <div className="flex items-center ml-auto">
            {/* 通知图标 */}
            <div className="relative">
              <button
                onClick={async () => {
                  const newState = !showNotifications
                  setShowNotifications(newState)
                  // 打开通知面板时重新加载通知，更新未读数量
                  if (newState && user) {
                    await loadNotifications(user)
                  }
                }}
                className="relative p-1 hover:bg-gray-100 rounded-full transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* 通知下拉面板 */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">通知</h3>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500">2 天后自动过期</span>
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
                        // 评论相关的通知可点击
                        const isClickable = (notification.type === 'comment' || notification.type === 'comment_reply') && notification.post
                        
                        return (
                          <div
                            key={notification.id}
                            onClick={() => isClickable && handleNotificationClick(notification)}
                            className={`p-3 border-b last:border-b-0 transition relative ${
                              !notification.isRead ? 'bg-pink-50' : ''
                            } ${isClickable ? 'hover:bg-gray-50 cursor-pointer' : 'hover:bg-gray-50'}`}
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
                            {/* 删除按钮 */}
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

      {/* 标签页 */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className={`flex bg-white rounded-lg shadow-sm p-1 ${!user.partnerId ? 'justify-center' : ''}`}>
          {/* 我的标签 - 始终显示 */}
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition ${
              activeTab === 'mine' ? 'bg-pink-100 text-pink-600' : 'text-gray-500'
            } ${user.partnerId ? 'flex-1' : 'w-full'}`}
          >
            {renderTabAvatar(user.avatarUrl, user.username)}
            <span>{user.username}</span>
          </button>
          
          {/* 配对后才显示另外两个标签 */}
          {user.partnerId && user.partner && (
            <>
              {/* 我们的标签 - 显示双方头像 + 心形符号 */}
              <button
                onClick={() => setActiveTab('both')}
                className={`flex items-center justify-center gap-1 py-2 text-sm font-medium rounded-md transition ${
                  activeTab === 'both' ? 'bg-pink-100 text-pink-600' : 'text-gray-500'
                } flex-1`}
              >
                {renderTabAvatar(user.avatarUrl, user.username)}
                <span className="text-pink-500">❤️</span>
                {renderTabAvatar(user.partner.avatarUrl, user.partner.username)}
              </button>
              
              {/* TA 的标签 - 显示对方头像 + 对方用户名 */}
              <button
                onClick={() => setActiveTab('partner')}
                className={`flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition ${
                  activeTab === 'partner' ? 'bg-pink-100 text-pink-600' : 'text-gray-500'
                } flex-1`}
              >
                {renderTabAvatar(user.partner.avatarUrl, user.partner.username)}
                <span>{user.partner.username}</span>
              </button>
            </>
          )}
        </div>
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

      {/* 评论弹窗 */}
      {showCommentModal && selectedPost && renderCommentModal()}

      {/* 时间轴 */}
      <div className="max-w-3xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : activeTab !== 'both' ? (
          <div className="space-y-4">
            {displayPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>还没有分享</p>
                <a href="/post" className="text-pink-600 hover:underline">去发布第一条</a>
              </div>
            ) : (
              displayPosts.map((post) => (
                <div key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-gray-400">
                          {new Date(post.date).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{formatTime(post.createdAt)}</span>
                    </div>
                    {post.title && (
                      <p className="text-sm font-medium text-gray-700 mb-2">{post.title}</p>
                    )}
                    {post.imageUrl && (
                      <div className="mb-3">
                        <img
                          src={post.imageUrl}
                          alt="分享图片"
                          className="w-full h-48 object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition"
                          onClick={() => setSelectedImage(post.imageUrl!)}
                        />
                      </div>
                    )}
                    {post.text && (
                      <p className="text-gray-700 whitespace-pre-wrap">{post.text}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {dayPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>还没有分享</p>
                <a href="/post" className="text-pink-600 hover:underline">去发布第一条</a>
              </div>
            ) : (
              dayPosts.map((day) => (
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

                  {/* 并排内容 - 保持并排布局 */}
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
                              
                              {/* 评论按钮 */}
                              <div className="mt-2 flex items-center gap-4">
                                <button
                                  onClick={() => openCommentModal(post)}
                                  className="text-xs text-gray-500 hover:text-pink-600 flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  评论
                                  {comments[post.id] && comments[post.id].length > 0 && (
                                    <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                                      {comments[post.id].length}
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* 分隔线 */}
                      <div className="w-px bg-gradient-to-b from-pink-200 via-purple-200 to-pink-200" />

                      {/* TA 的分享列 */}
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {renderAvatar(user.partner?.avatarUrl || null, user.partner?.username || 'TA', 'w-8 h-8')}
                          <span className="text-sm font-medium text-purple-600">
                            {user.partner?.username || 'TA'}
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
                              
                              {/* 评论按钮 */}
                              <div className="mt-2 flex items-center gap-4">
                                <button
                                  onClick={() => openCommentModal(post)}
                                  className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  评论
                                  {comments[post.id] && comments[post.id].length > 0 && (
                                    <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                                      {comments[post.id].length}
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-3xl mx-auto flex">
          <a href="/timeline" className="flex-1 py-3 text-center text-pink-600">
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