'use client'

import { useState, useEffect } from 'react'

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

interface SidebarDrawerProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  timeFilter: 'all' | '7days' | '30days' | 'custom'
  onTimeFilterChange: (filter: 'all' | '7days' | '30days' | 'custom') => void
  showCustomDateRange: () => void
  unreadCount: number
  notifications: Notification[]
  onNotificationClick: (notification: Notification) => void
  onMarkAllAsRead: () => void
  onDeleteNotification: (id: string) => void
  onDeleteAllNotifications: () => void
  onAppealNotificationClick: (notification: Notification) => void
}

// 生成默认头像颜色
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

// 获取通知图标
const getNotificationIcon = (type: string): string => {
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

export default function SidebarDrawer({
  isOpen,
  onClose,
  user,
  timeFilter,
  onTimeFilterChange,
  showCustomDateRange,
  unreadCount,
  notifications,
  onNotificationClick,
  onMarkAllAsRead,
  onDeleteNotification,
  onDeleteAllNotifications,
  onAppealNotificationClick,
}: SidebarDrawerProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showTimeFilter, setShowTimeFilter] = useState(false)

  // 监听 ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNotifications) {
          setShowNotifications(false)
        } else if (showTimeFilter) {
          setShowTimeFilter(false)
        } else {
          onClose()
        }
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, showNotifications, showTimeFilter, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* 侧边栏 */}
      <div
        className="fixed left-0 top-14 w-56 bg-white z-50 rounded-b-xl shadow-lg animate-slideRight"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 菜单项 */}
        <div className="p-1">
          {/* 通知 */}
          <button
            onClick={() => setShowNotifications(true)}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* 时间筛选 */}
          <button
            onClick={() => setShowTimeFilter(true)}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              {timeFilter !== 'all' && (
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* 时间筛选弹窗 */}
      {showTimeFilter && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowTimeFilter(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">时间筛选</h3>
              <button
                onClick={() => setShowTimeFilter(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  onTimeFilterChange('all')
                  setShowTimeFilter(false)
                }}
                className={`w-full py-3 px-4 rounded-lg text-left flex items-center justify-between ${
                  timeFilter === 'all' 
                    ? 'bg-gray-200 text-gray-900'
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
                  onTimeFilterChange('7days')
                  setShowTimeFilter(false)
                }}
                className={`w-full py-3 px-4 rounded-lg text-left flex items-center justify-between ${
                  timeFilter === '7days' 
                    ? 'bg-gray-200 text-gray-900' 
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
                  onTimeFilterChange('30days')
                  setShowTimeFilter(false)
                }}
                className={`w-full py-3 px-4 rounded-lg text-left flex items-center justify-between ${
                  timeFilter === '30days'
                    ? 'bg-gray-200 text-gray-900'
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
                  setShowTimeFilter(false)
                  showCustomDateRange()
                }}
                className={`w-full py-3 px-4 rounded-lg text-left flex items-center justify-between ${
                  timeFilter === 'custom'
                    ? 'bg-gray-200 text-gray-900'
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
                onClick={() => setShowTimeFilter(false)}
                className="w-full py-2 text-gray-500 hover:text-gray-700"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通知弹窗 */}
      {showNotifications && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-xl p-0 animate-slideUp max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-semibold text-gray-900">通知</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-xs text-gray-600 hover:underline"
                  >
                    全部已读
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={onDeleteAllNotifications}
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
              <div className="overflow-y-auto flex-1">
                {notifications.map(notification => {
                  const isClickable = (notification.type === 'comment' || notification.type === 'comment_reply' || notification.type === 'new_post') && notification.post
                  const isAppealClickable = notification.type === 'breakup_appeal'
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (isClickable) {
                          onNotificationClick(notification)
                          setShowNotifications(false)
                          onClose()
                        } else if (isAppealClickable) {
                          onAppealNotificationClick(notification)
                          setShowNotifications(false)
                        }
                      }}
                      className={`p-3 border-b border-gray-100 last:border-b-0 transition relative ${
                        !notification.isRead ? 'bg-gray-50' : ''
                      } ${(isClickable || isAppealClickable) ? 'hover:bg-gray-50 cursor-pointer' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex gap-2">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
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
                          onDeleteNotification(notification.id)
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
        </div>
      )}
    </>
  )
}