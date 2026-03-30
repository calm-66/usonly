'use client'

import { useState, useEffect } from 'react'
import { Document, Page, Text, View, StyleSheet, Image, pdf, Font } from '@react-pdf/renderer'

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

interface PDFExportModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

type DateRange = '7days' | '30days' | 'all' | 'custom'

// 注册中文字体
Font.register({
  family: 'Noto Sans SC',
  src: 'https://fonts.gstatic.com/s/notosanssc/v12/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf'
})

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fdf2f8',
    padding: 30,
  },
  coverPage: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fce7f3',
    padding: 40,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#db2777',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Noto Sans SC',
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 30,
    fontFamily: 'Noto Sans SC',
  },
  coverDate: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Noto Sans SC',
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
    fontFamily: 'Noto Sans SC',
  },
  postRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  postCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  postCardMy: {
    borderLeftWidth: 3,
    borderLeftColor: '#ec4899',
  },
  postCardPartner: {
    borderLeftWidth: 3,
    borderLeftColor: '#a855f7',
  },
  postTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
    fontFamily: 'Noto Sans SC',
  },
  postTime: {
    fontSize: 9,
    color: '#9ca3af',
    marginBottom: 5,
    fontFamily: 'Noto Sans SC',
  },
  postText: {
    fontSize: 10,
    color: '#4b5563',
    marginBottom: 5,
    lineHeight: 1.4,
    fontFamily: 'Noto Sans SC',
  },
  postImage: {
    width: '100%',
    height: 120,
    borderRadius: 4,
    marginBottom: 5,
  },
  commentSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    padding: 3,
    backgroundColor: '#fafafa',
    borderRadius: 3,
  },
  commentAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  commentContent: {
    flex: 1,
    fontSize: 8,
    color: '#6b7280',
    fontFamily: 'Noto Sans SC',
  },
  userLabel: {
    fontSize: 8,
    color: '#ec4899',
    marginBottom: 3,
    fontFamily: 'Noto Sans SC',
  },
  partnerLabel: {
    fontSize: 8,
    color: '#a855f7',
    marginBottom: 3,
    fontFamily: 'Noto Sans SC',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
    fontFamily: 'Noto Sans SC',
  },
})

