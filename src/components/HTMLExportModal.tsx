'use client'

import { useState, useEffect } from 'react'

interface Post {
  id: string
  userId: string
  date: string
  title: string | null
  imageUrls: string[] | null
  text: string | null
  createdAt: string
  location?: string | null
  comments?: Comment[]
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    username: string
    avatarUrl: string | null
  }
  replies?: Comment[]
}

interface User {
  id: string
  username: string
  avatarUrl: string | null
  partnerId?: string | null
  partner?: {
    id: string
    username: string
    avatarUrl: string | null
  } | null
}

interface HTMLExportModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

type DateRange = '7days' | '30days' | 'all' | 'custom'

export default function HTMLExportModal({ isOpen, onClose, user }: HTMLExportModalProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30days')
  const [includeComments, setIncludeComments] = useState(true)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [postsData, setPostsData] = useState<{ date: string; myPosts: Post[]; partnerPosts: Post[] }[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [previewCount, setPreviewCount] = useState(0)

  useEffect(() => {
    if (isOpen && user) {
      loadPostsData()
    }
  }, [isOpen, dateRange, customStartDate, customEndDate])

  const loadPostsData = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      // 计算日期范围
      let startDate: string
      let endDate: string
      
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      
      switch (dateRange) {
        case '7days':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          endDate = todayStr
          break
        case '30days':
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          endDate = todayStr
          break
        case 'all':
          startDate = '2020-01-01'
          endDate = todayStr
          break
        case 'custom':
          startDate = customStartDate || '2020-01-01'
          endDate = customEndDate || todayStr
          break
        default:
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          endDate = todayStr
      }

      // 获取我的帖子
      const [myPostsRes, partnerPostsRes] = await Promise.all([
        fetch(`/api/post?startDate=${startDate}&endDate=${endDate}`, {
          headers: { 'x-user-id': user.id }
        }),
        user.partnerId ? fetch(`/api/post?startDate=${startDate}&endDate=${endDate}&partnerId=${user.partnerId}`, {
          headers: { 'x-user-id': user.id }
        }) : Promise.resolve(null)
      ])

      const myPostsData = await myPostsRes.json()
      const partnerPostsData = partnerPostsRes ? await partnerPostsRes.json() : { posts: [] }

      // 按日期分组
      const allDates = new Set([
        ...myPostsData.posts.map((p: Post) => p.date),
        ...partnerPostsData.posts.map((p: Post) => p.date)
      ])

      const grouped = Array.from(allDates).sort((a, b) => b.localeCompare(a)).map(date => ({
        date,
        myPosts: myPostsData.posts.filter((p: Post) => p.date === date),
        partnerPosts: partnerPostsData.posts.filter((p: Post) => p.date === date)
      }))

      setPostsData(grouped)
      setPreviewCount(grouped.reduce((acc, day) => acc + day.myPosts.length + day.partnerPosts.length, 0))
    } catch (error) {
      console.error('加载帖子数据失败:', error)
    } finally {
      setLoading(false)
    }
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

  // 渲染头像
  const renderAvatar = (avatarUrl: string | null, name: string, size: string = '24'): string => {
    if (avatarUrl) {
      return `<img src="${avatarUrl}" alt="${name}" class="w-[${size}] h-[${size}] rounded-full object-cover border border-gray-200" onerror="this.style.display='none'">`
    }
    const color = getDefaultAvatarColor(name)
    return `<div class="w-[${size}] h-[${size}] rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold">${getInitial(name)}</div>`
  }

  const generateHTML = (postsWithComments: { date: string; myPosts: Post[]; partnerPosts: Post[] }[]) => {
    const exportDate = new Date().toLocaleDateString('zh-CN')
    const myUsername = user?.username || '我'
    const partnerUsername = user?.partner?.username || 'TA'
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UsOnly 回忆录</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif;
      background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    
    /* 封面页样式 */
    .cover {
      text-align: center;
      padding: 80px 20px;
      background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
      border-radius: 20px;
      margin-bottom: 30px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      position: relative;
    }
    
    .cover h1 {
      font-size: 42px;
      color: #db2777;
      margin-bottom: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    
    .cover-info {
      position: absolute;
      bottom: 20px;
      right: 30px;
      text-align: right;
    }
    
    .cover-info p {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    
    /* 日期 section 样式 - 渐变边框从左到右粉色到紫色 */
    .date-section {
      background: white;
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      overflow: hidden;
      /* 使用渐变边框 */
      border: 2px solid transparent;
      background: linear-gradient(white, white) padding-box,
                  linear-gradient(to right, #fbcfe8, #e9d5ff) border-box;
    }
    
    .date-header {
      background: linear-gradient(to right, #fce7f3, #f3e8ff);
      padding: 16px 24px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .date-header-title {
      font-size: 18px;
      font-weight: bold;
      color: #374151;
    }
    
    .date-header-date {
      font-size: 13px;
      color: #6b7280;
      margin-left: 8px;
    }
    
    /* 帖子内容区域 */
    .posts-container {
      display: flex;
      gap: 24px;
      padding: 24px;
    }
    
    .posts-column {
      flex: 1;
      min-width: 0;
    }
    
    .column-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .column-header .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid #e5e7eb;
    }
    
    .column-header .username {
      font-size: 14px;
      font-weight: 500;
    }
    
    .column-header .username.my {
      color: #db2777;
    }
    
    .column-header .username.partner {
      color: #9333ea;
    }
    
    /* 帖子卡片样式 */
    .post-card {
      background: #fef2f2;
      border: 1px solid #fbcfe8;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
    }
    
    .post-card.partner {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
    }
    
    .post-card:last-child {
      margin-bottom: 0;
    }
    
    .post-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .post-title {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }
    
    .post-time {
      font-size: 12px;
      color: #9ca3af;
    }
    
    .post-image {
      width: 100%;
      height: 160px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    
    .post-text {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    
    /* 地点信息样式 */
    .post-location {
      font-size: 12px;
      color: #6b7280;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    /* 评论区域样式 */
    .comments-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f3f4f6;
    }
    
    .comment-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px;
      background: #fafafa;
      border-radius: 8px;
      margin-bottom: 6px;
    }
    
    .comment-item:last-child {
      margin-bottom: 0;
    }
    
    .comment-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    
    .comment-body {
      flex: 1;
      min-width: 0;
    }
    
    .comment-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    
    .comment-username {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
    }
    
    .comment-text {
      font-size: 13px;
      color: #4b5563;
      line-height: 1.4;
    }
    
    /* 打印按钮 */
    .print-btn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 16px 32px;
      background: #db2777;
      color: white;
      border: none;
      border-radius: 50px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(219, 39, 119, 0.4);
      transition: all 0.3s ease;
      z-index: 100;
    }
    
    .print-btn:hover {
      background: #be185d;
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(219, 39, 119, 0.5);
    }
    
    /* 空状态 */
    .empty-state {
      text-align: center;
      padding: 24px;
      background: #f9fafb;
      border-radius: 12px;
      color: #9ca3af;
      font-size: 14px;
    }
    
    /* 打印样式 */
    @media print {
      .print-btn {
        display: none !important;
      }
      
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: auto !important;
        width: 100% !important;
      }
      
      @page {
        size: A4;
        margin: 1.5cm;
      }
      
      .container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        width: 100% !important;
      }
      
      .cover {
        box-shadow: none !important;
        page-break-after: always !important;
        background: #ffffff !important;
      }
      
      .date-section {
        box-shadow: none !important;
        page-break-inside: avoid !important;
        margin-bottom: 16px !important;
        background: #ffffff !important;
        /* 打印时也使用渐变边框 */
        border: 2px solid transparent !important;
        background: linear-gradient(#ffffff, #ffffff) padding-box,
                    linear-gradient(to right, #fbcfe8, #e9d5ff) border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .date-header {
        background: linear-gradient(to right, #fce7f3, #f3e8ff) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .post-card {
        break-inside: avoid !important;
      }
      
      .post-card {
        background: #fef2f2 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .post-card.partner {
        background: #faf5ff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .comment-item {
        background: #fafafa !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .empty-state {
        background: #f9fafb !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* 保持并排布局 */
      .posts-container {
        display: flex !important;
        flex-direction: row !important;
        gap: 24px !important;
        padding: 24px !important;
        background: #ffffff !important;
      }
      
      .posts-column {
        flex: 1 !important;
        min-width: 0 !important;
        background: #ffffff !important;
      }
      
      /* 确保背景色正确打印 */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    
    /* 移动端适配 */
    @media (max-width: 768px) {
      .posts-container {
        flex-direction: column;
        gap: 16px;
      }
      
      .cover-info {
        position: static;
        text-align: center;
        margin-top: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 封面页 -->
    <div class="cover">
      <h1>
        <span style="font-size: 48px;">❤️</span>
        UsOnly 回忆录
      </h1>
      <div class="cover-info">
        <p>导出日期：${exportDate}</p>
        <p>共 ${postsWithComments.length} 天的分享，${previewCount} 条内容</p>
      </div>
    </div>
    
    <!-- 内容页 -->
    ${postsWithComments.map(day => {
      const myUsername = user?.username || '我'
      const partnerUsername = user?.partner?.username || 'TA'
      const myAvatarHtml = user?.avatarUrl 
        ? `<img src="${user.avatarUrl}" alt="${myUsername}" class="avatar">`
        : `<div class="avatar w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">${getInitial(myUsername)}</div>`
      
      const partnerAvatarHtml = user?.partner?.avatarUrl 
        ? `<img src="${user.partner.avatarUrl}" alt="${partnerUsername}" class="avatar">`
        : `<div class="avatar w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">${getInitial(partnerUsername)}</div>`
      
      return `
    <div class="date-section">
      <div class="date-header">
        <span class="date-header-title">${day.date}</span>
      </div>
      <div class="posts-container">
        <!-- 我的分享列 -->
        <div class="posts-column">
          <div class="column-header">
            ${myAvatarHtml}
            <span class="username my">${myUsername}</span>
          </div>
          ${day.myPosts.length > 0 ? `
            ${day.myPosts.map(post => `
            <div class="post-card">
              <div class="post-card-header">
                ${post.title ? `<span class="post-title">${post.title}</span>` : ''}
                <span class="post-time">${new Date(post.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              ${post.imageUrls && post.imageUrls.length > 0 ? `<img src="${post.imageUrls[0]}" alt="分享图片" class="post-image" onerror="this.style.display='none'">` : ''}
              ${post.text ? `<div class="post-text">${post.text}</div>` : ''}
              ${post.location ? `
              <div class="post-location">
                <svg class="w-3 h-3 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                ${post.location}
              </div>
              ` : ''}
              ${includeComments && post.comments && post.comments.length > 0 ? `
              <div class="comments-section">
                ${post.comments.map(comment => `
                <div class="comment-item">
                  ${comment.user.avatarUrl ? `<img src="${comment.user.avatarUrl}" alt="" class="comment-avatar">` : ''}
                  <div class="comment-body">
                    <div class="comment-header">
                      <span class="comment-username">${comment.user.username}</span>
                    </div>
                    <div class="comment-text">${comment.content}</div>
                  </div>
                </div>
                `).join('')}
              </div>
              ` : ''}
            </div>
            `).join('')}
          ` : `<div class="empty-state">暂无分享</div>`}
        </div>
        
        <!-- TA 的分享列 -->
        <div class="posts-column">
          <div class="column-header">
            ${partnerAvatarHtml}
            <span class="username partner">${partnerUsername}</span>
          </div>
          ${day.partnerPosts.length > 0 ? `
            ${day.partnerPosts.map(post => `
            <div class="post-card partner">
              <div class="post-card-header">
                ${post.title ? `<span class="post-title">${post.title}</span>` : ''}
                <span class="post-time">${new Date(post.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              ${post.imageUrls && post.imageUrls.length > 0 ? `<img src="${post.imageUrls[0]}" alt="分享图片" class="post-image" onerror="this.style.display='none'">` : ''}
              ${post.text ? `<div class="post-text">${post.text}</div>` : ''}
              ${post.location ? `
              <div class="post-location">
                <svg class="w-3 h-3 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                ${post.location}
              </div>
              ` : ''}
              ${includeComments && post.comments && post.comments.length > 0 ? `
              <div class="comments-section">
                ${post.comments.map(comment => `
                <div class="comment-item">
                  ${comment.user.avatarUrl ? `<img src="${comment.user.avatarUrl}" alt="" class="comment-avatar">` : ''}
                  <div class="comment-body">
                    <div class="comment-header">
                      <span class="comment-username">${comment.user.username}</span>
                    </div>
                    <div class="comment-text">${comment.content}</div>
                  </div>
                </div>
                `).join('')}
              </div>
              ` : ''}
            </div>
            `).join('')}
          ` : `<div class="empty-state">暂无分享</div>`}
        </div>
      </div>
    </div>
    `}).join('')}
  </div>
  
  <button class="print-btn" onclick="window.print()">📄 打印 / 另存为 PDF</button>
</body>
</html>`
  }

  const handleExportHTML = async () => {
    if (!user) return
    
    setExporting(true)
    try {
      
      // 获取带评论的完整数据
      const postsWithComments = await Promise.all(
        postsData.map(async (day) => {
          const [myPostsWithComments, partnerPostsWithComments] = await Promise.all([
            Promise.all(day.myPosts.map(async (post) => {
              if (!includeComments) return { ...post, comments: [] }
              try {
                const origin = window.location.origin
                const res = await fetch(`${origin}/api/comment?postId=${post.id}`)
                
                if (!res.ok) {
                  const errorText = await res.text()
                  return { ...post, comments: [] }
                }
                
                const data = await res.json()
                
                // 扁平化评论和回复
                const allComments: Comment[] = []
                if (data.comments) {
                  data.comments.forEach((comment: Comment) => {
                    allComments.push(comment)
                    if (comment.replies && comment.replies.length > 0) {
                      allComments.push(...comment.replies)
                    }
                  })
                }
                return { ...post, comments: allComments }
              } catch (err) {
                return { ...post, comments: [] }
              }
            })),
            Promise.all(day.partnerPosts.map(async (post) => {
              if (!includeComments) return { ...post, comments: [] }
              try {
                const origin = window.location.origin
                const res = await fetch(`${origin}/api/comment?postId=${post.id}`)
                
                if (!res.ok) {
                  return { ...post, comments: [] }
                }
                
                const data = await res.json()
                // 扁平化评论和回复
                const allComments: Comment[] = []
                if (data.comments) {
                  data.comments.forEach((comment: Comment) => {
                    allComments.push(comment)
                    if (comment.replies && comment.replies.length > 0) {
                      allComments.push(...comment.replies)
                    }
                  })
                }
                return { ...post, comments: allComments }
              } catch (err) {
                console.error('[HTML Export] 获取评论失败:', post.id, err)
                return { ...post, comments: [] }
              }
            }))
          ])
          return {
            date: day.date,
            myPosts: myPostsWithComments,
            partnerPosts: partnerPostsWithComments
          }
        })
      )
      

      // 生成 HTML
      const html = generateHTML(postsWithComments)
      
      // 在新窗口打开 HTML
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const newWindow = window.open(url, '_blank')
      
      if (!newWindow) {
        alert('请允许弹出窗口以打开预览')
        return
      }
      
      onClose()
    } catch (error) {
      console.error('[HTML Export] 导出失败', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      alert('导出失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-xl p-6 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-800 mb-4">导出回忆 HTML</h3>
        
        {/* 日期范围选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择日期范围
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setDateRange('7days')}
              className={`px-3 py-2 text-sm rounded-lg transition ${
                dateRange === '7days' 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              最近 7 天
            </button>
            <button
              onClick={() => setDateRange('30days')}
              className={`px-3 py-2 text-sm rounded-lg transition ${
                dateRange === '30days' 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              最近 30 天
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-3 py-2 text-sm rounded-lg transition ${
                dateRange === 'all' 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`px-3 py-2 text-sm rounded-lg transition ${
                dateRange === 'custom' 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              自定义
            </button>
          </div>
          
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          )}
        </div>

        {/* 是否包含评论 */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeComments}
              onChange={(e) => setIncludeComments(e.target.checked)}
              className="w-4 h-4 text-pink-500 rounded focus:ring-pink-500"
            />
            <span className="text-sm text-gray-700">包含评论</span>
          </label>
        </div>

        {/* 预览信息 */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          {loading ? (
            <p className="text-sm text-gray-500">加载中...</p>
          ) : (
            <p className="text-sm text-gray-600">
              将导出 <span className="font-medium text-pink-600">{postsData.length}</span> 天的分享，
              共 <span className="font-medium text-pink-600">{previewCount}</span> 条内容
            </p>
          )}
        </div>

        {/* 说明信息 */}
        <div className="mb-6 p-3 bg-pink-50 rounded-lg border border-pink-100">
          <p className="text-sm text-pink-700">
            💡 导出为 HTML 文件，可在浏览器中打开后使用"打印"功能保存为 PDF
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition"
          >
            取消
          </button>
          <button
            onClick={handleExportHTML}
            disabled={loading || exporting || postsData.length === 0}
            className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50 transition"
          >
            {exporting ? '导出中...' : '导出 HTML'}
          </button>
        </div>
      </div>
    </div>
  )
}