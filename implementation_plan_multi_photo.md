# Implementation Plan - 多照片发布功能

## Overview
将 UsOnly 项目的发布 post 功能从单张照片扩展为支持最多 3 张照片，采用轮播图展示方式，保持与现有单图 post 的兼容性。

## 背景与范围

**需求总结**：
- 每个 post 最多可发布 3 张照片
- 历史单图 post 保持兼容显示
- 时间轴上使用轮播图（Carousel）展示多张照片
- 用户在相册中可选择多张照片，直至达到上限 3 张

**技术约束**：
- 遵循现有项目架构（Next.js + Prisma + PostgreSQL）
- 保持向后兼容，单图 post 无需迁移
- 考虑手机端浏览器的用户体验

## Types

### 数据库类型变更

#### Post 模型修改
将 `imageUrl` 字段从 `String?` 改为 `String[]` 数组类型，存储多张图片 URL。

```prisma
// 修改前
imageUrl  String?       // 图片 URL（可选）

// 修改后
imageUrls String[]      // 图片 URL 数组（最多 3 张）
```

### TypeScript 类型定义

#### 1. Post 接口更新
```typescript
// src/app/timeline/page.tsx 和 src/app/post/page.tsx

interface Post {
  id: string
  userId: string
  date: string
  title: string | null
  imageUrls: string[]    // 从 imageUrl 改为 imageUrls
  text: string | null
  createdAt: string
  owner: '我' | 'TA'
  latitude?: number | null
  longitude?: number | null
  location?: string | null
}
```

#### 2. API 请求/响应类型
```typescript
// src/app/api/post/route.ts

// POST 请求体
interface CreatePostRequest {
  date: string
  title?: string | null
  imageUrls?: string[] | null   // 从 imageUrl 改为 imageUrls
  text?: string | null
  latitude?: number | null
  longitude?: number | null
  location?: string | null
}

// POST 响应
interface CreatePostResponse {
  message: string
  post: {
    id: string
    imageUrls: string[]
    // ... 其他字段
  }
}
```

## Files

### 修改文件

#### 1. `prisma/schema.prisma`
**修改内容**：
- 将 `Post` 模型的 `imageUrl` 字段改为 `imageUrls String[]`

**迁移脚本**：
需要创建手动迁移脚本处理数据转换：
```sql
-- 将现有的 imageUrl 数据迁移到 imageUrls 数组
UPDATE "Post" SET "imageUrls" = ARRAY[imageUrl] WHERE imageUrl IS NOT NULL;
```

#### 2. `src/app/api/post/route.ts`
**修改内容**：
- POST 方法：将请求参数从 `imageUrl` 改为 `imageUrls`（数组）
- 验证图片数量不超过 3 张
- GET 方法：返回的 post 对象包含 `imageUrls` 数组

#### 3. `src/app/post/page.tsx`
**修改内容**：
- 状态从 `imageUrl: string` 改为 `imageUrls: string[]`
- 使用更新后的 `ImageUploader` 组件（支持多图选择）
- 提交时将数组发送给 API

#### 4. `src/app/timeline/page.tsx`
**修改内容**：
- Post 接口定义更新
- 渲染 post 时使用轮播图组件展示多张图片
- 处理兼容情况（单图 post 的 imageUrl 转换为数组）

#### 5. `src/components/ImageUploader.tsx`
**修改内容**：
- 新增 `multiple` 属性支持多图选择
- 新增 `maxCount` 属性限制最大上传数量
- 修改 `value` 从 `string | null` 改为 `string[] | null`
- 修改 `onChange` 从 `(url: string | null) => void` 改为 `(urls: string[] | null) => void`
- 新增轮播预览功能
- 新增移除单张图片的功能

#### 6. `src/components/Carousel.tsx`（新增）
**新文件**：轮播图组件，用于时间轴展示多张图片。

**功能**：
- 左右滑动切换图片（支持触摸滑动）
- 显示当前页码指示器（如 1/3）
- 点击图片放大查看
- 兼容单图情况（隐藏指示器和按钮）

### 新增文件

#### 1. `src/components/Carousel.tsx`
```typescript
'use client'

import { useState, useRef, TouchEvent } from 'react'

interface CarouselProps {
  images: string[]      // 图片 URL 数组
  alt?: string          // 替代文本
  className?: string    // 自定义类名
  onImageClick?: (index: number) => void  // 点击图片回调
}

// 实现轮播图组件
```

