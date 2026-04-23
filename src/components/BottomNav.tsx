'use client'

import { useSmartScrollNav } from '@/hooks/useSmartScrollNav'

interface BottomNavProps {
  activePage?: 'timeline' | 'map' | 'profile'
}

/**
 * 底部导航组件
 * 
 * 功能：
 * - 支持智能滚动隐藏/显示
 * - 支持高亮当前页面
 * - 统一的样式和动画
 * 
 * @param activePage 当前激活的页面
 */
export default function BottomNav({ activePage }: BottomNavProps) {
  const { navClassName } = useSmartScrollNav()

  const navItems = [
    {
      id: 'timeline' as const,
      href: '/timeline',
      label: '时间轴',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'map' as const,
      href: '/map',
      label: '足迹',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'profile' as const,
      href: '/profile',
      label: '我的',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className={navClassName}>
      <div className="max-w-[500px] mx-auto flex">
        {navItems.map((item) => {
          const isActive = item.id === activePage
          return (
            <a
              key={item.id}
              href={item.href}
              className={`flex-1 py-3 text-center ${
                isActive ? 'text-gray-800' : 'text-gray-500'
              }`}
            >
              {item.icon}
              <span className="text-[10px]">{item.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}