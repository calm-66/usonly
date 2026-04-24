import { useState, useEffect, useRef } from 'react'

interface UseSmartScrollNavOptions {
  threshold?: number
  initialShow?: boolean
}

interface UseSmartScrollNavReturn {
  showNav: boolean
  navClassName: string
}

/**
 * 自定义 Hook：智能滚动导航栏 (Smart Scroll Navigation Bar)
 * 
 * 功能：
 * - 向上滚动时隐藏导航栏，向下滚动时显示
 * - 滚动到顶部时始终显示
 * - 使用 debounce 优化性能，兼容移动端浏览器
 * 
 * @param options 配置选项
 * @returns showNav 状态和 navClassName 类名
 */
export function useSmartScrollNav(
  options: UseSmartScrollNavOptions = {}
): UseSmartScrollNavReturn {
  const { threshold = 10, initialShow = true } = options
  
  const [showNav, setShowNav] = useState(initialShow)
  const lastScrollTopRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      // 清除之前的 timeout，实现 debounce 效果
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        // 获取滚动位置，兼容多种浏览器
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0
        
        // 滚动到顶部时，始终显示导航栏
        if (scrollTop < 50) {
          setShowNav(true)
        } else {
          const scrollDiff = scrollTop - lastScrollTopRef.current
          // 向下滚动（隐藏），向上滚动（显示）
          if (Math.abs(scrollDiff) > threshold) {
            setShowNav(scrollDiff < 0)
            lastScrollTopRef.current = scrollTop
          }
        }
      }, 50) // 50ms debounce
    }

    // 同时监听 window 和 document 的滚动事件
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [threshold])

  const navClassName = `fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-40 transition-transform duration-300 ${
    showNav ? 'translate-y-0' : 'translate-y-full'
  }`

  return { showNav, navClassName }
}