## Functions

### API 函数修改

#### 1. `POST /api/post` 处理函数
**文件**: `src/app/api/post/route.ts`

**修改内容**：
```typescript
// 修改前
const { date, title, imageUrl, text, latitude, longitude, location } = body

// 修改后
const { date, title, imageUrls, text, latitude, longitude, location } = body

// 添加验证
if (imageUrls && imageUrls.length > 3) {
  return NextResponse.json(
    { error: '最多只能上传 3 张图片' },
    { status: 400 }
  )
}

// 创建 post
const post = await prisma.post.create({
  data: {
    userId,
    date,
    title: title || null,
    imageUrls: imageUrls || [],  // 使用数组
    text,
    latitude: latitude || null,
    longitude: longitude || null,
    location: location || null,
  },
})
```

### 前端函数修改

#### 1. 发布页面表单提交
**文件**: `src/app/post/page.tsx`

**修改内容**：
```typescript
// 修改前
imageUrl: imageUrl || null,

// 修改后
imageUrls: imageUrls || [],
```

## Classes

不涉及类的设计变更。

## Dependencies

无需新增 npm 依赖。轮播图功能使用原生 React hooks 和 CSS 实现。

## Testing

### 手动测试清单

1. **发布功能测试**
   - [ ] 发布 0 张图片（纯文字 post）
   - [ ] 发布 1 张图片
   - [ ] 发布 2 张图片
   - [ ] 发布 3 张图片
   - [ ] 尝试发布 4 张图片（应被阻止）
   - [ ] 移除已选择的图片
   - [ ] 重新选择图片

2. **时间轴展示测试**
   - [ ] 单图 post 正常显示（兼容历史数据）
   - [ ] 多图 post 显示轮播图
   - [ ] 轮播图左右滑动切换
   - [ ] 页码指示器正确显示
   - [ ] 点击图片放大查看
   - [ ] 手机端触摸滑动流畅

3. **数据兼容性测试**
   - [ ] 历史单图 post 在数据库迁移后正常显示
   - [ ] 新旧 post 混合显示无问题

4. **边界情况测试**
   - [ ] 空图片数组处理
   - [ ] 无效图片 URL 处理
   - [ ] 网络异常时上传错误提示

## Implementation Order

### 第一阶段：数据库修改
1. 修改 `prisma/schema.prisma`，将 `imageUrl` 改为 `imageUrls String[]`
2. 生成迁移：`npx prisma migrate dev --name add_multi_photo_support`
3. 创建手动 SQL 脚本迁移现有数据：
   ```sql
   UPDATE "Post" SET "imageUrls" = ARRAY[imageUrl] WHERE imageUrl IS NOT NULL;
   ```

### 第二阶段：组件修改
4. 修改 `src/components/ImageUploader.tsx`：
   - 支持多图选择（multiple 属性）
   - 修改 value 和 onChange 为数组类型
   - 添加 maxCount 属性
   - 添加多图预览和移除功能

5. 创建 `src/components/Carousel.tsx` 轮播图组件

### 第三阶段：API 修改
6. 修改 `src/app/api/post/route.ts`：
   - 修改 POST 方法处理 imageUrls 数组
   - 添加数量验证（最多 3 张）
   - 修改 GET 方法返回格式

### 第四阶段：页面修改
7. 修改 `src/app/post/page.tsx`：
   - 修改状态为 imageUrls 数组
   - 更新 ImageUploader 组件使用方式
   - 修改表单提交逻辑

8. 修改 `src/app/timeline/page.tsx`：
   - 更新 Post 接口定义
   - 使用 Carousel 组件渲染图片
   - 处理兼容逻辑（单图转数组）

### 第五阶段：测试验证
9. 执行手动测试清单
10. 验证手机端轮播图体验
11. 确认历史数据兼容

---

## 附录：轮播图设计要点

### CSS 实现要点
```css
/* 轮播图容器 */
.carousel-container {
  position: relative;
  overflow: hidden;
}

/* 图片轨道 */
.carousel-track {
  display: flex;
  transition: transform 0.3s ease-out;
}

/* 指示器 */
.carousel-indicator {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
}

.indicator-dot.active {
  background: white;
}
```

### 触摸滑动实现要点
- 使用 `onTouchStart`、`onTouchMove`、`onTouchEnd` 事件
- 记录起始触摸位置
- 计算滑动距离和方向
- 根据滑动距离切换图片