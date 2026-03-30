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

  const generateHTML = (postsWithComments: { date: string; myPosts: Post[]; partnerPosts: Post[] }[]) => {
    const partnerName = user?.partner?.username || '珍贵的回忆'
    const exportDate = new Date().toLocaleDateString('zh-CN')
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UsOnly 回忆录 - ${partnerName}</title>
  <style>
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
      max-width: 800px;
      margin: 0 auto;
    }
    
    .cover {
      text-align: center;
      padding: 60px 20px;
      background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
      border-radius: 20px;
      margin-bottom: 30px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    
    .cover h1 {
      font-size: 36px;
      color: #db2777;
      margin-bottom: 10px;
    }
    
    .cover .subtitle {
      font-size: 18px;
      color: #9ca3af;
      margin-bottom: 20px;
    }
    
    .cover .info {
      font-size: 14px;
      color: #6b7280;
    }
    
    .date-section {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    
    .date-header {
      font-size: 18px;
      font-weight: bold;
      color: #374151;
      padding: 12px 16px;
      background: #f3f4f6;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .posts-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    .post-card {
      flex: 1;
      min-width: 280px;
      background: #ffffff;
      border-radius: 12px;
      padding: 16px;
      border: 1px solid #e5e7eb;
    }
    
    .post-card.my {
      border-left: 4px solid #ec4899;
    }
    
    .post-card.partner {
      border-left: 4px solid #a855f7;
    }
    
    .post-label {
      font-size: 12px;
      color: #ec4899;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .post-label.partner {
      color: #a855f7;
    }
    
    .post-item {
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .post-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    
    .post-title {
      font-size: 14px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 4px;
    }
    
    .post-time {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    
    .post-image {
      width: 100%;
      height: auto;
      border-radius: 8px;
      margin-bottom: 8px;
      max-height: 200px;
      object-fit: cover;
    }
    
    .post-text {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    
    .comments-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f3f4f6;
    }
    
    .comment-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      background: #fafafa;
      border-radius: 6px;
      margin-bottom: 6px;
    }
    
    .comment-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .comment-text {
      font-size: 12px;
      color: #6b7280;
      flex: 1;
    }
    
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
    }
    
    .print-btn:hover {
      background: #be185d;
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(219, 39, 119, 0.5);
    }
    
    @media print {
      .print-btn {
        display: none;
      }
      
      body {
        background: white;
        padding: 0;
      }
      
      .cover {
        box-shadow: none;
        page-break-after: always;
      }
      
      .date-section {
        box-shadow: none;
        page-break-inside: avoid;
      }
      
      .post-card {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="cover">
      <h1>💕 UsOnly 回忆录</h1>
      <p class="subtitle">${partnerName}</p>
      <p class="info">导出日期：${exportDate}</p>
      <p class="info">共 ${postsWithComments.length} 天的分享，${previewCount} 条内容</p>
    </div>
    
    ${postsWithComments.map(day => `
    <div class="date-section">
      <div class="date-header">📅 ${day.date}</div>
      <div class="posts-row">
        ${day.myPosts.length > 0 ? `
        <div class="post-card my">
          <div class="post-label">💖 我的分享</div>
          ${day.myPosts.map(post => `
            <div class="post-item">
              ${post.title ? `<div class="post-title">${post.title}</div>` : ''}
              <div class="post-time">${new Date(post.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
              ${post.imageUrl ? `<img src="${post.imageUrl}" alt="分享图片" class="post-image" onerror="this.style.display='none'">` : ''}
              ${post.text ? `<div class="post-text">${post.text}</div>` : ''}
              ${includeComments && post.comments && post.comments.length > 0 ? `
                <div class="comments-section">
                  ${post.comments.map(comment => `
                    <div class="comment-item">
                      ${comment.user.avatarUrl ? `<img src="${comment.user.avatarUrl}" alt="" class="comment-avatar" onerror="this.style.display='none'">` : ''}
                      <span class="comment-text"><strong>${comment.user.username}</strong>: ${comment.content}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${day.partnerPosts.length > 0 ? `
        <div class="post-card partner">
          <div class="post-label partner">💜 TA 的分享</div>
          ${day.partnerPosts.map(post => `
            <div class="post-item">
              ${post.title ? `<div class="post-title">${post.title}</div>` : ''}
              <div class="post-time">${new Date(post.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
              ${post.imageUrl ? `<img src="${post.imageUrl}" alt="分享图片" class="post-image" onerror="this.style.display='none'">` : ''}
              ${post.text ? `<div class="post-text">${post.text}</div>` : ''}
              ${includeComments && post.comments && post.comments.length > 0 ? `
                <div class="comments-section">
                  ${post.comments.map(comment => `
                    <div class="comment-item">
                      ${comment.user.avatarUrl ? `<img src="${comment.user.avatarUrl}" alt="" class="comment-avatar" onerror="this.style.display='none'">` : ''}
                      <span class="comment-text"><strong>${comment.user.username}</strong>: ${comment.content}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}
  </div>
  
  <button class="print-btn" onclick="window.print()">📄 打印 / 另存为 PDF</button>
</body>
</html>`
  }

  const handleExportHTML = async () => {
    if (!user) return
    
    setExporting(true)
    try {
      console.log('[HTML Export] 开始导出 HTML，用户:', user.username)
      console.log('[HTML Export] 帖子数据:', postsData.length, '天')
      
      // 获取带评论的完整数据
      const postsWithComments = await Promise.all(
        postsData.map(async (day) => {
          const [myPostsWithComments, partnerPostsWithComments] = await Promise.all([
            Promise.all(day.myPosts.map(async (post) => {
              if (!includeComments) return { ...post, comments: [] }
              try {
                const origin = window.location.origin
                const res = await fetch(`${origin}/api/comment?postId=${post.id}`)
                console.log('[HTML Export] 评论 API 响应状态:', res.status)
                
                if (!res.ok) {
                  const errorText = await res.text()
                  console.error('[HTML Export] 评论 API 错误响应:', errorText)
                  return { ...post, comments: [] }
                }
                
                const data = await res.json()
                console.log('[HTML Export] 帖子评论数据:', post.id, data)
                
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
      
      console.log('[HTML Export] 帖子数据处理完成，开始生成 HTML...')

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
      
      console.log('[HTML Export] HTML 预览窗口已打开')
      onClose()
    } catch (error) {
      console.error('[HTML Export] 导出失败，详细错误:', {
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