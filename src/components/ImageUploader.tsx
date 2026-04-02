'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { uploadImage, validateImageFile, validateImageFileWithSize } from '@/lib/imageUpload'

interface ImageUploaderProps {
  value: string | null           // 当前图片 URL
  onChange: (url: string | null) => void  // 回调函数
  maxSize?: number               // 最大大小（字节），默认 5MB
  previewSize?: string           // 预览区域大小，默认 'w-full h-48'
  showRemove?: boolean           // 是否显示移除按钮，默认 true
  accept?: string                // 接受的文件类型，默认 'image/*'
  capture?: 'user' | 'environment'  // 摄像头选择：'user'=前置，'environment'=后置
  placeholder?: string           // 占位提示文字
  showProgress?: boolean         // 是否显示上传进度，默认 true
  className?: string             // 自定义类名
  disabled?: boolean             // 是否禁用，默认 false
  onUploadStart?: () => void     // 上传开始回调
  onUploadComplete?: (url: string) => void  // 上传完成回调
  onUploadError?: (error: string) => void   // 上传错误回调
}

export default function ImageUploader({
  value,
  onChange,
  maxSize = 5 * 1024 * 1024,
  previewSize = 'w-full h-48',
  showRemove = true,
  accept = 'image/*',
  capture,
  placeholder = '选择图片',
  showProgress = true,
  className = '',
  disabled = false,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件
    const validation = validateImageFileWithSize(file)
    if (!validation.valid) {
      setError(validation.error!)
      onUploadError?.(validation.error!)
      return
    }

    // 如果有警告信息，显示但不阻止上传
    if (validation.warning) {
      setWarning(validation.warning)
      setError('')
    } else {
      setWarning('')
      setError('')
    }

    setUploading(true)
    onUploadStart?.()

    try {
      // 创建预览 URL
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string)
      }
      reader.readAsDataURL(file)

      // 上传图片（自动压缩）
      const imageUrl = await uploadImage(file)
      onChange(imageUrl)
      setMessage('图片上传成功！')
      onUploadComplete?.(imageUrl)
    } catch (err: any) {
      const errorMsg = err.message || '图片上传失败'
      setError(errorMsg)
      setWarning('')
      onUploadError?.(errorMsg)
      // 上传失败时清除预览和值
      setPreviewUrl(null)
      onChange(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setPreviewUrl(null)
    onChange(null)
    setMessage('')
    setError('')
    setWarning('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 构建 input 属性
  const inputProps: {
    type: string
    accept: string
    onChange: (e: ChangeEvent<HTMLInputElement>) => void
    className: string
    disabled: boolean
    capture?: 'user' | 'environment'
  } = {
    type: 'file',
    accept,
    onChange: handleFileSelect,
    className: 'hidden',
    disabled: disabled || uploading,
  }

  // 添加 capture 属性（移动端拍照支持）
  if (capture) {
    inputProps.capture = capture
  }

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
        {!previewUrl ? (
          /* 未选择图片时显示上传按钮 */
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              {...inputProps}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
            <span className="text-xs text-gray-500">
              支持 JPG、PNG、GIF、WebP 格式
            </span>
          </div>
        ) : (
          /* 已选择图片时显示预览 */
          <div className="relative">
            <img
              src={previewUrl}
              alt="预览"
              className={`${previewSize} object-cover rounded-lg border border-gray-200`}
            />
            {showRemove && !uploading && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-md"
                title="移除图片"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          {...inputProps}
        />
      </div>
    </div>
  )
}