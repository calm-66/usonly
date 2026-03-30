# UsOnly 项目总结 - 产品经理视角

## 一、产品概述

### 产品定位
UsOnly 是一个**情侣/配对社交应用**，核心概念是：
- 两个用户配对成功后，可以每天记录彼此的生活，在时间轴上并排查看彼此的分享，增强互动感

### 目标用户
- 情侣
- 亲密朋友
- 想要建立深度连接的两个人

### 核心价值
- **私密性**：只有配对成功的两人才能看到彼此的内容
- **仪式感**：每天记录生活点滴，创造共同回忆
- **互动感**：并排展示的时间轴设计

---

## 二、业务流程

### 用户旅程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户视角的业务流程                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 注册账号                                                        │
│     ↓                                                               │
│  2. 搜索想配对的用户                                                │
│     ↓                                                               │
│  3. 发送配对请求                                                    │
│     ↓                                                               │
│  4. 等待对方确认                                                    │
│     ↓                                                               │
│  5. 配对成功 → 开始记录生活                                          │
│     ↓                                                               │
│  6. 上传分享（图片/文字），可选填标题                                │
│     ↓                                                               │
│  7. 查看时间轴，看到对方的分享                                       │
│     ↓                                                               │
│  8. 持续互动，建立深度连接                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、系统架构（产品经理版）

### 三层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                      第一层：前端展示层 (UI)                         │
│  用户看到和交互的界面                                               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │ 登录/注册  │  │ 配对中心  │  │ 时间轴    │  │ 发布页    │       │
│  │ 页面      │  │ 页面      │  │ 页面      │  │ 面        │       │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓ 用户操作触发请求
┌─────────────────────────────────────────────────────────────────────┐
│                      第二层：API 接口层 (桥梁)                       │
│  处理业务逻辑，连接前端和数据库                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                      │
│  │ /auth     │  │ /pair-    │  │ /post     │                      │
│  │ 用户认证  │  │ request   │  │ 内容发布  │                      │
│  └───────────┘  └───────────┘  └───────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓ 读写数据
┌─────────────────────────────────────────────────────────────────────┐
│                      第三层：数据层 (数据库)                         │
│  存储所有业务数据                                                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                      │
│  │ User      │  │ Pair      │  │ Post      │                      │
│  │ 用户表    │  │ Request   │  │ 分享表    │                      │
│  │           │  │ 配对请求表 │  │           │                      │
│  └───────────┘  └───────────┘  └───────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 四、核心数据表（业务实体）

### 1. User 用户表
**存储什么**：所有注册用户的信息

| 字段 | 类型 | 含义 | 业务说明 |
|------|------|------|---------|
| id | UUID | 用户唯一标识 | 系统自动生成，用于内部关联 |
| username | String | 用户名 | 用户注册时填写，用于搜索，全局唯一 |
| email | String | 邮箱 | 登录账号，唯一索引 |
| password | String | 密码 | 加密存储 |
| avatarUrl | String? | 头像 URL | 可选，支持上传自定义头像 |
| partnerId | String? | 配对对象 ID | 配对成功后存储对方的 ID，建立一对一关系 |
| pairedAt | DateTime? | 配对开始时间 | 接受配对请求时记录，用于归档时判断配对期间 |
| breakupInitiated | Boolean | 是否发起解除 | 默认 false，true 表示已进入冷静期 |
| breakupAt | DateTime? | 冷静期开始时间 | 用于计算 7 天冷静期到期时间 |
| archivedPartnerId | String? | 已归档伴侣 ID | 解除配对后存储对方 ID，用于查看归档 |
| archivedAt | DateTime? | 归档时间 | 解除配对时记录归档时间 |
| createdAt | DateTime | 创建时间 | 自动记录注册时间 |
| updatedAt | DateTime | 更新时间 | 自动记录资料修改时间 |

### 2. PairRequest 配对请求表
**存储什么**：用户之间的配对请求记录

| 字段 | 类型 | 含义 | 业务说明 |
|------|------|------|---------|
| id | UUID | 请求唯一标识 | 系统自动生成 |
| senderId | String | 发送者 ID | 外键关联 User 表 |
| receiverId | String | 接收者 ID | 外键关联 User 表 |
| status | String | 请求状态 | pending(待处理)/accepted(已接受)/rejected(已拒绝) |
| createdAt | DateTime | 创建时间 | 请求发送时间 |
| updatedAt | DateTime | 更新时间 | 状态变更时间 |

