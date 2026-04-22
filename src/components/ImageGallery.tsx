'use client'

import { useState, useEffect, useCallback } from 'react'

interface ImageGalleryProps {
  images: string[]              // 图片 URL 数组
  initialIndex?: number         // 初始显示的图片索引
  onClose: () => void           // 关闭回调
  onChangeIndex?: (index: number) => void  // 切换图片回调
}

export default function ImageGallery({
  images,
  initialIndex = 0,
  onClose,
  onChangeIndex,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)

  // 切换到指定图片
  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index)
      onChangeIndex?.(index)
    }
  }, [images.length, onChangeIndex])

  // 切换到上一张
  const goPrev = useCallback(() => {
    goToIndex(currentIndex - 1)
  }, [currentIndex, goToIndex])

  // 切换到下一张
  const goNext = useCallback(() => {
    goToIndex(currentIndex + 1)
  }, [currentIndex, goToIndex])

  // 触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX)
  }

  // 触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX)
  }

  // 触摸结束
  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return

    const diff = touchStartX - touchEndX
    const threshold = 50

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goNext()
      } else {
        goPrev()
      }
    }

    setTouchStartX(null)
    setTouchEndX(null)
  }

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        goPrev()
      } else if (e.key === 'ArrowRight') {
        goNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goPrev, goNext])

  // 阻止滚动穿透
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-bold z-50 p-2"
        title="关闭"
      >
        ×
      </button>

      {/* 图片容器 */}
      <div
        className="w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative max-w-6xl max-h-full">
          <img
            src={images[currentIndex]}
            alt={`图片 ${currentIndex + 1}/${images.length}`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />

          {/* 右上角 - 总照片数量 */}
          <div className="absolute top-4 right-12 bg-black/60 text-white text-sm px-3 py-1.5 rounded-md z-10">
            {images.length}
          </div>

          {/* 左箭头按钮 */}
          {images.length > 1 && (
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition transform hover:scale-110 z-40"
              title="上一张"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 右箭头按钮 */}
          {images.length > 1 && (
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition transform hover:scale-110 z-40"
              title="下一张"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* 底部中央 - 页码指示器 */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 px-3 py-2 rounded-full z-40">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToIndex(index)}
                  className={`w-2 h-2 rounded-full transition ${
                    index === currentIndex ? 'bg-white w-4' : 'bg-white/50'
                  }`}
                  title={`第 ${index + 1} 张`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}