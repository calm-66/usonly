# Implementation Plan - 自动登录功能

## [Overview]

使用 localStorage + API 验证的混合方案实现 UsOnly 项目的自动登录功能，避免使用 cookie 带来的 SSR/CSR 不一致问题。

## [Types]

需要在数据库中添加 SessionToken 表来管理用户的登录会话。

### 新增数据模型 SessionToken

```prisma
model SessionToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([token])
  @@index([userId])
}
```

### User 模型新增字段

```prisma
model User {
  // ... 现有字段
  sessions SessionToken[] // 新增关联
}
```

## [Files]

### 新增文件

1. `src/app/api/auth/session/route.ts` - 验证 session token 的 API
2. `src/app/api/auth/logout/route.ts` - 登出 API
3. `src/lib/auth.ts` - 认证工具函数

### 修改文件

1. `prisma/schema.prisma` - 添加 SessionToken 模型
2. `src/app/page.tsx` - 修改登录逻辑，生成 session token
3. `src/app/timeline/page.tsx` - 添加自动登录验证逻辑
4. `src/app/api/auth/login/route.ts` - 登录成功后生成 session token

### 配置文件

1. `.env.example` - 添加环境变量说明

## [Functions]

### 新增函数

1. **generateSessionToken()** - `src/lib/auth.ts`
   - 签名：`function generateSessionToken(): string`
   - 功能：生成加密安全的随机 token

2. **validateSessionToken()** - `src/lib/auth.ts`
   - 签名：`async function validateSessionToken(token: string): Promise<{ valid: boolean; user?: User }>`
   - 功能：验证 token 是否有效且未过期

3. **deleteSessionToken()** - `src/lib/auth.ts`
   - 签名：`async function deleteSessionToken(token: string): Promise<void>`
   - 功能：删除 session token（用于登出）

4. **cleanupExpiredSessions()** - `src/lib/auth.ts`
   - 签名：`async function cleanupExpiredSessions(): Promise<void>`
   - 功能：清理过期的 session token

5. **POST /api/auth/session** - `src/app/api/auth/session/route.ts`
   - 功能：验证 session token 并返回用户信息

6. **POST /api/auth/logout** - `src/app/api/auth/logout/route.ts`
   - 功能：删除 session token 并清除 localStorage

### 修改函数

1. **handleSubmit** - `src/app/page.tsx`
   - 修改：登录成功后生成 session token 并存入 localStorage

2. **useEffect** - `src/app/timeline/page.tsx`
   - 修改：页面加载时先验证 session token，无效则跳转回登录页

## [Dependencies]

无需新增依赖，使用 Node.js 内置的 `crypto` 模块生成 token。

## [Testing]

### 测试场景

1. 登录成功后检查 localStorage 是否包含 sessionToken
2. 刷新页面后自动登录成功
3. token 过期后自动跳转登录页
4. 登出后 session token 被清除
5. 多设备登录场景

## [Implementation Order]

1. 修改 `prisma/schema.prisma` 添加 SessionToken 模型
2. 创建 `src/lib/auth.ts` 认证工具函数
3. 创建 `/api/auth/session` 验证 API
4. 创建 `/api/auth/logout` 登出 API
5. 修改 `/api/auth/login` 登录 API 生成 session token
6. 修改登录页面 `src/app/page.tsx` 存储 session token
7. 修改受保护页面添加自动登录验证
8. 生成数据库迁移脚本

---

## 环境变量

需要在 `.env` 中添加：

```
# Session Token 配置
SESSION_TOKEN_EXPIRY_DAYS=30  # Session 有效期（天）