**特殊约束**：同一对用户之间只能有一个请求（唯一索引）

### 3. Post 分享表
**存储什么**：用户每天的分享内容

| 字段 | 类型 | 含义 | 业务说明 |
|------|------|------|---------|
| id | UUID | 分享唯一标识 | 系统自动生成 |
| userId | String | 用户 ID | 外键关联 User 表 |
| date | String | 日期 | 格式：YYYY-MM-DD，用于按天聚合 |
| title | String? | 标题 | 可选，用户自定义的分享标题 |
| imageUrl | String? | 图片 URL | 可选，上传到图床后的地址 |
| text | String? | 文字 | 可选，用户想说的话 |
| isLatePost | Boolean | 是否补传 | 标记是否是过后补的分享 |
| archivedAt | DateTime? | 归档时间 | null=未归档，有值=已归档（配对期间的帖子） |
| archivedBy | String? | 归档操作人 | 执行归档操作的用户 ID |
| createdAt | DateTime | 创建时间 | 实际发布时间（精确到时分） |
| updatedAt | DateTime | 更新时间 | 修改时间 |

**索引优化**：(userId, date) 联合索引，加速按用户和日期的查询

---

## 五、核心业务流程详解

### 流程 1：用户注册

**用户操作**：
1. 用户在注册页面填写用户名、邮箱、密码
2. 点击"注册"按钮

**技术流转**：
```
前端页面 (/) 
    ↓ 用户点击注册按钮
React 组件捕获表单提交事件
    ↓ 调用 fetch() API
发送 POST 请求到 /api/auth/register
    ↓ Next.js 路由匹配
src/app/api/auth/register/route.ts 处理请求
    ↓ 解析请求体
读取 username, email, password 字段
    ↓ 调用 Prisma ORM
prisma.user.findUnique() 检查邮箱是否已存在
    ↓ 验证通过
prisma.user.create() 创建新用户 → 写入 User 表
    ↓ 返回 JSON 响应
前端收到成功响应 → 存储用户信息到 localStorage
    ↓ 页面跳转
window.location.href = '/timeline'
```

**涉及模块**：
- **前端**：`src/app/page.tsx` - 注册表单组件
- **API**：`src/app/api/auth/register/route.ts` - 注册接口
- **数据库**：`User` 表 - 存储用户信息
- **ORM**：Prisma - 类型安全的数据库操作

---

### 流程 2：配对互动

**用户操作**：
1. 用户进入"配对中心"页面
2. 在搜索框输入用户名，点击"搜索"
3. 在搜索结果中找到目标用户，点击"发送请求"
4. 或者切换到"收到的请求"标签，点击"接受"按钮

**技术流转**：

**发送配对请求**：
```
前端页面 (/pair)
    ↓ 用户输入搜索内容
React 状态管理：searchQuery useState
    ↓ 点击搜索按钮
handleSearch() 函数触发
    ↓ 调用 fetch()
GET /api/user/search?q=用户名
    ↓ API 处理
src/app/api/user/search/route.ts
    ↓ Prisma 查询
prisma.user.findMany({ where: { username: { contains: q } } })
    ↓ 返回搜索结果
前端渲染搜索结果列表
    ↓ 用户点击"发送请求"
handleSendRequest(receiverId) 触发
    ↓ 调用 fetch()
POST /api/pair-request
    Body: { receiverId }
    Headers: { 'x-user-id': currentUserId }
    ↓ API 验证
- 检查是否已登录（x-user-id 头）
- 检查是否已有伴侣
- 检查是否重复发送
    ↓ Prisma 事务
prisma.pairRequest.create() → 写入 PairRequest 表
    ↓ 返回成功
前端显示"配对请求已发送"提示
```

