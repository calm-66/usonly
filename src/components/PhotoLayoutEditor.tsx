'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

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

// 预设布局生成函数
function generatePresetLayouts(imageUrls: string[]): { name: string; layout: ImageLayoutItem[]; preview: { col: number; row: number; colSpan: number; rowSpan: number }[] }[] {
  const presets: { name: string; layout: ImageLayoutItem[]; preview: { col: number; row: number; colSpan: number; rowSpan: number }[] }[] = [
    {
      name: '左大右小',
      layout: [
        { url: imageUrls[0] || '', col: 0, row: 0, colSpan: 1, rowSpan: 3 },
        { url: imageUrls[1] || '', col: 1, row: 0, colSpan: 1, rowSpan: 1 },
        { url: imageUrls[2] || '', col: 2, row: 0, colSpan: 1, rowSpan: 1 },
        { url: imageUrls[3] || '', col: 1, row: 1, colSpan: 2, rowSpan: 1 },
        { url: imageUrls[4] || '', col: 1, row: 2, colSpan: 2, rowSpan: 1 },
      ].slice(0, imageUrls.length),
      preview: [
        { col: 0, row: 0, colSpan: 1, rowSpan: 3 },
        { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
        { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
        { col: 1, row: 1, colSpan: 2, rowSpan: 1 },
        { col: 1, row: 2, colSpan: 2, rowSpan: 1 },
      ].slice(0, Math.min(imageUrls.length, 5)),
    },
    {
      name: '上一下三',
      layout: [
        { url: imageUrls[0] || '', col: 0, row: 0, colSpan: 3, rowSpan: 1 },
        { url: imageUrls[1] || '', col: 0, row: 1, colSpan: 1, rowSpan: 1 },
        { url: imageUrls[2] || '', col: 1, row: 1, colSpan: 1, rowSpan: 1 },
        { url: imageUrls[3] || '', col: 2, row: 1, colSpan: 1, rowSpan: 1 },
        { url: imageUrls[4] || '', col: 0, row: 2, colSpan: 3, rowSpan: 1 },
      ].slice(0, imageUrls.length),
      preview: [
        { col: 0, row: 0, colSpan: 3, rowSpan: 1 },
        { col: 0, row: 1, colSpan: 1, rowSpan: 1 },
        { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
        { col: 2, row: 1, colSpan: 1, rowSpan: 1 },
        { col: 0, row: 2, colSpan: 3, rowSpan: 1 },
      ].slice(0, Math.min(imageUrls.length, 5)),
    },
    {
      name: '均匀分布',
      layout: getDefaultLayout(imageUrls),
      preview: imageUrls.map((_, i) => ({
        col: i % GRID_SIZE,
        row: Math.floor(i / GRID_SIZE),
        colSpan: 1,
        rowSpan: 1,
      })),
    },
  ]
  return presets
}

export default function PhotoLayoutEditor({ imageUrls, onChange }: PhotoLayoutEditorProps) {
  const [layout, setLayout] = useState<ImageLayoutItem[]>(() => getDefaultLayout(imageUrls))
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // 监听 imageUrls 变化，同步更新 layout
  useEffect(() => {
    if (imageUrls.length > layout.length) {
      // 有新图片添加，追加到 layout
      const newItems = imageUrls.slice(layout.length).map((url, index) => ({
        url,
        col: (layout.length + index) % GRID_SIZE,
        row: Math.floor((layout.length + index) / GRID_SIZE),
        colSpan: 1,
        rowSpan: 1,
      }))
      const newLayout = [...layout, ...newItems]
      setLayout(newLayout)
      onChange({ images: newLayout })
    } else if (imageUrls.length < layout.length) {
      // 有图片被删除，从 layout 中移除对应的项
      const newLayout = layout.slice(0, imageUrls.length)
      setLayout(newLayout)
      onChange({ images: newLayout })
    }
  }, [imageUrls])
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, colSpan: 1, rowSpan: 1 })
  const [originalPosition, setOriginalPosition] = useState<{ col: number; row: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // 检查位置是否与其他图片重叠
  const checkOverlap = useCallback((excludeIndex: number, col: number, row: number, colSpan: number, rowSpan: number): boolean => {
    // 检查边界
    if (col < 0 || row < 0 || col + colSpan > GRID_SIZE || row + rowSpan > GRID_SIZE) {
      return true // 超出边界也算重叠
    }

    // 检查与其他图片是否重叠
    for (let i = 0; i < layout.length; i++) {
      if (i === excludeIndex) continue
      
      const other = layout[i]
      // 检查两个矩形是否重叠
      const overlap = !(col + colSpan <= other.col || 
                       other.col + other.colSpan <= col || 
                       row + rowSpan <= other.row || 
                       other.row + other.rowSpan <= row)
      if (overlap) return true
    }
    return false
  }, [layout])

  // 验证缩放是否有效（不重叠且在边界内）
  const isValidResize = useCallback((index: number, newColSpan: number, newRowSpan: number): boolean => {
    const item = layout[index]
    if (!item) return false
    
    // 检查边界
    if (item.col + newColSpan > GRID_SIZE) return false
    if (item.row + newRowSpan > GRID_SIZE) return false
    
    // 检查是否与其他图片重叠
    return !checkOverlap(index, item.col, item.row, newColSpan, newRowSpan)
  }, [layout, checkOverlap])

  // 处理右下角拖拽缩放
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, index: number) => {
    e.stopPropagation()
    e.preventDefault()
    
    const item = layout[index]
    if (!item) return
    
    setIsResizing(true)
    const touch = 'touches' in e ? e.touches[0] : e
    setResizeStart({
      x: touch.clientX,
      y: touch.clientY,
      colSpan: item.colSpan,
      rowSpan: item.rowSpan,
    })
    setDraggingIndex(index)
    setOriginalPosition({ col: item.col, row: item.row })
  }, [layout])

  // 拖拽开始（移动）
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, index: number) => {
    // 如果点击的是拖拽手柄或删除按钮，不触发移动
    if ((e.target as HTMLElement).closest('.resize-handle, .delete-btn')) return

    e.preventDefault()
    e.stopPropagation()
    setDraggingIndex(index)
    setOriginalPosition({ col: layout[index].col, row: layout[index].row })
  }, [layout])

  // 拖拽/缩放移动
  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (draggingIndex === null) return
    
    e.preventDefault()
    
    const touch = 'touches' in e ? e.touches[0] : e
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return

    const cellWidth = rect.width / GRID_SIZE
    const cellHeight = rect.height / GRID_SIZE

    const item = layout[draggingIndex]
    if (!item) return

    if (isResizing) {
      // 缩放模式
      const deltaX = touch.clientX - resizeStart.x
      const deltaY = touch.clientY - resizeStart.y
      
      // 计算新的尺寸（基于拖拽距离）
      const deltaCols = Math.round(deltaX / cellWidth)
      const deltaRows = Math.round(deltaY / cellHeight)
      
      let newColSpan = Math.max(1, Math.min(GRID_SIZE - item.col, resizeStart.colSpan + deltaCols))
      let newRowSpan = Math.max(1, Math.min(GRID_SIZE - item.row, resizeStart.rowSpan + deltaRows))
      
      if (!isValidResize(draggingIndex, newColSpan, newRowSpan)) {
        return // 无效缩放，不执行
      }
      
      const newLayout = [...layout]
      newLayout[draggingIndex] = { ...item, colSpan: newColSpan, rowSpan: newRowSpan }
      setLayout(newLayout)
      onChange({ images: newLayout })
    } else {
      // 移动模式
      const relativeX = touch.clientX - rect.left
      const relativeY = touch.clientY - rect.top

      // 计算目标网格位置
      let targetCol = Math.floor(relativeX / cellWidth)
      let targetRow = Math.floor(relativeY / cellHeight)

      // 边界检查
      targetCol = Math.max(0, Math.min(targetCol, GRID_SIZE - item.colSpan))
      targetRow = Math.max(0, Math.min(targetRow, GRID_SIZE - item.rowSpan))

      // 检查是否与当前位置不同且有重叠
      const isSamePosition = targetCol === item.col && targetRow === item.row
      const hasOverlap = checkOverlap(draggingIndex, targetCol, targetRow, item.colSpan, item.rowSpan)
      
      // 如果位置没变或者没有重叠，则更新位置
      if (isSamePosition || !hasOverlap) {
        const newLayout = [...layout]
        newLayout[draggingIndex] = { ...item, col: targetCol, row: targetRow }
        setLayout(newLayout)
        onChange({ images: newLayout })
      }
      // 如果有重叠且有原位置，吸附回原位置
      else if (originalPosition && (targetCol !== item.col || targetRow !== item.row)) {
        const newLayout = [...layout]
        newLayout[draggingIndex] = { ...item, col: originalPosition.col, row: originalPosition.row }
        setLayout(newLayout)
        onChange({ images: newLayout })
      }
    }
  }, [draggingIndex, isResizing, resizeStart, layout, onChange, isValidResize, checkOverlap, originalPosition])

  // 拖拽/缩放结束
  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null)
    setIsResizing(false)
    setOriginalPosition(null)
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
  const applyPreset = useCallback((presetIndex: number) => {
    const presets = generatePresetLayouts(imageUrls)
    const preset = presets[presetIndex]
    if (!preset) return
    
    // 只取实际有图片的部分
    const newLayout = imageUrls.map((url, i) => {
      const p = preset.layout[i]
      return p ? { ...p, url } : { url, col: i % GRID_SIZE, row: Math.floor(i / GRID_SIZE), colSpan: 1, rowSpan: 1 }
    })
    
    setLayout(newLayout)
    onChange({ images: newLayout })
    setSelectedIndex(null)
  }, [imageUrls, onChange])

  if (imageUrls.length === 0) return null

  const presets = generatePresetLayouts(imageUrls)

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {presets.map((preset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => applyPreset(index)}
              className="flex-shrink-0 w-16 h-16 bg-gray-50 hover:bg-pink-50 rounded-lg p-1 transition border-2 border-transparent hover:border-pink-300"
              title={preset.name}
            >
              <div className="relative w-full h-full">
                {preset.preview.map((cell, i) => (
                  <div
                    key={i}
                    className="absolute bg-gray-300 rounded-sm border border-gray-400"
                    style={{
                      left: `${(cell.col / GRID_SIZE) * 100}%`,
                      top: `${(cell.row / GRID_SIZE) * 100}%`,
                      width: `${(cell.colSpan / GRID_SIZE) * 100}%`,
                      height: `${(cell.rowSpan / GRID_SIZE) * 100}%`,
                    }}
                  />
                ))}
              </div>
            </button>
          ))}
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
        className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden touch-none"
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
            className={`absolute rounded-lg overflow-hidden cursor-grab transition-shadow touch-none ${
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
                {/* 缩放拖拽手柄 */}
                <div
                  className="resize-handle absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-20 flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, index)}
                  onTouchStart={(e) => handleResizeStart(e, index)}
                >
                  <div className="w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M21 15v4a2 2 0 01-2 2H5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15 21l6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(index)
                  }}
                  className="delete-btn absolute top-1 right-1 w-5 h-5 bg-red-500/80 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition z-20"
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
        点击图片选中，拖拽移动位置，拖拽右下角手柄调整大小
      </p>
    </div>
  )
}