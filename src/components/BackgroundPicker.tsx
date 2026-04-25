'use client'

import { useState, useRef } from 'react'
import { uploadImage } from '@/lib/imageUpload'

interface BackgroundPickerProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (imageUrl: string) => void
  currentImageUrl?: string | null
}

// 检测是否为移动端设备
function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export default function BackgroundPicker({
  isOpen,
  onClose,
  onConfirm,
  currentImageUrl
}: BackgroundPickerProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentCapture, setCurrentCapture] = useState<'environment' | undefined>(undefined)

  if (!isOpen) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const imageUrl = await uploadImage(file)
      setPreviewUrl(imageUrl)
      onConfirm(imageUrl)
      onClose()
    } catch (error: any) {
      alert('上传失败：' + (error.message || '请重试'))
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveBackground = () => {
    onConfirm('')
    setPreviewUrl(null)
    onClose()
  }

  const handleSelectPhoto = () => {
    if (isMobile()) {
      setCurrentCapture(undefined)
      setTimeout(() => fileInputRef.current?.click(), 100)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleTakePhoto = () => {
    setCurrentCapture('environment')
    setTimeout(() => fileInputRef.current?.click(), 100)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-xl p-6 animate-slideUp relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
          title="关闭"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">更换登录页背景</h3>
        <p className="text-xs text-gray-500 text-center mb-4">
          选择一张喜欢的图片作为登录页背景
        </p>

        {/* 预览区域 */}
        {previewUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
            <img
              src={previewUrl}
              alt="预览"
              className="w-full h-32 object-cover"
            />
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleSelectPhoto}
            disabled={uploading}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {uploading ? '上传中...' : '从相册选择'}
          </button>

          {isMobile() && (
            <button
              onClick={handleTakePhoto}
              disabled={uploading}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              📷 拍照
            </button>
          )}

          {currentImageUrl && (
            <button
              onClick={handleRemoveBackground}
              disabled={uploading}
              className="w-full py-3 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              移除背景图
            </button>
          )}
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture={currentCapture}
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 transition"
        >
          取消
        </button>
      </div>
    </div>
  )
}