**接受配对请求**：
```
前端页面 (/pair)
    ↓ 页面加载时
useEffect 触发 → loadRequests()
    ↓ 调用 fetch()
GET /api/pair-request
    Headers: { 'x-user-id': currentUserId }
    ↓ API 查询
src/app/api/pair-request/route.ts
    ↓ Prisma 查询
prisma.pairRequest.findMany({
  where: { receiverId: userId, status: 'pending' },
  include: { sender: true }
})
    ↓ 前端渲染请求列表
用户看到发送者信息
    ↓ 点击"接受"
handleAcceptRequest(requestId) 触发
    ↓ 调用 fetch()
POST /api/pair-request/accept
    Body: { requestId }
    ↓ API 处理
src/app/api/pair-request/accept/route.ts
    ↓ 验证权限
- 检查是否是请求接收者
- 检查请求状态是否为 pending
    ↓ Prisma 事务操作（三个步骤原子执行）
prisma.$transaction([
  1. prisma.pairRequest.update({ status: 'accepted' })
  2. prisma.user.update({ id: receiverId, partnerId: senderId })
  3. prisma.user.update({ id: senderId, partnerId: receiverId })
])
    ↓ 更新本地状态
localStorage 更新用户 partnerId
    ↓ 页面跳转
setTimeout → window.location.href = '/'
```

**涉及模块**：
- **前端**：`src/app/pair/page.tsx` - 配对中心页面，包含搜索和请求管理
- **API**：
  - `src/app/api/user/search/route.ts` - 用户搜索接口
  - `src/app/api/pair-request/route.ts` - 发送/获取配对请求接口
  - `src/app/api/pair-request/accept/route.ts` - 接受请求接口
- **数据库**：`PairRequest` 表 + `User` 表

**关键技术点**：
- **数据库事务**：接受请求时三个更新操作原子执行，避免数据不一致
- **乐观更新**：前端先更新 localStorage，提升用户体验

---

### 流程 3：发布每日分享

**用户操作**：
1. 用户进入"发布"页面
2. 填写可选的标题
3. 上传图片（可选）
4. 输入文字内容（可选）
5. 点击"发布"按钮

**技术流转**：
```
前端页面 (/post)
    ↓ 用户填写内容
表单状态管理：imageUrl, text, title useState
    ↓ 点击发布
handleSubmit() 触发
    ↓ 调用 fetch()
POST /api/post
    Body: {
      date: '2026-03-24',
      title: '今天的好心情',
      imageUrl: 'https://...',
      text: '...',
      isLatePost: false
    }
    ↓ API 验证
src/app/api/post/route.ts
    ↓ Prisma 创建
prisma.post.create({
  data: { userId, date, title, imageUrl, text, isLatePost }
})
    ↓ 返回成功
前端显示"发布成功"提示
    ↓ 自动跳转
setTimeout → window.location.href = '/timeline'
```

**涉及模块**：
- **前端**：`src/app/post/page.tsx` - 发布表单
- **API**：`src/app/api/post/route.ts` - 创建分享接口
- **数据库**：`Post` 表 - 存储分享内容

---

### 流程 4：查看时间轴

**用户操作**：
1. 用户进入"时间轴"页面
2. 选择查看模式（我的/我们的/TA 的）
3. 滚动查看历史分享

**技术流转**：
```
前端页面 (/timeline)
    ↓ 页面加载时
useEffect 触发 → loadPosts()
    ↓ 并行请求两个 API
Promise.all([
  fetch('/api/post', { headers: { 'x-user-id': userId } }),
  fetch('/api/post?partnerId=xxx', { headers: { 'x-user-id': userId } })
])
    ↓ API 处理
src/app/api/post/route.ts (GET)
    ↓ Prisma 查询
prisma.post.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    ↓ 前端数据处理
groupByDate() 函数：
  - 将双方分享按日期分组
  - 每天的数据结构：{ date, title, myPosts[], partnerPosts[] }
    ↓ 渲染 UI
- "我们的"模式：并排展示双方分享
- "我的"模式：单列展示自己的
- "TA 的"模式：单列展示对方的
```

**涉及模块**：
- **前端**：`src/app/timeline/page.tsx` - 时间轴页面，核心展示逻辑
- **API**：`src/app/api/post/route.ts` - 获取分享接口
- **数据库**：`Post` 表 - 读取分享内容

---

### 流程 5：评论互动

**用户操作**：
1. 用户在时间轴看到某条分享
2. 点击"评论"按钮展开评论区
3. 输入评论内容，点击"发送"
4. 或者点击评论右上角"删除"按钮删除评论

**技术流转**：

