'use client'

import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { uploadImage, validateImageFile, validateImageFileWithSize } from '@/lib/imageUpload'
import Carousel from './Carousel'

interface ImageUploaderProps {
  value: string[] | null         // 当前图片 URL 数组
  onChange: (urls: string[] | null) => void  // 回调函数
  maxSize?: number               // 最大大小（字节），默认 5MB
  previewSize?: string           // 预览区域大小，默认 'w-full h-48'
  showRemove?: boolean           // 是否显示移除按钮，默认 true
  accept?: string                // 接受的文件类型，默认 'image/*'
  placeholder?: string           // 占位提示文字
  showProgress?: boolean         // 是否显示上传进度，默认 true
  className?: string             // 自定义类名
  disabled?: boolean             // 是否禁用，默认 false
  onUploadStart?: () => void     // 上传开始回调
  onUploadComplete?: (url: string) => void  // 上传完成回调
  onUploadError?: (error: string) => void   // 上传错误回调
  maxCount?: number              // 最大上传数量，默认 3
}

// 检测是否为移动端设备
function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export default function ImageUploader({
  value,
  onChange,
  maxSize = 5 * 1024 * 1024,
  previewSize = 'w-full h-48',
  showRemove = true,
  accept = 'image/*',
  placeholder = '选择图片',
  showProgress = true,
  className = '',
  disabled = false,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  maxCount = 3,
}: ImageUploaderProps) {
  console.log('[ImageUploader] 组件渲染开始，props:', { value, maxCount })
  
  const [images, setImages] = useState<string[]>(value || [])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [showMobileDialog, setShowMobileDialog] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentCapture, setCurrentCapture] = useState<'user' | 'environment' | undefined>(undefined)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])  // 待上传的文件队列

  useEffect(() => {
    console.log('[ImageUploader] 检测移动设备')
    setIsMobileDevice(isMobile())
  }, [])

  useEffect(() => {
    console.log('[ImageUploader] value 变化:', value)
    setImages(value || [])
  }, [value])

  // 处理文件选择（支持多选）
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // 检查是否会超出数量限制
    const currentCount = images.length
    const maxAllowed = maxCount - currentCount
    
    if (maxAllowed <= 0) {
      setError(`最多只能上传 ${maxCount} 张图片`)
      onUploadError?.(`最多只能上传 ${maxCount} 张图片`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // 如果选择的文件数量超出限制，只取前 maxAllowed 个
    const filesToProcess = files.slice(0, maxAllowed)
    
    if (files.length > maxAllowed) {
      setWarning(`最多只能上传 ${maxCount} 张图片，已自动选择前 ${maxAllowed} 张`)
    } else {
      setWarning('')
    }

    // 验证每个文件
    for (const file of filesToProcess) {
      const validation = validateImageFileWithSize(file)
      if (!validation.valid) {
        setError(validation.error!)
        onUploadError?.(validation.error!)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }
    }

    setError('')
    setUploading(true)
    onUploadStart?.()

    // 将文件添加到待处理队列
    setPendingFiles(prev => [...prev, ...filesToProcess])

    // 逐个上传
    for (const file of filesToProcess) {
      try {
        // 创建预览 URL
        const reader = new FileReader()
        reader.onload = (event) => {
          // 上传成功后添加到数组
        }
        reader.readAsDataURL(file)

        // 上传图片（自动压缩）
        const imageUrl = await uploadImage(file)
        
        // 添加到图片数组
        setImages(prev => {
          const newImages = [...prev, imageUrl]
          onChange(newImages)
          setMessage(`已上传 ${newImages.length}/${maxCount} 张图片`)
          return newImages
        })
        
        onUploadComplete?.(imageUrl)
      } catch (err: any) {
        const errorMsg = err.message || '图片上传失败'
        setError(errorMsg)
        onUploadError?.(errorMsg)
      }
    }

    setUploading(false)
    
    // 清空 input，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index)
      onChange(newImages.length > 0 ? newImages : null)
      return newImages
    })
    setMessage('')
    setError('')
    setWarning('')
  }

  const handleRemoveAll = () => {
    setImages([])
    onChange(null)
    setMessage('')
    setError('')
    setWarning('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleButtonClick = () => {
    if (isMobileDevice) {
      // 移动端显示选择弹窗
      setShowMobileDialog(true)
    } else {
      // PC 端直接打开文件选择器（支持多选）
      setCurrentCapture(undefined)
      fileInputRef.current?.click()
    }
  }

  const handleSelectCamera = (capture: 'user' | 'environment' | undefined) => {
    setCurrentCapture(capture)
    setShowMobileDialog(false)
    // 延迟一下让 input 重新渲染
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 100)
  }

  // 构建 input 属性
  const inputProps: {
    type: string
    accept: string
    onChange: (e: ChangeEvent<HTMLInputElement>) => void
    className: string
    disabled: boolean
    capture?: 'user' | 'environment'
    multiple?: boolean
  } = {
    type: 'file',
    accept,
    onChange: handleFileSelect,
    className: 'hidden',
    disabled: disabled || uploading,
    multiple: true,  // 支持多选
  }

  // 添加 capture 属性
  if (currentCapture) {
    inputProps.capture = currentCapture
  }

  const canAddMore = images.length < maxCount

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 消息提示 */}
      {message && (
        <div className="text-green-500 text-sm bg-green-50 p-3 rounded-lg">
          {message}
        </div>
      )}
      {error && (
        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}
      {warning && (
        <div className="text-yellow-500 text-sm bg-yellow-50 p-3 rounded-lg">
          {warning}
        </div>
      )}

      {/* 上传按钮和预览区域 */}
      <div className="space-y-2">
        {images.length === 0 ? (
          /* 未选择图片时显示上传按钮 */
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              {...inputProps}
            />
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={disabled || uploading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  上传中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {placeholder}
                </>
              )}
            </button>
            <span className="text-sm text-gray-500">最多 {maxCount} 张</span>
          </div>
        ) : (
          /* 已选择图片时显示轮播预览 */
          <div className="relative">
            <Carousel
              images={images}
              className={previewSize}
              onImageClick={() => {}}
            />
            
            {/* 移除全部按钮 */}
            {showRemove && !uploading && (
              <button
                type="button"
                onClick={handleRemoveAll}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-md z-10"
                title="移除所有图片"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* 移除单张图片按钮（在轮播指示器旁边显示） */}
            {showRemove && !uploading && images.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveImage(0)}
                className="absolute bottom-8 right-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition shadow-md z-10"
                title="移除当前图片"
              >
                移除当前
              </button>
            )}
            
            {uploading && showProgress && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <div className="text-white text-center">
                  <svg className="animate-spin h-8 w-8 mx-auto mb-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm">上传中...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 添加更多图片按钮 */}
        {canAddMore && images.length > 0 && (
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              {...inputProps}
            />
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={disabled || uploading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加图片 ({maxCount - images.length} 张)
            </button>
          </div>
        )}

        {/* 已上传数量提示 */}
        {images.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>已上传 {images.length} 张</span>
            <span>最多 {maxCount} 张</span>
          </div>
        )}

      </div>

      {/* 移动端选择弹窗 */}
      {showMobileDialog && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowMobileDialog(false)}
        >
          <div
            className="bg-white w-full max-w-xs rounded-xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">选择图片</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleSelectCamera('environment')}
                className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition flex items-center justify-center gap-2"
              >
                📷 拍照
              </button>
              <button
                onClick={() => handleSelectCamera(undefined as any)}
                className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
              >
                🖼️ 从相册选择（可多选）
              </button>
            </div>
            <button
              onClick={() => setShowMobileDialog(false)}
              className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 transition"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}