// PDF 文档组件
function PostsPDF({ 
  postsByDate, 
  user, 
  includeComments 
}: { 
  postsByDate: { date: string; myPosts: Post[]; partnerPosts: Post[] }[]
  user: User
  includeComments: boolean
}) {
  return (
    <Document>
      {/* 封面页 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverTitle}>UsOnly 回忆录</Text>
          <Text style={styles.coverSubtitle}>
            {user.partner?.username || '珍贵的回忆'}
          </Text>
          <Text style={styles.coverDate}>
            导出日期：{new Date().toLocaleDateString('zh-CN')}
          </Text>
          <Text style={styles.coverDate}>
            共 {postsByDate.length} 天的分享
          </Text>
        </View>
      </Page>
      
      {/* 内容页 */}
      {postsByDate.map((day, index) => (
        <Page key={index} size="A4" style={styles.page}>
          <View style={{ marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <Text style={styles.dateHeader}>{day.date}</Text>
            
            <View style={styles.postRow}>
              {/* 我的分享 */}
              {day.myPosts.length > 0 && (
                <View style={[styles.postCard, styles.postCardMy]}>
                  <Text style={styles.userLabel}>我的分享</Text>
                  {day.myPosts.map((post, postIndex) => (
                    <View key={postIndex} style={{ marginBottom: 10 }}>
                      {post.title && (
                        <Text style={styles.postTitle}>{post.title}</Text>
                      )}
                      <Text style={styles.postTime}>
                        {new Date(post.createdAt).toLocaleTimeString('zh-CN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                      {post.imageUrl && (
                        <Image 
                          src={post.imageUrl} 
                          style={styles.postImage}
                          cache={true}
                        />
                      )}
                      {post.text && (
                        <Text style={styles.postText}>{post.text}</Text>
                      )}
                      {includeComments && post.comments && post.comments.length > 0 && (
                        <View style={styles.commentSection}>
                          {post.comments.map((comment, cIndex) => (
                            <View key={cIndex} style={styles.commentItem}>
                              {comment.user.avatarUrl && (
                                <Image 
                                  src={comment.user.avatarUrl} 
                                  style={styles.commentAvatar}
                                />
                              )}
                              <Text style={styles.commentContent}>
                                {comment.user.username}: {comment.content}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
              
              {/* TA 的分享 */}
              {day.partnerPosts.length > 0 && (
                <View style={[styles.postCard, styles.postCardPartner]}>
                  <Text style={styles.partnerLabel}>TA 的分享</Text>
                  {day.partnerPosts.map((post, postIndex) => (
                    <View key={postIndex} style={{ marginBottom: 10 }}>
                      {post.title && (
                        <Text style={styles.postTitle}>{post.title}</Text>
                      )}
                      <Text style={styles.postTime}>
                        {new Date(post.createdAt).toLocaleTimeString('zh-CN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                      {post.imageUrl && (
                        <Image 
                          src={post.imageUrl} 
                          style={styles.postImage}
                          cache={true}
                        />
                      )}
                      {post.text && (
                        <Text style={styles.postText}>{post.text}</Text>
                      )}
                      {includeComments && post.comments && post.comments.length > 0 && (
                        <View style={styles.commentSection}>
                          {post.comments.map((comment, cIndex) => (
                            <View key={cIndex} style={styles.commentItem}>
                              {comment.user.avatarUrl && (
                                <Image 
                                  src={comment.user.avatarUrl} 
                                  style={styles.commentAvatar}
                                />
                              )}
                              <Text style={styles.commentContent}>
                                {comment.user.username}: {comment.content}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          
          <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
            `${pageNumber} / ${totalPages}`
          )} fixed />
        </Page>
      ))}
    </Document>
  )
}

export default function PDFExportModal({ isOpen, onClose, user }: PDFExportModalProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30days')
  const [includeComments, setIncludeComments] = useState(true)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [postsData, setPostsData] = useState<{ date: string; myPosts: Post[]; partnerPosts: Post[] }[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
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

  const handleGeneratePDF = async () => {
    if (!user) return
    
    setGenerating(true)
    try {
      console.log('[PDF Export] 开始生成 PDF，用户:', user.username)
      console.log('[PDF Export] 帖子数据:', postsData.length, '天')
      
      // 获取带评论的完整数据（不包含评论也走一次流程以保持一致性）
      console.log('[PDF Export] 开始获取帖子和评论数据...')
      
      const postsWithComments = await Promise.all(
        postsData.map(async (day) => {
          const [myPostsWithComments, partnerPostsWithComments] = await Promise.all([
            Promise.all(day.myPosts.map(async (post) => {
              if (!includeComments) return { ...post, comments: [] }
              try {
                // 使用绝对 URL 获取评论
                const origin = window.location.origin
                const res = await fetch(`${origin}/api/comment?postId=${post.id}`)
                console.log('[PDF Export] 评论 API 响应状态:', res.status)
                
                if (!res.ok) {
                  const errorText = await res.text()
                  console.error('[PDF Export] 评论 API 错误响应:', errorText)
                  return { ...post, comments: [] }
                }
                
                const data = await res.json()
                console.log('[PDF Export] 帖子评论数据:', post.id, data)
                
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
                console.error('[PDF Export] 获取评论失败:', post.id, err)
                return { ...post, comments: [] }
              }
            })),
            Promise.all(day.partnerPosts.map(async (post) => {
              if (!includeComments) return { ...post, comments: [] }
              try {
                const origin = window.location.origin
                const res = await fetch(`${origin}/api/comment?postId=${post.id}`)
                console.log('[PDF Export] 评论 API 响应状态:', res.status)
                
                if (!res.ok) {
                  const errorText = await res.text()
                  console.error('[PDF Export] 评论 API 错误响应:', errorText)
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
                console.error('[PDF Export] 获取评论失败:', post.id, err)
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
      
      console.log('[PDF Export] 帖子数据处理完成，开始生成 PDF 文档...')

      // 生成 PDF
      const pdfDoc = (
        <PostsPDF 
          postsByDate={postsWithComments} 
          user={user} 
          includeComments={includeComments} 
        />
      )

      console.log('[PDF Export] PDF 文档组件创建完成，开始转换为 Blob...')
      const blob = await pdf(pdfDoc).toBlob()
      console.log('[PDF Export] Blob 生成成功，大小:', blob.size, 'bytes')
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `UsOnly_回忆录_${new Date().toISOString().split('T')[0]}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      
      console.log('[PDF Export] PDF 下载完成')
      alert('PDF 生成成功！')
      onClose()
    } catch (error) {
      console.error('[PDF Export] 生成 PDF 失败，详细错误:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      })
      alert('生成 PDF 失败：' + (error instanceof Error ? error.message : '未知错误') + '，请查看控制台日志')
    } finally {
      setGenerating(false)
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
        <h3 className="text-lg font-bold text-gray-800 mb-4">导出回忆 PDF</h3>
        
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

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition"
          >
            取消
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={loading || generating || postsData.length === 0}
            className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50 transition"
          >
            {generating ? '生成中...' : '生成并下载'}
          </button>
        </div>
      </div>
    </div>
  )
}