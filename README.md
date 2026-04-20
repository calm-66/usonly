# UsOnly

只属于两个人的私密空间 - 一个情侣间的每日分享应用

## 功能特点

- 💑 配对系统：邀请你的伴侣加入
- 📸 每日分享：上传图片和文字记录生活
- 📍 地图打卡：记录你们去过的地方
- 📅 时间轴：并排查看双方的分享
- 💬 评论互动：在分享下留言和回复
- 🔔 通知系统：实时收到新分享和评论通知
- 📁 归档回忆：查看已解除配对的历史记录
- 🔒 私密空间：只有你们两人能看到内容

## 技术栈

- **前端**：Next.js 15, React 19, TypeScript, Tailwind CSS
- **后端**：Next.js API Routes
- **数据库**：PostgreSQL (Neon) + Prisma ORM
- **地图**：Leaflet + react-leaflet
- **图片存储**：ImgBB 图床
- **部署**：Vercel

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置数据库连接：

```bash
cp .env.example .env
```

### 3. 设置数据库

```bash
# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 部署到 Vercel

### 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/usonly.git
git push -u origin main
```

### 2. 在 Vercel 部署

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Add New Project"
4. 导入你的 GitHub 仓库
5. 配置项目：
   - Framework Preset: Next.js
   - Root Directory: `usonly`
6. 添加数据库：
   - 点击 "Storage" → "Add Database" → "Vercel Postgres"
   - 创建新数据库（使用 Neon）
7. 点击 "Deploy"

### 3. 数据库迁移

部署完成后，在 Vercel 中运行数据库迁移：

```bash
vercel postgres migrate
```

## 项目结构

```
usonly/
├── prisma/
│   ├── schema.prisma      # 数据库模型
│   └── migrations/        # 数据库迁移文件
├── src/
│   ├── app/
│   │   ├── api/          # API 路由
│   │   ├── page.tsx      # 首页（登录/注册）
│   │   ├── timeline/     # 时间轴页面
│   │   ├── post/         # 发布页面
│   │   ├── pair/         # 配对页面
│   │   ├── profile/      # 个人资料页面
│   │   ├── map/          # 地图打卡页面
│   │   └── archive/      # 归档回忆页面
│   └── lib/
│       ├── auth.ts       # 认证工具
│       └── prisma.ts     # Prisma 客户端
├── docs/
│   └── api/              # TypeDoc 生成的 API 文档
├── .env.example          # 环境变量示例
├── typedoc.json          # TypeDoc 配置
└── package.json
```

## API 接口

### 认证
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/logout` | POST | 用户登出 |
| `/api/auth/me` | GET/PUT | 获取/更新当前用户 |
| `/api/auth/session` | POST | 验证 session token |

### 配对
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/user/search` | GET | 搜索用户 |
| `/api/pair-request` | GET/POST | 获取/发送配对请求 |
| `/api/pair-request/accept` | POST | 接受配对请求 |

### 分享
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/post` | GET/POST/DELETE | 获取/创建/删除分享 |

### 评论
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/comment` | GET/POST | 获取/发表评论 |
| `/api/comment/delete` | DELETE | 删除评论 |

### 通知
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/notification` | GET/POST | 获取/标记通知 |

### 解除配对
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/breakup/initiate` | POST | 发起取消配对 |
| `/api/breakup/cancel` | POST | 撤销取消配对 |
| `/api/breakup/confirm` | POST | 确认解除配对 |
| `/api/breakup/check` | GET | 检查冷静期到期 |
| `/api/breakup/appeal` | POST | 申诉解除配对 |
| `/api/breakup/appeal-response` | POST | 回应申诉 |

### 归档
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/archive` | GET/DELETE | 获取/删除归档 |

### 支付（ZPay 聚合支付）
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/payment/create` | POST | 创建支付订单 |
| `/api/payment/notify` | POST | ZPay 异步回调（服务器端处理） |
| `/api/payment/return` | GET | ZPay 同步跳转（跳转到感谢页面） |
| `/api/payment/status/[orderId]` | GET | 查询订单状态 |

### 其他
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/geocode/reverse` | POST | 逆地理编码 |
| `/api/feedback` | POST | 用户反馈 |
| `/api/client-ip` | GET | 获取客户端 IP |
| `/api/monitor` | GET | 健康检查 |
| `/api/monitor/stats` | GET | 获取统计信息 |
| `/api/webhook/github` | POST | GitHub 部署通知 |
| `/api/webhook/vercel` | POST | Vercel 部署通知 |

## NPM 脚本

```bash
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run lint             # 运行 ESLint
npm run db:generate      # 生成 Prisma 客户端
npm run db:migrate       # 运行数据库迁移
npm run db:push          # 推送 Prisma Schema 到数据库
npm run docs             # 生成 TypeDoc API 文档
```

## Vercel 环境变量配置

### ZPay 支付配置
在 Vercel 的 "Settings" → "Environment Variables" 中添加：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `ZPAY_PID` | ZPay 商户 ID | `12345` |
| `ZPAY_KEY` | ZPay 商户密钥 | `your-secret-key` |

**注意**：
- `ZPAY_NOTIFY_URL` 和 `ZPAY_RETURN_URL` 已改为动态获取，无需手动配置
- 系统会自动根据当前环境（Preview/Production）生成对应的回调 URL
- 需要在 ZPay 商户后台配置回调地址为生产域名：`https://your-domain.com/api/payment/notify`

## 数据库模型

### User 用户表
- `id`, `username`, `email`, `password`, `inviteCode`, `avatarUrl`
- `partnerId`, `pairedAt` - 配对关系
- `breakupInitiated`, `breakupAt` - 冷静期状态
- `archivedPartnerId`, `archivedAt` - 归档状态

### SessionToken 会话表
- `id`, `userId`, `token`, `expiresAt` - 自动登录会话

### PairRequest 配对请求表
- `id`, `senderId`, `receiverId`, `status`, `createdAt`

### Post 分享表
- `id`, `userId`, `date`, `title`, `imageUrl`, `text`
- `latitude`, `longitude`, `location` - 地图打卡
- `archivedAt`, `archivedBy` - 归档状态

### Comment 评论表
- `id`, `postId`, `userId`, `parentId`, `content`, `imageUrl`

### Notification 通知表
- `id`, `receiverId`, `senderId`, `type`, `content`, `postId`, `isRead`

## 许可证

MIT