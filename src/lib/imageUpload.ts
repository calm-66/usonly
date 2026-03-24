/**
 * 图片上传工具函数
 * 使用 ImgBB 或其他免费图床服务上传图片
 */

// ImgBB API 配置（可以通过环境变量设置）
const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || ''

/**
 * 压缩图片到指定大小
 */
export function compressImage(file: File, maxSize: number = 1024 * 1024): Promise<File> {
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
        const maxWidth = 1920
        const maxHeight = 1920
        
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
            resolve(compressedFile)
          },
          'image/jpeg',
          0.8
        )
      }
      img.onerror = () => reject(new Error('图片加载失败'))
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
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
 */
export async function uploadImage(file: File, useBase64: boolean = false): Promise<string> {
  try {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      throw new Error('请选择图片文件')
    }

    // 验证文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('图片大小不能超过 5MB')
    }

    // 压缩图片
    const compressedFile = await compressImage(file)

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
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: '请选择图片文件' }
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: '仅支持 JPG、PNG、GIF、WebP 格式' }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: '图片大小不能超过 5MB' }
  }

  return { valid: true }
}