**发表评论**：
```
前端页面 (/timeline)
    ↓ 用户输入评论内容
React 状态管理：newComment useState
    ↓ 点击发送
handleSendComment(postId) 触发
    ↓ 调用 fetch()
POST /api/comment
    Body: { postId, content, parentId? }
    Headers: { 'x-user-id': userId }
    ↓ API 验证
src/app/api/comment/route.ts
    ↓ 验证帖子存在
prisma.post.findUnique({ where: { id: postId } })
    ↓ Prisma 创建评论
prisma.comment.create({
  data: { postId, userId, content, parentId }
})
    ↓ 创建通知（如果是评论他人）
prisma.notification.create({
  data: { receiverId: postOwnerId, senderId: userId,
          type: 'comment', content: '评论了你的分享', postId }
})
    ↓ 返回成功
前端重新加载评论列表 → 显示新评论
```

**删除评论**：
```
前端页面 (/timeline)
    ↓ 点击删除
handleDeleteComment(commentId, postId) 触发
    ↓ 调用 fetch()
DELETE /api/comment?id=commentId
    ↓ API 验证权限
src/app/api/comment/delete/route.ts
    - 检查是否是评论者本人
    - 检查是否是分享作者
    ↓ Prisma 删除
prisma.comment.delete({ where: { id: commentId } })
    - 级联删除所有回复
    ↓ 返回成功
前端重新加载评论列表
```

**涉及模块**：
- **前端**：`src/app/timeline/page.tsx` - handleSendComment / handleDeleteComment 函数
- **API**：
  - `src/app/api/comment/route.ts` - 发表评论接口
  - `src/app/api/comment/delete/route.ts` - 删除评论接口
- **数据库**：`Comment` 表 + `Notification` 表

---

### 流程 6：查看通知

**用户操作**：
1. 用户看到顶部铃铛图标有红点
2. 点击铃铛图标展开通知列表
3. 查看通知内容
4. 可点击"全部标记为已读"

**技术流转**：
```
前端页面 (/timeline)
    ↓ 页面加载时
useEffect 触发 → loadNotifications()
    ↓ 调用 fetch()
GET /api/notification
    Headers: { 'x-user-id': userId }
    ↓ API 查询
src/app/api/notification/route.ts
    ↓ Prisma 查询
prisma.notification.findMany({
  where: { receiverId: userId },
  include: { sender: true, post: true },
  orderBy: { createdAt: 'desc' }
})
    ↓ 前端渲染
- 未读通知高亮显示
- 显示通知图标、内容、时间
    ↓ 点击"全部标记为已读"
handleMarkAllNotificationsAsRead() 触发
    ↓ 调用 fetch()
POST /api/notification
    Body: { markAllAsRead: true }
    ↓ Prisma 更新
prisma.notification.updateMany({
  where: { receiverId: userId },
  data: { isRead: true }
})
```

**涉及模块**：
- **前端**：`src/app/timeline/page.tsx` - 通知面板组件
- **API**：`src/app/api/notification/route.ts` - 获取/标记通知接口
- **数据库**：`Notification` 表

---

## 六、技术选型详解

### 前端技术栈

| 技术 | 作用 | 业务价值 | 实际应用场景 |
|------|------|---------|-------------|
| **Next.js 15** | React 全栈框架 | 前后端一体化开发，减少运维成本 | - App Router 架构组织页面路由<br>- Server Components 减少客户端 JS 体积<br>- API Routes 直接在后端处理业务 |
| **React 19** | UI 组件库 | 组件化开发，状态管理清晰 | - useState 管理表单状态<br>- useEffect 处理数据加载<br>- 组件复用（如头像渲染） |
| **TypeScript** | 类型系统 | 减少运行时错误，提升代码质量 | - 定义 User、Post、PairRequest 等接口<br>- API 响应类型推断<br>- 编译时检查类型错误 |
| **Tailwind CSS** | 原子化 CSS | 快速构建响应式 UI | - 渐变背景：`bg-gradient-to-br from-pink-100 to-purple-100`<br>- 响应式布局<br>- 移动端适配 |

### 后端技术栈

