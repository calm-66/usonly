'use client'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-xl overflow-hidden animate-slideUp relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-white/80 hover:text-white transition"
          title="关闭"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 头部背景 */}
        <div className="relative h-40 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-1">UsOnly</h2>
            <div className="flex items-center justify-center gap-1">
              <span className="text-white/90 text-sm">只属于两个人的私密空间</span>
              <svg className="w-4 h-4 text-pink-200" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
            </div>
          </div>
          {/* 装饰图案 */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent"></div>
        </div>

        {/* 内容区域 */}
        <div className="p-5 -mt-2">
          {/* 介绍文字 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">
              UsOnly 是一个只属于你们两个人的私密空间。为想要记录日常却不想公开发布到社交媒体的情侣设计——没有他人的点赞和评论，只有你们彼此分享的真实瞬间。不需要精心修图、写文案，想发就发，随心记录。
            </p>
          </div>

          {/* 功能卡片 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* 私密安全 */}
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 text-center border border-pink-200">
              <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-800 mb-1">私密安全</h4>
              <p className="text-xs text-gray-500">只有你们两个人可见<br/>数据加密，安全放心</p>
            </div>

            {/* 日常分享 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-800 mb-1">日常分享</h4>
              <p className="text-xs text-gray-500">记录照片、文字和心情<br/>留住每一个美好瞬间</p>
            </div>

            {/* 情感连接 */}
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 text-center border border-rose-200">
              <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-800 mb-1">情感连接</h4>
              <p className="text-xs text-gray-500">没有点赞，没有评论<br/>只属于你们的真实交流</p>
            </div>

            {/* 没有外人 */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 text-center border border-amber-200">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-800 mb-1">没有外人</h4>
              <p className="text-xs text-gray-500">只有你们 <span className="text-pink-500">♥</span></p>
            </div>
          </div>

          {/* 底部标语 */}
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">
              没有外人，只有你们 <span className="text-pink-500">♥</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}