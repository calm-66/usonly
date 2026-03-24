# UsOnly

只属于两个人的私密空间 - 一个情侣间的每日分享应用

## 功能特点

- 💑 配对系统：邀请你的伴侣加入
- 📸 每日分享：上传图片和文字记录生活
- 🎨 每日主题：系统每天推送相同主题
- 📅 时间轴：并排查看双方的分享
- 🔒 私密空间：只有你们两人能看到内容

## 技术栈

- **前端**：Next.js 14, React, TypeScript, Tailwind CSS
- **后端**：Next.js API Routes
- **数据库**：PostgreSQL (通过 Prisma ORM)
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
   - 创建新数据库
7. 点击 "Deploy"

### 3. 数据库迁移

部署完成后，在 Vercel 中：
1. 进入项目设置
2. 点击 "Storage"
3. 选择你的数据库
4. 点击 "Open in Studio" 或使用 CLI 运行迁移

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
│   │   └── pair/         # 配对页面
│   └── lib/
│       └── prisma.ts     # Prisma 客户端
├── .env.example          # 环境变量示例
├── next.config.js        # Next.js 配置
├── tailwind.config.js    # Tailwind CSS 配置
└── package.json
```

## 许可证

MIT