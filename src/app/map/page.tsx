'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// 动态导入 react-leaflet 组件，避免 SSR 问题
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface Post {
  id: string
  date: string
  title: string | null
  text: string | null
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
  partnerId: string | null
  partner?: {
    id: string
    username: string
    email: string
  } | null
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

export default function MapPage() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.8617, 104.1954]) // 中国中心
  const [mounted, setMounted] = useState(false)
  const [defaultIcon, setDefaultIcon] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    
    // 在客户端动态导入 leaflet
    const initLeaflet = async () => {
      const L = await import('leaflet')
      await import('leaflet/dist/leaflet.css')
      
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
      setDefaultIcon(icon)
    }
    
    initLeaflet()

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

  // 筛选帖子
  const filteredPosts = selectedUserId === 'all' 
    ? posts 
    : posts.filter(p => p.userId === selectedUserId)

  // 按地点分组
  const locationsMap = new Map<string, Post[]>()
  filteredPosts.forEach(post => {
    const key = `${post.latitude}-${post.longitude}`
    if (!locationsMap.has(key)) {
      locationsMap.set(key, [])
    }
    locationsMap.get(key)!.push(post)
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <a href="/timeline" className="text-gray-600 hover:text-gray-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <h1 className="text-xl font-bold text-gray-800">我们的足迹</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-pink-500">{myPostsCount}</div>
            <div className="text-xs text-gray-500">我的打卡</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">{partnerPostsCount}</div>
            <div className="text-xs text-gray-500">TA 的打卡</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{locationsMap.size}</div>
            <div className="text-xs text-gray-500">地点数</div>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedUserId('all')}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                selectedUserId === 'all'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setSelectedUserId(user.id)}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                selectedUserId === user.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              我的
            </button>
            <button
              onClick={() => setSelectedUserId(user.partnerId || 'none')}
              disabled={!user.partnerId}
              className={`flex-1 py-2 px-4 rounded-lg transition disabled:opacity-50 ${
                selectedUserId === user.partnerId
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              TA 的
            </button>
          </div>
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
          ) : !mounted || !defaultIcon ? (
            <div className="h-96 flex items-center justify-center text-gray-500">
              加载地图中...
            </div>
          ) : (
            <div className="h-96">
              <MapContainer
                center={mapCenter}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {Array.from(locationsMap.entries()).map(([key, postsAtLocation]) => {
                  const post = postsAtLocation[0]
                  const position: [number, number] = [post.latitude!, post.longitude!]
                  return (
                    <Marker key={key} position={position} icon={defaultIcon}>
                      <Popup>
                        <div className="min-w-[200px]">
                          <div className="font-bold text-gray-800 mb-2">
                            {post.location || '打卡地点'}
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            共 {postsAtLocation.length} 次打卡
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {postsAtLocation.map(p => (
                              <div key={p.id} className="border-t pt-2 first:border-0 first:pt-0">
                                <div className="text-xs text-gray-400">
                                  {p.userId === user.id ? '我' : user.partner?.username || 'TA'} · {p.date}
                                </div>
                                {p.title && (
                                  <div className="text-sm font-medium text-gray-700">{p.title}</div>
                                )}
                                {p.text && (
                                  <div className="text-xs text-gray-600 truncate">{p.text}</div>
                                )}
                              </div>
                            ))}
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
            <h2 className="text-lg font-bold text-gray-800 mb-4">打卡记录</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {filteredPosts.map((post) => (
                <div key={post.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          post.userId === user.id
                            ? 'bg-pink-100 text-pink-600'
                            : 'bg-purple-100 text-purple-600'
                        }`}>
                          {post.userId === user.id ? '我' : user.partner?.username || 'TA'}
                        </span>
                        <span className="text-xs text-gray-400">{post.date}</span>
                      </div>
                      {post.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                          <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {post.location}
                        </div>
                      )}
                      {post.title && (
                        <div className="text-sm font-medium text-gray-700">{post.title}</div>
                      )}
                      {post.text && (
                        <div className="text-sm text-gray-600 truncate">{post.text}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-4xl mx-auto flex">
          <a href="/timeline" className="flex-1 py-3 text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">时间轴</span>
          </a>
          <a href="/map" className="flex-1 py-3 text-center text-pink-500 bg-pink-50">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">足迹</span>
          </a>
          <a href="/profile" className="flex-1 py-3 text-center text-gray-500">
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