| 技术 | 作用 | 业务价值 | 实际应用场景 |
|------|------|---------|-------------|
| **Next.js API Routes** | 后端 API 服务 | 无需单独部署后端，降低复杂度 | - `/api/auth/register` 处理注册<br>- `/api/pair-request` 处理配对<br>- 统一的请求验证逻辑 |
| **Prisma ORM** | 数据库操作 | 类型安全，开发效率高 | - 定义 Schema 描述数据模型<br>- 类型安全的查询 API<br>- 事务支持（配对确认） |

### 数据库

| 技术 | 作用 | 业务价值 | 实际应用场景 |
|------|------|---------|-------------|
| **Neon PostgreSQL** | 云数据库 | Serverless 架构，按需付费 | - 存储用户数据<br>- 关系型数据模型<br>- 支持外键约束和事务 |

### 图片存储

| 技术 | 作用 | 业务价值 | 实际应用场景 |
|------|------|---------|-------------|
| **ImgBB API** | 免费图床服务 | 无需自建存储，快速集成 | - 用户头像上传<br>- 分享图片上传<br>- 支持 JPG/PNG/GIF/WebP 格式 |

### 部署

| 技术 | 作用 | 业务价值 | 实际应用场景 |
|------|------|---------|-------------|
| **Vercel** | 托管平台 | 一键部署，自动 HTTPS | - Git push 自动触发部署<br>- 全球 CDN 加速<br>- 免费额度足够个人项目 |

---

## 七、技术模块关系图（业务流转视角）

```
                         ┌─────────────────┐
                         │   用户注册登录   │
                         │  /api/auth/*    │
                         │                 │
                         │ 业务：创建账号   │
                         │ 数据：User 表    │
                         └────────────────┘
                                  │
                                  ↓
                         ┌─────────────────┐
                         │    用户搜索      │
                         │ /api/user/search│
                         │                 │
                         │ 业务：查找用户   │
                         │ 数据：User 查询  │
                         └────────┬────────┘
                                  │
                                  ↓
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ↓                   ↓                   ↓
       ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
       │ 发送配对请求 │    │   发布分享   │    │  获取分享   │
       │/api/pair-   │    │/api/post    │    │/api/post    │
       │request      │    │POST         │    │GET          │
       │             │    │             │    │             │
       │写入 PairReq │    │写入 Post 表  │    │读取 Post 表  │
       └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
              │                  │                   │
              ↓                  │                   │
       ┌─────────────┐           │                   │
       │ 接受配对请求 │           │                   │
       │/api/pair-   │           │                   │
       │request/     │           │                   │
       │accept       │           │                   │
       │             │           │                   │
       │事务更新：   │           │                   │
       │1. PairReq   │           │                   │
       │2. User A    │           │                   │
       │3. User B    │           │                   │
       └──────┬──────┘           │                   │
              │                  │                   │
              └──────────────────┼───────────────────┘
                                 │
                                 ↓
                         ┌─────────────┐
                         │  时间轴展示  │
                         │/api/post GET│
                         │             │
                         │ 合并双方数据 │
                         │ 按日期分组   │
                         │ 并排渲染 UI  │
                         └─────────────┘
```

---

## 八、功能模块关系图

```
                         ┌─────────────┐
                         │   用户系统   │
                         │   (auth)    │
                         └─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ↓                 ↓                 ↓
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │  配对系统    │  │  分享系统    │  │  通知系统   │
       │(pair-request)│  │   (post)    │  │(notification)│
       └─────────────┘  └──────┬──────┘  └──────┬──────┘
              │                 │                 │
              │                 │                 │
              └─────────────────┼─────────────────┘
                                │
                                ↓
                         ┌─────────────┐
                         │  时间轴展示  │
                         │  (timeline) │
                         └─────────────┘
```

---

## 九、产品迭代历史

### V1.0 - 基础功能
- [x] 用户注册/登录
- [x] 搜索用户
- [x] 发送/接受配对请求
- [x] 发布分享
- [x] 时间轴展示

### V1.1 - 体验优化
- [x] 移动端适配
- [x] 用户头像系统（根据 ID 生成渐变色）
- [x] 发布时间显示（精确到时分）
- [x] 图片放大查看

### V1.2 - 功能增强
- [x] 允许多次分享和撤销
- [x] 并排展示时间轴（增强互动感）
- [x] 支持一天多个分享

### V1.3 - 图片上传功能 ✨
- [x] 用户头像上传功能
  - 支持本地图片选择
  - 图片预览功能
  - 头像更换/移除
