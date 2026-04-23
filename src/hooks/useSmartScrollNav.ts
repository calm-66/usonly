import { useState, useEffect } from 'react'

interface UseSmartScrollNavOptions {
  threshold?: number
  initialShow?: boolean
}

interface UseSmartScrollNavReturn {
  showNav: boolean
  navClassName: string
}

/**
 * 自定义 Hook：智能滚动导航栏
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

  useEffect(() => {
    let ticking = false
    let lastScrollTop = 0

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop
          
          // 滚动到顶部时，始终显示导航栏
          if (scrollTop < 10) {
            setShowNav(true)
          } else {
            const scrollDiff = scrollTop - lastScrollTop
            // 向下滚动（显示），向上滚动（隐藏）
            if (Math.abs(scrollDiff) > threshold) {
              setShowNav(scrollDiff < 0)
              lastScrollTop = scrollTop
            }
          }
          
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [threshold])

  const navClassName = `fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50 transition-transform duration-300 ${
    showNav ? 'translate-y-0' : 'translate-y-full'
  }`

  return { showNav, navClassName }
}