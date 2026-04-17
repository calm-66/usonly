'use client'

import { useState } from 'react'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
}

type FeedbackType = 'suggestion' | 'bug' | 'other'

export default function FeedbackModal({ isOpen, onClose, userId }: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      alert('请填写反馈内容')
      return
    }

    setSending(true)
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: feedbackType,
          content: content.trim(),
          userId,
          timestamp: new Date().toISOString(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      })

      const data = await res.json()
      
      if (data.success) {
        // 发送成功
        setSent(true)
        setTimeout(() => {
          onClose()
          setSent(false)
          setContent('')
          setFeedbackType('suggestion')
        }, 1500)
      } else {
        alert('发送失败：' + (data.error || '请稍后重试'))
      }
    } catch (error) {
      console.error('发送反馈失败:', error)
      alert('发送失败，请稍后重试')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-xl p-6 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-800">联系开发者</h3>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 font-medium">发送成功！</p>
            <p className="text-sm text-gray-500 mt-1">感谢您的反馈</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 反馈类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                反馈类型
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackType('suggestion')}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition ${
                    feedbackType === 'suggestion'
                      ? 'bg-pink-50 border-pink-500 text-pink-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  💡 建议
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType('bug')}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition ${
                    feedbackType === 'bug'
                      ? 'bg-red-50 border-red-500 text-red-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🐛 Bug 报告
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType('other')}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition ${
                    feedbackType === 'other'
                      ? 'bg-gray-50 border-gray-500 text-gray-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📝 其他
                </button>
              </div>
            </div>

            {/* 反馈内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                反馈内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请详细描述您的建议或问题..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                autoFocus
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50 transition"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={sending || !content.trim()}
                className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    发送中...
                  </>
                ) : (
                  '发送反馈'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}