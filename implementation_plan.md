# Implementation Plan

[Overview]
实现新用户注册通知功能，当生产环境（Vercel）有新用户注册时，通过 ngrok 隧道发送 Webhook 到本地开发服务器，使用独立的通知端点和通知函数，与 Vercel 部署通知系统保持分离。

[Types]
新增用户注册通知专用类型定义。

**新增类型定义**（在 `src/lib/notification.ts` 中）：
```typescript
interface UserRegisteredNotificationData {
  type: 'user_registered';        // 固定标识
  username: string;                // 新注册用户名
  email: string;                   // 新注册邮箱
  registeredAt: string;            // ISO 时间戳
  source: 'vercel';                // 来源标识
}

interface UserRegisteredNotificationConfig {
  title: string;                   // 通知标题（如："👤 UsOnly 新用户注册"）
  message: string;                 // 通知内容（用户名、邮箱、时间）
  sound?: boolean;                 // 是否播放声音
  timeout?: number;                // 超时时间（秒）
}
```

[Files]
**新增文件**：

1. `src/app/api/user-registered/route.ts`
   - 独立的 Webhook 接收端点
   - 专门处理用户注册通知
   - 调用 `sendUserRegisteredNotification` 发送 Windows 通知
   - 日志输出格式独立于部署通知

**修改的文件**：

1. `src/app/api/auth/register/route.ts`
   - 在注册成功后添加 Webhook 调用逻辑
   - 调用新端点：`/api/user-registered`
   - 使用 `process.env.WEBHOOK_URL` 环境变量获取 ngrok 地址
   - 异步发送，不影响注册响应

2. `src/lib/notification.ts`
   - 新增 `sendUserRegisteredNotification(data: UserRegisteredNotificationData): void` 函数
   - 专门处理用户注册的 Windows 通知

**配置更新**：
- `.env.example` 添加 `WEBHOOK_URL` 说明
- Vercel 环境变量配置 `WEBHOOK_URL`（ngrok 公网地址）

[Functions]
**新增函数**：

1. `sendUserRegisteredNotification(data: UserRegisteredNotificationData): void`
   - 文件：`src/lib/notification.ts`
   - 功能：发送用户注册的 Windows 本地通知
   - 通知内容格式：
     ```
     标题：👤 UsOnly 新用户注册
     内容：
       用户名：{username}
       邮箱：{email}
       时间：{registeredAt}
     ```

2. `POST /api/user-registered`
   - 文件：`src/app/api/user-registered/route.ts`
   - 功能：接收用户注册 Webhook 并发送通知
   - 日志输出格式：
     ```
     ========================================
     User Registered Notification
     ========================================
     时间：{timestamp}
     用户名：{username}
     邮箱：{email}
     ========================================
     ```

**修改函数**：

1. `POST /api/auth/register`
   - 文件：`src/app/api/auth/register/route.ts`
   - 修改：在 `prisma.user.create()` 成功后添加：
     ```typescript
     // 发送注册通知（生产环境）
     if (process.env.WEBHOOK_URL) {
       fetch(`${process.env.WEBHOOK_URL}/api/user-registered`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           type: 'user_registered',
           username,
           email,
           registeredAt: new Date().toISOString()
         })
       }).catch(console.error)
     }
     ```

[Classes]
无类修改。

[Dependencies]
无新增依赖。复用现有：
- `node-notifier`（已安装）
- `ngrok`（已安装）

[Testing]
**本地测试**：
1. 启动本地开发服务器：`npm run dev`
2. 启动 ngrok：`npx ngrok http 3000`
3. 配置 `.env.local` 中的 `WEBHOOK_URL` 为 ngrok 地址
4. 在注册页面填写新用户信息
5. 验证 Windows 通知弹窗（独立于部署通知的样式）

**生产环境测试**：
1. 本地运行开发服务器和 ngrok
2. 在 Vercel 配置 `WEBHOOK_URL` 环境变量
3. 访问生产环境注册页面
4. 验证本地收到通知

[Implementation Order]

1. **添加通知函数** (`src/lib/notification.ts`)
   - 实现 `sendUserRegisteredNotification` 函数
   - 定义 `UserRegisteredNotificationData` 接口

2. **创建独立 Webhook 端点** (`src/app/api/user-registered/route.ts`)
   - 创建新的 API 路由
   - 接收用户注册数据
   - 调用通知函数
   - 输出独立格式的日志

3. **修改注册 API** (`src/app/api/auth/register/route.ts`)
   - 在注册成功后调用 `/api/user-registered` Webhook

4. **更新配置文档** (`.env.example`)
   - 添加 `WEBHOOK_URL` 配置说明

5. **部署配置**
   - 在 Vercel 配置 `WEBHOOK_URL` 环境变量
   - 验证生产环境通知