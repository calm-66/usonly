'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// 动态导入 react-leaflet 组件，避免 SSR 问题
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

// 静态导入 leaflet CSS（在文件顶部，TypeScript 可以正确处理）
import 'leaflet/dist/leaflet.css'

interface Post {
  id: string
  date: string
  title: string | null
  text: string | null
  imageUrl: string | null
  latitude?: number | null
  longitude?: number | null
  location?: string | null
  createdAt: string
  userId: string
}

interface User {
  id: string
  username: string
  email: string
  avatarUrl?: string | null
  partnerId: string | null
  partner?: {
    id: string
    username: string
    email: string
    avatarUrl?: string | null
  } | null
}

// 头像组件 - 优先使用 avatarUrl，没有则显示首字母
const Avatar = ({ 
  username, 
  avatarUrl,
  size = 'md' 
}: { 
  username: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' 
}) => {
  const firstChar = username.charAt(0)
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }
  const colorIndex = username.charCodeAt(0) % 6
  const bgColors = ['bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500']
  
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    )
  }
  
  return (
    <div className={`${sizeClasses[size]} ${bgColors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium`}>
      {firstChar.toUpperCase()}
    </div>
  )
}

// 获取头像背景颜色（与 Avatar 组件逻辑一致）
function getAvatarColor(username: string): string {
  const colorIndex = username.charCodeAt(0) % 6
  const bgColors = ['bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500']
  return bgColors[colorIndex]
}

// 地图中心控制组件
function MapController({ center }: { center: [number, number] }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, map.getZoom())
  }, [center, map])
  return null
}

// 地图实例设置组件
function MapInstanceSetter({ onMapReady }: { onMapReady: (map: any) => void }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map)
    }
  }, [map, onMapReady])
  return null
}