- [x] 分享图片上传功能
  - 发布时可选择图片
  - 支持 JPG/PNG/GIF/WebP 格式
  - 最大 5MB 限制
  - 自动图片压缩（1920x1920）
- [x] 多端支持
  - PC 端：文件系统选择
  - 移动端：相册选择
- [x] 图片存储
  - 使用 ImgBB 图床服务
  - 支持 Base64 降级方案

### V1.4 - 评论与通知系统 ✨
- [x] 评论功能
  - 支持嵌套评论（回复）
  - 评论者头像显示
  - 相对时间显示（刚刚/分钟前/小时前）
  - 评论删除（评论者或分享作者）
  - 评论数量徽章显示
- [x] 通知系统
  - 新分享通知（new_post）
  - 评论通知（comment）
  - 回复通知（comment_reply）
  - 配对成功通知（pair_accepted）
  - 全部标记为已读功能
  - 未读消息计数徽章
- [x] 数据库设计
  - Comment 表：支持嵌套评论
  - Notification 表：完整通知记录
  - 外键级联删除
  - 索引优化查询性能
- [x] 用户体验优化
  - 页面加载时预加载评论数量
  - 评论按钮展开/收起动画
  - 通知下拉面板
  - 时区问题修复（使用本地时间）

### V1.5 - 通知与交互增强 ✨
- [x] 新分享通知跳转功能
  - 点击新分享通知（📝 图标）可跳转到对应分享
  - 打开评论弹窗查看内容和评论
- [x] 评论通知跳转功能
  - 点击评论通知打开对应分享的评论弹窗
- [x] 评论回复通知功能
  - 回复评论时通知被回复的评论作者
- [x] 通知系统增强
  - 通知 2 天自动过期
  - 删除单条/所有通知功能
  - 自动标记已读
  - 点击铃铛图标时自动更新未读消息数量
- [x] 评论区全屏弹窗
  - 实现评论区全屏弹窗功能
  - 支持移动端适配
- [x] 评论重复显示修复
  - 只返回顶级评论，避免重复显示

### V1.6 - 标题系统优化 ✨
- [x] 发布页面优化
  - 将主题字段改为可选标题输入
  - Post 表 theme 字段改为 title
  - 发布页面显示标题输入框（可选）
- [x] 时间轴页面优化
  - 移除日期头部标题
  - post 卡片显示标题和时间
  - 简化日期显示格式
- [x] 顶部导航栏优化
  - UsOnly 标题居中显示（使用 absolute 定位）
  - 通知铃铛图标保持在右侧


### V1.7 - 通知系统优化与 Bug 修复 ✨
- [x] 通知系统增强
  - 新分享通知支持点击跳转到对应分享
  - 评论通知点击跳转功能
  - 评论回复通知功能
  - 删除单条/所有通知功能
- [x] 通知 Bug 修复
  - 修复通知红点无法正确显示的问题
  - 修复评论发送后通知和 UI 未更新的问题
  - 删除打开通知面板时自动标记已读的逻辑
  - 移除 Notification 模型中的 expiresAt 字段
- [x] UI 优化
  - Timeline 导航栏简化
  - 时间轴页面移除日期头部标题
  - post 卡片显示标题和时间


## V1.8 - 评论功能增强与归档回忆 ✨

#### 评论视觉优化
- [x] 评论图标颜色区分
  - 无评论：灰色 (`text-gray-400`)
  - 有评论："我"的帖子显示粉色，"TA"的帖子显示紫色

#### 评论交互优化
- [x] 回复按钮位置调整
  - 从内容下方移到消息右上角
  - 顺序：` 回复 | 删除`
- [x] 支持对回复进行再回复
  - 点击回复按钮可 @对方
  - 所有回复显示在同一层级（避免无限嵌套）
- [x] 修复回复发送后不显示的问题
  - 简单方案：所有回复的 `parentId` 指向顶级评论 ID

#### 归档回忆页面
- [x] 评论只读模式
  - 可以浏览所有评论
  - 不能发送或回复评论
  - 底部显示提示："归档回忆，仅支持浏览"

#### 技术实现
- [x] `CommentModal.tsx` 添加 `readonly` 属性
- [x] `archive/page.tsx` 传递 `readonly={true}`
- [x] `timeline/page.tsx` 评论图标颜色逻辑

