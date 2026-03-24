# UsOnly 部署指南

## 部署到 Vercel（使用 GitHub）

### 步骤 1：推送到 GitHub

在 `usonly` 目录下执行以下命令：

```bash
# 初始化 Git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 创建 main 分支
git branch -M main

# 添加远程仓库（替换为你的 GitHub 用户名和仓库名）
git remote add origin https://github.com/YOUR_USERNAME/usonly.git

# 推送
git push -u origin main
```

### 步骤 2：在 Vercel 创建项目

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Add New Project"
4. 选择 "Import Git Repository"
5. 找到你的 `usonly` 仓库，点击 "Import"

### 步骤 3：配置项目

1. **Framework Preset**: Next.js（自动检测）
2. **Root Directory**: 如果代码在 `usonly` 子目录，点击 "Edit" 并选择 `usonly`
3. **Build and Output Settings**: 保持默认

### 步骤 4：添加数据库

1. 在部署页面，点击 "Storage" 部分
2. 点击 "Add Database"
3. 选择 "Vercel Postgres"
4. 点击 "Create Database"
5. 数据库会自动连接到项目

### 步骤 5：部署

1. 点击 "Deploy"
2. 等待部署完成（约 1-2 分钟）

### 步骤 6：运行数据库迁移

部署完成后，需要运行数据库迁移：

**方法 1：使用 Vercel CLI（推荐）**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 进入项目目录
cd usonly

# 拉取环境变量
vercel env pull

# 运行数据库迁移
npx prisma migrate deploy
```

**方法 2：使用 Vercel Dashboard**

1. 进入 Vercel 项目
2. 点击 "Settings" → "Storage"
3. 点击数据库名称
4. 点击 "Open in Studio"
5. 手动执行 SQL（从 migration 文件中复制）

### 步骤 7：访问应用

部署完成后，你会获得一个域名：
- `https://usonly-xxx.vercel.app`

## 环境变量

Vercel Postgres 会自动设置以下环境变量：
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

Prisma 会自动使用这些变量。

## 后续更新

每次 push 到 GitHub 后，Vercel 会自动重新部署。

## 自定义域名（可选）

1. 进入 Vercel 项目
2. 点击 "Settings" → "Domains"
3. 添加你的域名
4. 按照提示配置 DNS

## 故障排查

### 构建失败

检查构建日志，常见问题：
- 数据库连接问题：确保 Vercel Postgres 已连接
- Prisma 生成失败：确保 schema.prisma 正确

### 运行时错误

检查函数日志：
1. Vercel Dashboard → 项目 → "Functions"
2. 查看错误日志

### 数据库迁移问题

如果迁移失败，可以：
1. 在本地运行 `npx prisma migrate dev` 测试
2. 使用 Vercel Postgres Studio 手动执行 SQL