# Implementation Plan - Timeline Redesign to Masonry Grid Layout

## Overview
将 timeline 页面从竖排列表布局重新设计为横排 Masonry Grid（瀑布流）布局，采用现代化高级感设计风格。

## Scope
本实施计划涵盖 timeline 页面的 UI 重构，包括：
- 帖子卡片组件重新设计（图片优先的 Masonry Grid 布局）
- 日期分组标签样式更新
- 整体配色方案调整为简洁高级风格
- 保持现有功能（评论、筛选、标签页切换等）正常工作

## Types
现有类型定义无需修改，复用 `src/app/timeline/page.tsx` 中已有的接口定义。

关键数据类型：
```typescript
interface Post {
  id: string
  userId: string
  date: string
  title: string | null
  imageUrls: string[] | null
  text: string | null
  createdAt: string
  owner: '我' | 'TA'
  latitude?: number | null
  longitude?: number | null
  location?: string | null
}

interface DayPosts {
  date: string
  title: string | null
  myPosts: Post[]
  partnerPosts: Post[]
}
```

## Files

### 修改的文件
1. **src/app/timeline/page.tsx** - 主要修改文件
   - 更新整体页面背景色和配色方案
   - 重构帖子卡片渲染逻辑，采用 Masonry Grid 布局
   - 更新卡片组件结构（头像、图片网格、文字、操作栏）
   - 更新日期分组标签样式

### 保持不变的文件
- `src/components/ImageGallery.tsx` - 图片放大查看器（复用）
- `src/components/CommentModal.tsx` - 评论弹窗（复用）
- `src/app/globals.css` - 全局样式（无需修改）
- `tailwind.config.js` - Tailwind 配置（无需修改）

## Functions

### 新增函数
1. **renderMasonryGrid** (内联在组件中)
   - 位置：`src/app/timeline/page.tsx`
   - 用途：渲染 Masonry Grid 布局的图片网格
   - 参数：`imageUrls: string[]`, `onClick: () => void`
   - 返回值：`JSX.Element`

2. **renderPostCard** (内联在组件中)
   - 位置：`src/app/timeline/page.tsx`
   - 用途：渲染单个帖子卡片（新设计）
   - 参数：`post: Post`, `showOwner: boolean`
   - 返回值：`JSX.Element`

### 修改函数
1. **groupByDate** - 返回值结构不变，内部渲染逻辑更新
2. **getDisplayPosts** - 保持不变
3. **groupPersonalPostsByDate** - 保持不变

### 移除内容
- 移除旧的垂直列表卡片渲染逻辑
- 移除粉色/紫色边框和背景渐变样式

## Classes
无类定义修改（项目使用函数式组件）

## Dependencies
无需新增 npm 包，使用纯 CSS 实现 Masonry 布局效果。

## Testing
- 手动测试各标签页（我的、我们的、TA 的）显示正常
- 测试 Masonry Grid 布局在移动端和 PC 端的响应式效果
- 测试图片点击放大功能
- 测试评论功能
- 测试时间筛选功能

## Implementation Order

1. **步骤 1：更新页面背景和整体配色**
   - 将渐变背景改为简洁的浅灰色背景
   - 移除过多的粉色/紫色装饰元素

2. **步骤 2：创建 Masonry Grid 图片网格组件**
   - 实现多图片自适应布局
   - 支持 1-9 张图片的不同排列方式
   - 添加点击放大功能

3. **步骤 3：重新设计帖子卡片组件**
   - 顶部：用户头像 + 用户名
   - 中部：Masonry Grid 图片 + 标题/正文/位置
   - 底部：评论按钮 + 时间（右对齐）

4. **步骤 4：更新日期分组标签样式**
   - 设计简洁的日期标签组件
   - 保持"今天"、"昨天"等语义化显示

5. **步骤 5：整合并测试**
   - 将新组件整合到 timeline 页面
   - 确保所有现有功能正常工作
   - 测试响应式布局

---

## 设计规范

### 配色方案
- 页面背景：`bg-gray-50` 或 `bg-neutral-50`
- 卡片背景：`bg-white`
- 文字主色：`text-gray-900` / `text-gray-700`
- 文字次要色：`text-gray-500` / `text-gray-400`
- 强调色：保持简洁，不过度使用彩色

### 卡片设计（参考右侧图片）
```
┌─────────────────────────────────┐
│ 👤 用户名                        │  ← 顶部头像区
├─────────────────────────────────┤
│                                 │
│     [图片 1]  [图片 2]          │  ← Masonry Grid
│     [图片 3]  [图片 4]          │    图片网格区
│                                 │
├─────────────────────────────────┤
│ 标题（如有）                     │
│ 正文内容（如有）                 │
│ 📍 位置（如有）                  │
├─────────────────────────────────┤
│ 💬 12 评论              19:13   │  ← 底部操作栏
└─────────────────────────────────┘
```

### Masonry Grid 布局规则
- 1 张图：单张大图显示
- 2 张图：上下或左右排列
- 3 张图：一大两小
- 4 张图：2x2 网格
- 5-9 张图：3x3 网格，超过 9 张显示"+N"遮罩

### 响应式断点
- 移动端（<640px）：单列 Masonry
- 平板（≥640px）：双列 Masonry
- PC（≥1024px）：三列 Masonry