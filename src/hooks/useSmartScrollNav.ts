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
 * - 使用 requestAnimationFrame 优化性能
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

  useEffect(() => {
    let ticking = false

    const getScrollTop = (): number => {
      // 优先使用 document.scrollingElement（更可靠，支持多种浏览器和框架）
      const scrollingElement = document.scrollingElement || document.documentElement
      return scrollingElement.scrollTop
    }

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = getScrollTop()
          
          // 滚动到顶部时，始终显示导航栏
          if (scrollTop < 10) {
            setShowNav(true)
            lastScrollTopRef.current = scrollTop
          } else {
            const scrollDiff = scrollTop - lastScrollTopRef.current
            // 向下滚动（显示），向上滚动（隐藏）
            if (Math.abs(scrollDiff) > threshold) {
              setShowNav(scrollDiff < 0)
              lastScrollTopRef.current = scrollTop
            }
          }
          
          ticking = false
        })
        ticking = true
      }
    }

    // 同时监听 window 和 document 的滚动事件，确保兼容性
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [threshold])

  const navClassName = `fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-40 transition-transform duration-300 ${
    showNav ? 'translate-y-0' : 'translate-y-full'
  }`

  return { showNav, navClassName }
}