---

### V1.9 - 匹配解除与归档系统 ✨

#### 冷静期机制
- [x] 三阶段解除流程
  - **发起阶段**：用户发起取消配对，进入 7 天冷静期
  - **冷静期**：7 天内可随时撤销，恢复配对关系
  - **确认/自动解除**：用户手动确认或 7 天后自动解除

#### API 接口
- [x] `/api/breakup/initiate` (POST) - 发起取消配对
  - 设置 `breakupInitiated: true` 和 `breakupAt` 时间戳
  - 给对方发送 `breakup_initiated` 通知
- [x] `/api/breakup/cancel` (POST) - 撤销取消配对
  - 仅在冷静期 7 天内有效
  - 清除冷静期状态，关系恢复正常
  - 给对方发送 `breakup_cancelled` 通知
- [x] `/api/breakup/confirm` (POST) - 确认解除配对
  - 仅在冷静期内可用
  - 立即解除配对关系
  - 归档配对期间的分享（根据 `pairedAt` 和 `archivedAt` 时间范围）
  - 给对方发送 `breakup_confirmed` 通知
- [x] `/api/breakup/check` (GET) - 检查冷静期到期
  - 定时调用（如每天凌晨）
  - 自动处理冷静期到期的用户
  - 发送 `breakup_auto_confirmed` 通知

#### 数据库模型更新
- [x] User 表新增字段
  - `pairedAt` (DateTime?) - 配对开始时间，接受配对时记录
  - `breakupInitiated` (Boolean) - 是否发起了解除配对
  - `breakupAt` (DateTime?) - 发起解除配对的时间
  - `archivedPartnerId` (String?) - 已归档的伴侣 ID
  - `archivedAt` (DateTime?) - 归档时间
- [x] Post 表归档字段
  - `archivedAt` (DateTime?) - 归档时间（null=未归档）
  - `archivedBy` (String?) - 归档操作人 userId

#### 归档逻辑
- [x] 配对期间判断：根据 `pairedAt`（配对开始）到 `archivedAt`（解除配对）的时间范围
- [x] 只归档配对期间的帖子，配对前和解除后发的帖子不归档
- [x] Timeline 页面过滤：`archivedAt: null` 的帖子才显示

#### 归档系统
- [x] 归档回忆页面 (`/archive`)
  - 只读模式查看历史分享
  - 支持评论浏览（不可回复）
  - 显示归档时间和分享数量
  - 支持永久删除归档

#### UI 交互
- [x] Profile 页面 (`/profile`) 配对状态卡片
  - 冷静期状态提示（黄色警告框）
  - 剩余天数显示
  - "继续配对"撤销按钮
  - "确认解除"按钮
- [x] 取消配对确认弹窗
  - 说明冷静期规则
  - 说明后果（归档、通知）
- [x] 确认解除配对弹窗
  - 警告不可逆操作
- [x] 归档回忆入口
  - 在 Profile 页面显示"查看归档回忆"按钮

#### 通知类型
- [x] `breakup_initiated` - 你的伴侣发起了取消配对，有 7 天冷静期
- [x] `breakup_cancelled` - 你的伴侣撤销了取消配对请求
- [x] `breakup_confirmed` - 你的伴侣确认了解除配对，你们的关系已结束
- [x] `breakup_auto_confirmed` - 冷静期已结束，你们的配对关系已自动解除

---

## 十、未来迭代方向（产品思路）

### 短期迭代
1. ~~**通知系统**~~ ✅ 已实现
2. ~~**评论互动**~~ ✅ 已实现
3. **表情反应** - 快速表达感受（点赞、爱心等）

### 中期迭代
1. **自定义主题** - 用户可以创建自定义标题模板
2. **纪念日系统** - 记录配对天数

### 长期迭代
1. **多人模式** - 支持小团体分享（待定）
2. **数据分析** - 用户行为分析

---

## 十一、关键指标（产品数据）

### 可以追踪的指标
| 指标 | 含义 | 怎么算 |
|------|------|--------|
| 注册用户数 | 总用户 | User 表记录数 |
| 配对成功率 | 请求→接受转化 | accepted / total |
| 日活用户 | 每天发布内容的用户 | 每天 count(distinct userId) |
| 分享率 | 配对用户中发布内容的比例 | 有 Post 的用户 / 总配对用户 |

