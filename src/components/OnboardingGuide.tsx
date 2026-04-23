'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface OnboardingGuideProps {
  onComplete: () => void
}

interface GuideStep {
  title: string
  description: string
  icon: string
  illustration: React.ReactNode
}

const guideSteps: GuideStep[] = [
  {
    title: '欢迎来到 UsOnly',
    description: '这是一个只属于你们两个人的私密空间，用轻松自然的方式分享彼此的日常生活。',
    icon: '🏠',
    illustration: (
      <div className="w-32 h-32 mx-auto mb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full opacity-50 animate-pulse"></div>
        <div className="absolute inset-4 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full opacity-50"></div>
        <div className="absolute inset-0 flex items-center justify-center text-5xl">🏠</div>
      </div>
    )
  },
  {
    title: '每天一个轻松主题',
    description: '系统每天会提供一个开放主题，你想分享时就上传照片或文字，没有压力，没有强制。',
    icon: '',
    illustration: (
      <div className="w-32 h-32 mx-auto mb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-2xl opacity-50"></div>
        <div className="absolute inset-0 flex items-center justify-center text-5xl">📝</div>
      </div>
    )
  },
  {
    title: '平行视角的浪漫',
    description: '各自记录，彼此呼应。看到对方眼中的世界，感受 TA 的存在，即使相隔千里。',
    icon: '💕',
    illustration: (
      <div className="w-32 h-32 mx-auto mb-6 relative">
        <div className="absolute left-0 top-0 w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full opacity-70 animate-bounce"></div>
        <div className="absolute right-0 bottom-0 w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full opacity-70 animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute inset-0 flex items-center justify-center text-3xl">💕</div>
      </div>
    )
  },
  {
    title: '邀请 TA 加入',
    description: '注册后你会获得专属邀请码，分享给你的伴侣，一起建立这个私密空间。',
    icon: '📨',
    illustration: (
      <div className="w-32 h-32 mx-auto mb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-200 to-teal-200 rounded-2xl opacity-50"></div>
        <div className="absolute inset-0 flex items-center justify-center text-5xl">📨</div>
      </div>
    )
  }
]

export default function OnboardingGuide({ onComplete }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showGuide, setShowGuide] = useState(true)

  const handleNext = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    setShowGuide(false)
    localStorage.setItem('hasCompletedOnboarding', 'true')
    onComplete()
  }

  const handleSkip = () => {
    setShowGuide(false)
    localStorage.setItem('hasCompletedOnboarding', 'true')
    onComplete()
  }

  if (!showGuide) {
    return null
  }

  const step = guideSteps[currentStep]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* 进度条 */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 h-1">
          <div 
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${((currentStep + 1) / guideSteps.length) * 100}%` }}
          ></div>
        </div>

        {/* 内容区域 */}
        <div className="p-8">
          {/* 跳过按钮 */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-gray-600 transition"
            >
              跳过引导
            </button>
          </div>

          {/* 插图 */}
          {step.illustration}

          {/* 标题 */}
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-3">
            {step.title}
          </h2>

          {/* 描述 */}
          <p className="text-gray-600 text-center leading-relaxed mb-6">
            {step.description}
          </p>

          {/* 导航按钮 */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              className={`px-6 py-3 rounded-xl font-medium transition ${
                currentStep > 0
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              disabled={currentStep === 0}
            >
              上一步
            </button>

            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl font-medium hover:from-gray-900 hover:to-black transition"
            >
              {currentStep === guideSteps.length - 1 ? '开始使用' : '下一步'}
            </button>
          </div>
        </div>

        {/* 指示器 */}
        <div className="flex justify-center gap-2 pb-6">
          {guideSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition ${
                index === currentStep
                  ? 'bg-gray-800 w-6'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`跳转到第${index + 1}步`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}