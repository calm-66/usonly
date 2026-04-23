'use client'

import { useState, useRef, useCallback } from 'react'

export interface ImageLayoutItem {
  url: string
  col: number      // 0-2
  row: number      // 0-2
  colSpan: number  // 1-3
  rowSpan: number  // 1-3
}

export interface LayoutConfig {
  images: ImageLayoutItem[]
}

interface PhotoLayoutEditorProps {
  imageUrls: string[]
  onChange: (config: LayoutConfig) => void
}

const GRID_SIZE = 3

// 默认布局：均匀分布
function getDefaultLayout(imageUrls: string[]): ImageLayoutItem[] {
  return imageUrls.map((url, index) => ({
    url,
    col: index % GRID_SIZE,
    row: Math.floor(index / GRID_SIZE),
    colSpan: 1,
    rowSpan: 1,
  }))
}

export default function PhotoLayoutEditor({ imageUrls, onChange }: PhotoLayoutEditorProps) {
  const [layout, setLayout] = useState<ImageLayoutItem[]>(() => getDefaultLayout(imageUrls))
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const gridRef = useRef<HTMLDivElement>(null)

  // 验证缩放是否有效
  const isValidResize = useCallback((index: number, newColSpan: number, newRowSpan: number): boolean => {
    const totalCells = GRID_SIZE * GRID_SIZE
    const otherImagesCount = imageUrls.length - 1
    const neededCells = newColSpan * newRowSpan + otherImagesCount
    return neededCells <= totalCells
  }, [imageUrls.length])

  // 处理缩放
  const handleResize = useCallback((index: number, colSpan: number, rowSpan: number) => {
    if (!isValidResize(index, colSpan, rowSpan)) {
      return // 无效缩放，不执行
    }

    const newLayout = [...layout]
    const item = newLayout[index]
    
    // 检查边界
    const maxCol = GRID_SIZE - colSpan
    const maxRow = GRID_SIZE - rowSpan
    
    item.colSpan = colSpan
    item.rowSpan = rowSpan
    item.col = Math.min(item.col, maxCol)
    item.row = Math.min(item.row, maxRow)

    setLayout(newLayout)
    onChange({ images: newLayout })
  }, [layout, onChange, isValidResize])

  // 拖拽开始
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, index: number) => {
    // 如果点击的是按钮，不触发拖拽
    if ((e.target as HTMLElement).closest('.resize-btn, .delete-btn')) return

    e.preventDefault()
    setDraggingIndex(index)
    
    const touch = 'touches' in e ? e.touches[0] : e
    const rect = gridRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      })
    }
  }, [])

  // 拖拽移动
  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (draggingIndex === null) return
    
    const touch = 'touches' in e ? e.touches[0] : e
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return

    const cellWidth = rect.width / GRID_SIZE
    const cellHeight = rect.height / GRID_SIZE

    const relativeX = touch.clientX - rect.left
    const relativeY = touch.clientY - rect.top

    // 计算目标网格位置
    let targetCol = Math.floor(relativeX / cellWidth)
    let targetRow = Math.floor(relativeY / cellHeight)

    // 边界检查
    const item = layout[draggingIndex]
    targetCol = Math.max(0, Math.min(targetCol, GRID_SIZE - item.colSpan))
    targetRow = Math.max(0, Math.min(targetRow, GRID_SIZE - item.rowSpan))

    // 更新位置
    const newLayout = [...layout]
    newLayout[draggingIndex] = { ...item, col: targetCol, row: targetRow }
    setLayout(newLayout)
    onChange({ images: newLayout })
  }, [draggingIndex, layout, onChange])

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null)
  }, [])

  // 删除图片
  const handleDelete = useCallback((index: number) => {
    const newLayout = layout.filter((_, i) => i !== index)
    setLayout(newLayout)
    onChange({ images: newLayout })
    if (selectedIndex === index) setSelectedIndex(null)
  }, [layout, onChange, selectedIndex])

  // 点击图片选中
  const handleImageClick = useCallback((index: number) => {
    setSelectedIndex(prev => prev === index ? null : index)
  }, [])

  // 重置布局
  const handleReset = useCallback(() => {
    const newLayout = getDefaultLayout(imageUrls)
    setLayout(newLayout)
    onChange({ images: newLayout })
    setSelectedIndex(null)
  }, [imageUrls, onChange])

  // 应用预设布局
  const applyPreset = useCallback((preset: string) => {
    let newLayout: ImageLayoutItem[] = []
    
    switch (preset) {
      case 'featured-left':
        // 左大右三
        newLayout = [
          { url: imageUrls[0], col: 0, row: 0, colSpan: 1, rowSpan: 3 },
          { url: imageUrls[1], col: 1, row: 0, colSpan: 1, rowSpan: 1 },
          { url: imageUrls[2], col: 2, row: 0, colSpan: 1, rowSpan: 1 },
          { url: imageUrls[3], col: 1, row: 1, colSpan: 2, rowSpan: 1 },
          { url: imageUrls[4], col: 1, row: 2, colSpan: 2, rowSpan: 1 },
        ].filter((_, i) => i < imageUrls.length)
        break
      case 'uniform':
        // 均匀分布
        newLayout = getDefaultLayout(imageUrls)
        break
      case 'center-big':
        // 中心大图
        if (imageUrls.length >= 2) {
          newLayout = [
            { url: imageUrls[0], col: 1, row: 1, colSpan: 1, rowSpan: 1 },
            { url: imageUrls[1], col: 0, row: 0, colSpan: 1, rowSpan: 1 },
            ...imageUrls.slice(2).map((url, i) => ({
              url,
              col: (i + 2) % GRID_SIZE,
              row: Math.floor((i + 2) / GRID_SIZE),
              colSpan: 1,
              rowSpan: 1,
            }))
          ]
        } else {
          newLayout = getDefaultLayout(imageUrls)
        }
        break
      default:
        newLayout = getDefaultLayout(imageUrls)
    }
    
    // 确保不超过图片数量
    newLayout = newLayout.slice(0, imageUrls.length)
    setLayout(newLayout)
    onChange({ images: newLayout })
  }, [imageUrls, onChange])

  if (imageUrls.length === 0) return null

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => applyPreset('featured-left')}
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-pink-50 hover:text-pink-600 rounded-lg transition"
          >
            左大右三
          </button>
          <button
            type="button"
            onClick={() => applyPreset('uniform')}
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-pink-50 hover:text-pink-600 rounded-lg transition"
          >
            均匀分布
          </button>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
        >
          重置
        </button>
      </div>

      {/* 网格编辑器 */}
      <div
        ref={gridRef}
        className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* 网格背景 */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 p-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-sm" />
          ))}
        </div>

        {/* 图片块 */}
        {layout.map((item, index) => (
          <div
            key={item.url + index}
            className={`absolute rounded-lg overflow-hidden cursor-grab transition-shadow ${
              draggingIndex === index ? 'z-50 shadow-xl scale-105' : 'z-10'
            } ${selectedIndex === index ? 'ring-2 ring-pink-500' : ''}`}
            style={{
              left: `${(item.col / GRID_SIZE) * 100}%`,
              top: `${(item.row / GRID_SIZE) * 100}%`,
              width: `${(item.colSpan / GRID_SIZE) * 100}%`,
              height: `${(item.rowSpan / GRID_SIZE) * 100}%`,
              padding: '2px',
            }}
            onMouseDown={(e) => handleDragStart(e, index)}
            onTouchStart={(e) => handleDragStart(e, index)}
            onClick={() => handleImageClick(index)}
          >
            <img
              src={item.url}
              alt={`图片 ${index + 1}`}
              className="w-full h-full object-cover pointer-events-none"
            />
            
            {/* 序号 */}
            <span className="absolute top-1 left-1 w-5 h-5 bg-black/60 text-white text-xs rounded-full flex items-center justify-center">
              {index + 1}
            </span>

            {/* 选中时显示控制按钮 */}
            {selectedIndex === index && (
              <>
                {/* 缩放按钮 */}
                <div className="absolute bottom-1 right-1 flex gap-0.5">
                  {[
                    { colSpan: 1, rowSpan: 1, label: '1×1' },
                    { colSpan: 2, rowSpan: 1, label: '2×1' },
                    { colSpan: 1, rowSpan: 2, label: '1×2' },
                    { colSpan: 2, rowSpan: 2, label: '2×2' },
                  ].filter(size => isValidResize(index, size.colSpan, size.rowSpan)).map(size => (
                    <button
                      key={size.label}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleResize(index, size.colSpan, size.rowSpan)
                      }}
                      className="resize-btn w-6 h-6 bg-black/60 text-white text-xs rounded flex items-center justify-center hover:bg-black/80 transition"
                      title={size.label}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>

                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(index)
                  }}
                  className="delete-btn absolute top-1 right-1 w-5 h-5 bg-red-500/80 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 提示文字 */}
      <p className="text-xs text-gray-400 text-center">
        点击图片选中，拖拽移动位置，使用缩放按钮调整大小
      </p>
    </div>
  )
}