export default function MapPage() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.8617, 104.1954]) // 中国中心
  const [mounted, setMounted] = useState(false)
  // 联动状态：选中的地点 key
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(null)
  // 地图实例引用，用于程序控制地图
  const [mapInstance, setMapInstance] = useState<any>(null)
  // 列表引用，用于滚动定位
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)

    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      loadPosts(parsedUser)
    } else {
      window.location.href = '/'
    }
  }, [])

  const loadPosts = async (userData: User) => {
    try {
      setLoading(true)
      // 获取自己的帖子
      const res1 = await fetch('/api/post', {
        headers: { 'x-user-id': userData.id },
      })
      const data1 = await res1.json()
      
      // 获取伴侣的帖子
      let data2 = { posts: [] }
      if (userData.partnerId) {
        const res2 = await fetch(`/api/post?partnerId=${userData.partnerId}`, {
          headers: { 'x-user-id': userData.id },
        })
        data2 = await res2.json()
      }
      
      const allPosts = [...(data1.posts || []), ...(data2.posts || [])]
      // 过滤出有位置的帖子
      const postsWithLocation = allPosts.filter((p: Post) => p.latitude && p.longitude)
      setPosts(postsWithLocation)
      
      // 如果有位置数据，设置地图中心为第一个位置
      if (postsWithLocation.length > 0) {
        setMapCenter([postsWithLocation[0].latitude!, postsWithLocation[0].longitude!])
      }
    } catch (err) {
      console.error('加载帖子失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="text-center text-gray-600">加载中...</div>
      </main>
    )
  }

  // 按用户分组统计
  const myPostsCount = posts.filter(p => p.userId === user.id).length
  const partnerPostsCount = posts.filter(p => p.userId !== user.id).length

  // 按地点分组（基于所有帖子，不受筛选影响）
  const allLocationsMap = new Map<string, Post[]>()
  posts.forEach(post => {
    const key = `${post.latitude}-${post.longitude}`
    if (!allLocationsMap.has(key)) {
      allLocationsMap.set(key, [])
    }
    allLocationsMap.get(key)!.push(post)
  })

  // 筛选帖子 - 按时间倒序排序
  const filteredPosts = selectedUserId === 'all' 
    ? [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [...posts].filter(p => p.userId === selectedUserId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // 按地点分组（用于地图显示）
  const locationsMap = selectedUserId === 'all'
    ? allLocationsMap
    : (() => {
        const map = new Map<string, Post[]>()
        filteredPosts.forEach(post => {
          const key = `${post.latitude}-${post.longitude}`
          if (!map.has(key)) {
            map.set(key, [])
          }
          map.get(key)!.push(post)
        })
        return map
      })()

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-2 flex justify-center">
          <h1 className="text-xl font-bold text-gray-800">UsOnly</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* 统计卡片 - 同时作为筛选按钮 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* 我的打卡 */}
        <button
          onClick={() => setSelectedUserId(user.id)}
          className={`bg-white rounded-xl shadow-sm p-3 text-center transition ${
            selectedUserId === user.id ? 'ring-2 ring-pink-500' : ''
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Avatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
            <span className="text-sm text-gray-600 truncate">{user.username}</span>
          </div>
          <div className="text-lg font-bold text-pink-500">{myPostsCount}</div>
        </button>
        
        {/* TA 的打卡 */}
        <button
          onClick={() => setSelectedUserId(user.partnerId || 'none')}
          disabled={!user.partnerId}
          className={`bg-white rounded-xl shadow-sm p-3 text-center transition disabled:opacity-50 ${
            selectedUserId === user.partnerId ? 'ring-2 ring-purple-500' : ''
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {user.partner ? (
              <>
                <Avatar username={user.partner.username} avatarUrl={user.partner.avatarUrl} size="sm" />
                <span className="text-sm text-gray-600 truncate">{user.partner.username}</span>
              </>
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300" />
            )}
          </div>
          <div className="text-lg font-bold text-purple-500">{partnerPostsCount}</div>
        </button>
        
        {/* 地点数 - 显示两人的头像 */}
        <button
          onClick={() => setSelectedUserId('all')}
          className={`bg-white rounded-xl shadow-sm p-3 text-center transition ${
            selectedUserId === 'all' ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex justify-center gap-1 mb-1">
            <Avatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
            {user.partner && <Avatar username={user.partner.username} avatarUrl={user.partner.avatarUrl} size="sm" />}
          </div>
          <div className="text-lg font-bold text-blue-500">{allLocationsMap.size}</div>
        </button>
      </div>

        {/* 地图容器 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
          {loading ? (
            <div className="h-96 flex items-center justify-center text-gray-500">
              加载中...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p>还没有位置打卡</p>
                <p className="text-sm">去发布页添加位置吧～</p>
              </div>
            </div>
          ) : !mounted ? (
            <div className="h-96 flex items-center justify-center text-gray-500">
              加载地图中...
            </div>
          ) : (
            <div className="h-64">
              <MapContainer
                center={mapCenter}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}"
                  subdomains={['1', '2', '3', '4']}
                  attribution='&copy; 高德地图'
                />
                <MapInstanceSetter onMapReady={setMapInstance} />
                {Array.from(locationsMap.entries()).map(([key, postsAtLocation]) => {
                  const post = postsAtLocation[0]
                  const position: [number, number] = [post.latitude!, post.longitude!]
                  const isSelected = selectedLocationKey === key
                  // 获取发帖用户的头像信息
                  const postUser = post.userId === user.id ? user : (user.partner || { id: '', username: 'TA', avatarUrl: null })
                  const isMyPost = post.userId === user.id
                  // 动态创建头像图标
                  const L = require('leaflet')
                  const avatarIcon = L.divIcon({
                    className: 'avatar-marker',
                    html: postUser.avatarUrl 
                      ? `<div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; border: 2px solid ${isMyPost ? '#ec4899' : '#a855f8'}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                           <img src="${postUser.avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
                         </div>`
                      : `<div class="w-8 h-8 rounded-full ${getAvatarColor(postUser.username)} flex items-center justify-center text-white text-xs font-medium border-2 ${isMyPost ? 'border-pink-500' : 'border-purple-500'} shadow-lg">${postUser.username.charAt(0).toUpperCase()}</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  })
                  return (
                    <Marker 
                      key={key} 
                      position={position} 
                      icon={avatarIcon}
                      eventHandlers={{
                        click: () => {
                          setSelectedLocationKey(key)
                          // 滚动列表到对应位置
                          const firstPostId = postsAtLocation[0].id
                          setTimeout(() => {
                            const element = document.getElementById(`post-${firstPostId}`)
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }
                          }, 100)
                        }
                      }}
                    >
                      <Popup>
                        <div className="min-w-[150px]">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar 
                              username={postUser.username} 
                              avatarUrl={postUser.avatarUrl} 
                              size="sm" 
                            />
                            <span className="text-xs text-gray-500">{postUser.username}</span>
                          </div>
                          <div className="font-bold text-gray-800 text-center border-t pt-2">
                            {post.location || '打卡地点'}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
                <MapController center={mapCenter} />
              </MapContainer>
            </div>
          )}
        </div>

        {/* 打卡列表 */}
        {filteredPosts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">我们的足迹</h2>
            <div 
              ref={listRef}
              className="space-y-3 max-h-64 overflow-y-auto"
            >
              {filteredPosts.map((post) => {
                const postLocationKey = post.latitude && post.longitude 
                  ? `${post.latitude}-${post.longitude}` 
                  : null
                const isSelected = selectedLocationKey === postLocationKey
                return (
                  <div 
                    key={post.id} 
                    id={`post-${post.id}`}
                    className={`p-3 rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-pink-50 ring-2 ring-pink-300' 
                        : 'bg-gray-50'
                    }`}
                    onClick={() => {
                      if (postLocationKey && mapInstance) {
                        setSelectedLocationKey(postLocationKey)
                        // 地图飞到该位置
                        mapInstance.flyTo([post.latitude!, post.longitude!], 12, {
                          duration: 0.5
                        })
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* 头像 */}
                      <Avatar 
                        username={post.userId === user.id ? user.username : user.partner?.username || 'TA'} 
                        avatarUrl={post.userId === user.id ? user.avatarUrl : user.partner?.avatarUrl}
                        size="md" 
                      />
                      <div className="flex-1 min-w-0">
                        {/* 日期 */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400">{post.date}</span>
                        </div>
                        {/* 位置 */}
                        {post.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <svg className="w-3 h-3 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {post.location}
                          </div>
                        )}
                        {/* 标题 */}
                        {post.title && (
                          <div className="text-sm font-medium text-gray-700 mb-1">{post.title}</div>
                        )}
                        {/* 文字内容 */}
                        {post.text && (
                          <div className="text-sm text-gray-600 mb-2">{post.text}</div>
                        )}
                        {/* 图片 */}
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt="打卡图片"
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-4xl mx-auto flex">
          <a href="/timeline" className="flex-1 py-2 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">时间轴</span>
          </a>
          <a href="/map" className="flex-1 py-2 text-center text-pink-500 bg-pink-50">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">足迹</span>
          </a>
          <a href="/profile" className="flex-1 py-2 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">我的</span>
          </a>
        </div>
      </nav>
    </main>
  )
}