'use client'

import { useState, useEffect } from 'react'

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

interface User {
  id: string
  username: string
  avatarUrl: string | null
}

interface ReplyToState {
  commentId: string
  username: string
}

interface CommentModalProps {
  post: Post | null
  user: User | null
  isOpen: boolean
  onClose: () => void
  onCommentSuccess?: () => void
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

// 格式化时间显示 HH:MM
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

export default function CommentModal({
  post,
  user,
  isOpen,
  onClose,
  onCommentSuccess,
}: CommentModalProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState<string>('')
  const [replyTo, setReplyTo] = useState<ReplyToState | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  // 检查是否可以删除评论
  const canDeleteComment = (comment: Comment): boolean => {
    if (!post) return false
    // 评论者可以删除自己的评论
    if (comment.user.id === user?.id) return true
    // 分享作者可以删除他人对自己分享的评论
    if (post.userId === user?.id) return true
    return false
  }

  // 加载评论
  const loadComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/comment?postId=${postId}`)
      const data = await res.json()
      if (data.comments) {
        setComments(data.comments)
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    }
  }

  // 发表评论
  const handleSendComment = async () => {
    const content = newComment.trim()
    if (!content || !post) return

    try {
      const body: { postId: string; content: string; parentId?: string } = {
        postId: post.id,
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
        await loadComments(post.id)
        setNewComment('')
        setReplyTo(undefined)
        onCommentSuccess?.()
      } else {
        alert('评论失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('发表评论失败:', error)
      alert('评论失败，请重试')
    }
  }

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    if (!post) return
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
        await loadComments(post.id)
      }
    } catch (error) {
      console.error('删除评论失败:', error)
    }
  }

  // 处理回复点击
  const handleReplyClick = (commentId: string, username: string) => {
    setReplyTo({ commentId, username })
    setNewComment(`@${username} `)
  }

  // 取消回复
  const cancelReply = () => {
    setReplyTo(undefined)
    setNewComment('')
  }

  // 加载评论
  useEffect(() => {
    if (isOpen && post) {
      loadComments(post.id)
      setNewComment('')
      setReplyTo(undefined)
    }
  }, [isOpen, post])

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen || !post) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-xl sm:max-h-[80vh] flex flex-col animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部栏 */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">评论</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        
        {/* 帖子信息 */}
        <div className="p-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span>{post.date}</span>
            <span>•</span>
            <span>{formatTime(post.createdAt)}</span>
          </div>
          {post.title && (
            <p className="text-sm font-medium text-gray-700 truncate">{post.title}</p>
          )}
          {post.text && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.text}</p>
          )}
        </div>
        
        {/* 评论列表 */}
        <div className="flex-1 overflow-y-auto space-y-3 p-3">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">暂无评论，快来抢沙发吧～</div>
          ) : (
            comments.map((comment) => (
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
                  {canDeleteComment(comment) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
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
                          {canDeleteComment(reply) && (
                            <button
                              onClick={() => handleDeleteComment(reply.id)}
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
        
        {/* 评论输入框 */}
        <div className="flex items-center gap-2 border-t border-gray-200 p-3 bg-white">
          {renderAvatar(user?.avatarUrl || '', user?.username || '用户', 'w-8 h-8')}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              placeholder={replyTo ? `回复 @${replyTo.username}` : '发表评论...'}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-pink-300"
            />
            <button
              onClick={handleSendComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 text-sm bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}