---

## 十二、部署流程

```
1. 本地开发完成
         ↓
2. git commit 提交代码
         ↓
3. git push 推送到 GitHub
         ↓
4. Vercel 自动检测并部署
   - 安装依赖：npm install
   - 生成 Prisma 客户端：prisma generate
   - 构建 Next.js：next build
         ↓
5. 访问域名查看效果
```

---

## 十三、核心代码文件清单

### 前端页面
| 文件路径 | 功能 | 关键函数 |
|---------|------|---------|
| `src/app/page.tsx` | 登录/注册页 | handleLogin, handleRegister |
| `src/app/pair/page.tsx` | 配对中心 | handleSearch, handleSendRequest, handleAcceptRequest |
| `src/app/post/page.tsx` | 发布页面 | handleSubmit, loadPosts |
| `src/app/timeline/page.tsx` | 时间轴 | loadPosts, groupByDate, renderAvatar |

### API 接口
| 文件路径 | 功能 | HTTP 方法 |
|---------|------|---------|
| `src/app/api/auth/register/route.ts` | 用户注册 | POST |
| `src/app/api/auth/login/route.ts` | 用户登录 | POST |
| `src/app/api/auth/me/route.ts` | 获取/更新当前用户 | GET/PUT |
| `src/app/api/user/search/route.ts` | 搜索用户 | GET |
| `src/app/api/pair-request/route.ts` | 发送/获取配对请求 | POST/GET |
| `src/app/api/pair-request/accept/route.ts` | 接受配对请求 | POST |
| `src/app/api/post/route.ts` | 创建/获取/删除分享 | POST/GET/DELETE |

### 工具函数
| 文件路径 | 功能 |
|---------|------|
| `src/lib/imageUpload.ts` | 图片上传工具（压缩、ImgBB 上传、Base64 转换） |
| `src/lib/prisma.ts` | Prisma 客户端单例 |

### 新增 API（V1.4）
| 文件路径 | 功能 | HTTP 方法 |
|---------|------|---------|
| `src/app/api/comment/route.ts` | 获取/发表评论 | GET/POST |
| `src/app/api/comment/delete/route.ts` | 删除评论 | DELETE |
| `src/app/api/notification/route.ts` | 获取/标记通知 | GET/POST |

### 新增 API（V1.9）
| 文件路径 | 功能 | HTTP 方法 |
|---------|------|---------|
| `src/app/api/breakup/initiate/route.ts` | 发起取消配对 | POST |
| `src/app/api/breakup/cancel/route.ts` | 撤销取消配对 | POST |
| `src/app/api/breakup/confirm/route.ts` | 确认解除配对 | POST |
| `src/app/api/breakup/check/route.ts` | 检查冷静期到期 | GET |
| `src/app/api/archive/route.ts` | 获取归档回忆 | GET |
| `src/app/api/archive/delete/route.ts` | 删除归档 | DELETE |

### 新增前端页面（V1.9）
| 文件路径 | 功能 |
|---------|------|
| `src/app/archive/page.tsx` | 归档回忆页面（只读模式） |
| `src/app/profile/page.tsx` | 个人资料页面（含配对状态管理） |

---

## 总结

UsOnly 是一个典型的**全栈 Web 应用**，包含：
- **前端**：用户界面（React + Next.js + Tailwind CSS）
- **后端**：API 处理业务逻辑（Next.js API Routes）
- **数据库**：存储数据（PostgreSQL + Prisma ORM）
- **图片存储**：ImgBB 图床服务

### 核心理念
**通过可选标题和并排展示，创造属于两个人的私密空间**。

### 技术架构亮点
1. **Serverless 架构**：前后端一体，部署简单
2. **类型安全**：TypeScript + Prisma 提供端到端类型检查
3. **数据库事务**：配对确认时保证数据一致性
4. **图片上传**：支持头像和分享图片上传，多端适配

技术选型上采用了**现代化的 Serverless 架构**，使得个人开发者也能快速搭建和部署高质量的应用。

---

*文档版本：1.9*  
*最后更新：2026-03-30*  
*本次更新：V1.9 匹配解除与归档系统 ✨*

---