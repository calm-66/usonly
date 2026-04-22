'use client'

import { useState, useRef, TouchEvent, MouseEvent } from 'react'

interface CarouselProps {
  images: string[]      // 图片 URL 数组
  alt?: string          // 替代文本
  className?: string    // 自定义类名
  onImageClick?: (index: number) => void  // 点击图片回调
  onRemoveCurrent?: (index: number) => void  // 移除当前图片回调（传递当前索引）
  onRemoveAll?: () => void  // 移除所有图片回调
}

export default function Carousel({
  images,
  alt = '分享图片',
  className = '',
  onImageClick,
  onRemoveCurrent,
  onRemoveAll,
}: CarouselProps) {
  // 所有 hooks 必须在组件顶层调用，在任何提前返回之前
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  // PC 端鼠标拖动支持 - 移到顶层，在提前返回之前
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState<number | null>(null)

  // 移除当前图片（必须在提前返回之前定义）
  const handleRemoveCurrent = () => {
    onRemoveCurrent?.(currentIndex)
  }

  // 如果只有 0 或 1 张图片，直接返回
  if (!images || images.length === 0) {
    return null
  }

  if (images.length === 1) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={images[0]}
          alt={alt}
          className="w-full h-48 object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition"
          onClick={() => onImageClick?.(0)}
        />
        {/* 右上角 - 删除当前图片按钮（叉号） */}
        <button
          onClick={handleRemoveCurrent}
          className="absolute top-2 right-2 bg-black/60 text-white w-6 h-6 flex items-center justify-center rounded-md z-10 hover:bg-black/80 transition"
          title="删除当前图片"
          type="button"
        >
          ×
        </button>
      </div>
    )
  }

  // 触摸开始
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX)
  }

  // 触摸移动
  const handleTouchMove = (e: TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX)
  }

  // 触摸结束
  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) {
      return
    }

    const diff = touchStartX - touchEndX
    const threshold = 50 // 滑动距离阈值

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // 向左滑动，显示下一张
        setCurrentIndex((prev) => Math.min(prev + 1, images.length - 1))
      } else {
        // 向右滑动，显示上一张
        setCurrentIndex((prev) => Math.max(prev - 1, 0))
      }
    }

    setTouchStartX(null)
    setTouchEndX(null)
  }

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true)
    setDragStartX(e.clientX)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || dragStartX === null) return
    setTouchEndX(e.clientX)
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)

    if (dragStartX !== null && touchEndX !== null) {
      const diff = dragStartX - touchEndX
      const threshold = 50

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          setCurrentIndex((prev) => Math.min(prev + 1, images.length - 1))
        } else {
          setCurrentIndex((prev) => Math.max(prev - 1, 0))
        }
      }
    }

    setDragStartX(null)
    setTouchEndX(null)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    setDragStartX(null)
    setTouchEndX(null)
  }

  // 切换到指定图片
  const goToIndex = (index: number) => {
    setCurrentIndex(index)
  }

  // 切换到上一张
  const goPrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }

  // 切换到下一张
  const goNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, images.length - 1))
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* 图片轨道 */}
      <div
        ref={trackRef}
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((imageUrl, index) => (
          <div key={index} className="w-full flex-shrink-0">
            <img
              src={imageUrl}
              alt={`${alt} ${index + 1}/${images.length}`}
              className="w-full h-48 object-cover cursor-zoom-in hover:opacity-90 transition"
              onClick={() => onImageClick?.(index)}
            />
          </div>
        ))}
      </div>

      {/* 右上角 - 删除当前图片按钮（叉号） */}
      <button
        onClick={handleRemoveCurrent}
        className="absolute top-2 right-2 bg-black/60 text-white w-6 h-6 flex items-center justify-center rounded-md z-10 hover:bg-black/80 transition"
        title="删除当前图片"
        type="button"
      >
        ×
      </button>
    </div>
  )
}
