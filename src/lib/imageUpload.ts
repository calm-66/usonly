/**
 * 图片上传工具函数
 * 使用 ImgBB 或其他免费图床服务上传图片
 */

// ImgBB API 配置（通过环境变量设置）
// NEXT_PUBLIC_前缀确保环境变量在客户端可用
// 在 Next.js 中，NEXT_PUBLIC_前缀的环境变量会在构建时嵌入到客户端代码中
declare const process: {
  env: {
    NEXT_PUBLIC_IMGBB_API_KEY: string
  }
}

const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || ''

// 压缩配置常量
const COMPRESSION_THRESHOLD = 1024 * 1024      // 1MB - 低于此大小不压缩
const MAX_FILE_SIZE = 5 * 1024 * 1024          // 5MB - 最大上传限制
const TARGET_SIZE = 500 * 1024                 // 500KB - 目标大小

/**
 * 压缩图片到指定大小
 * @param file 原始图片文件
 * @param options 压缩选项
 * @param options.quality 压缩质量 (0.1-1.0)，默认 0.8
 * @param options.maxWidth 最大宽度，默认 1920
 * @param options.maxHeight 最大高度，默认 1920
 * @param options.targetSize 目标文件大小（字节），默认 5MB
 * @param options.iterative 是否迭代压缩直到达标，默认 false
 */
export function compressImage(
  file: File, 
  options: {
    quality?: number
    maxWidth?: number
    maxHeight?: number
    targetSize?: number
    iterative?: boolean
  } = {}
): Promise<File> {
  const {
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1920,
    targetSize = MAX_FILE_SIZE,
    iterative = false
  } = options

  // 如果不需要迭代压缩且文件已经小于目标大小，直接返回
  if (!iterative && file.size <= targetSize) {
    return Promise.resolve(file)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // 如果图片太大，进行缩放
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法获取 canvas 上下文'))
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        // 转换为 blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('图片转换失败'))
              return
            }
            
            // 创建新的 File 对象
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            
            // 如果需要迭代压缩且当前文件仍然太大
            if (iterative && compressedFile.size > targetSize) {
              // 降低质量重新压缩
              const newQuality = Math.max(0.3, quality - 0.15)
              if (newQuality > 0.3) {
                // 递归调用，使用更低的质量
                canvas.toBlob(
                  (newBlob) => {
                    if (!newBlob) {
                      reject(new Error('图片转换失败'))
                      return
                    }
                    const newCompressedFile = new File([newBlob], file.name, {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    })
                    // 如果仍然太大，继续降低质量或缩小尺寸
                    if (newCompressedFile.size > targetSize) {
                      // 缩小尺寸后重新压缩
                      const smallerWidth = Math.floor(width * 0.8)
                      const smallerHeight = Math.floor(height * 0.8)
                      if (smallerWidth > 100 && smallerHeight > 100) {
                        canvas.width = smallerWidth
                        canvas.height = smallerHeight
                        ctx.drawImage(img, 0, 0, smallerWidth, smallerHeight)
                        resolve(compressImage(
                          newCompressedFile,
                          { quality: newQuality, maxWidth: smallerWidth, maxHeight: smallerHeight, targetSize, iterative: true }
                        ))
                      } else {
                        // 已经是最小尺寸了，返回当前结果
                        resolve(newCompressedFile)
                      }
                    } else {
                      resolve(newCompressedFile)
                    }
                  },
                  'image/jpeg',
                  newQuality
                )
              } else {
                // 质量已经最低，返回当前结果
                resolve(compressedFile)
              }
            } else {
              resolve(compressedFile)
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('图片加载失败'))
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
  })
}

/**
 * 智能压缩图片：根据文件大小自动选择压缩策略
 * @param file 原始图片文件
 * @returns 压缩后的文件
 */
export function smartCompressImage(file: File): Promise<File> {
  // 小于 1MB，不压缩
  if (file.size <= COMPRESSION_THRESHOLD) {
    return Promise.resolve(file)
  }
  
  // 1MB - 5MB，轻度压缩
  if (file.size <= MAX_FILE_SIZE) {
    return compressImage(file, { quality: 0.85 })
  }
  
  // 超过 5MB，强制迭代压缩到 5MB 以内
  return compressImage(file, { 
    quality: 0.8,
    targetSize: MAX_FILE_SIZE,
    iterative: true
  })
}

/**
 * 将文件转换为 Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
  })
}

/**
 * 上传图片到 ImgBB
 */
export async function uploadToImgbb(file: File): Promise<string> {
  if (!IMGBB_API_KEY) {
    throw new Error('请配置 ImgBB API Key')
  }

  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error?.message || '上传失败')
  }

  return data.data.url
}

/**
 * 上传图片（自动选择最佳方式）
 * 如果有 ImgBB API Key，使用 ImgBB；否则返回 base64
 * 自动使用智能压缩策略
 */
export async function uploadImage(file: File, useBase64: boolean = false): Promise<string> {
  try {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      throw new Error('请选择图片文件')
    }

    // 智能压缩图片
    const compressedFile = await smartCompressImage(file)

    // 如果启用 base64 模式或没有 ImgBB API Key，使用 base64
    if (useBase64 || !IMGBB_API_KEY) {
      console.warn('使用 Base64 模式存储图片，建议配置 ImgBB API Key 以获得更好的体验')
      return await fileToBase64(compressedFile)
    }

    // 使用 ImgBB 上传
    return await uploadToImgbb(compressedFile)
  } catch (error) {
    console.error('图片上传失败:', error)
    throw error
  }
}

/**
 * 验证图片文件
 * 只检查文件类型，不检查大小（大小由压缩函数自动处理）
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: '请选择图片文件' }
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: '仅支持 JPG、PNG、GIF、WebP 格式' }
  }

  // 文件类型有效，大小由压缩函数自动处理
  return { valid: true }
}

/**
 * 验证图片文件（包含大小检查）
 * 用于需要预先告知用户的场景
 */
export function validateImageFileWithSize(file: File): { valid: boolean; error?: string; warning?: string } {
  const basicValidation = validateImageFile(file)
  if (!basicValidation.valid) {
    return basicValidation
  }

  // 如果文件超过 10MB，给出警告但仍允许上传（会自动压缩）
  if (file.size > 10 * 1024 * 1024) {
    return { 
      valid: true, 
      warning: '图片较大，将自动压缩处理' 
    }
  }

  return { valid: true }
}
