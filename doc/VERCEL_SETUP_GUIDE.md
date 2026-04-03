# Vercel Build 实时通知设置指南

## 概述

> **重要提示**：Vercel 的 Webhooks 功能需要 Pro 计划（$20/月）。如果你使用的是免费 Hobby 计划，请使用 [GitHub Actions 方案](#github-actions-方案)。

本指南将帮助你设置 Vercel Build 状态的实时通知系统。设置完成后，当 Vercel 部署成功或失败时，你的 Windows 电脑会立即收到系统级通知弹窗。

本指南将帮助你设置 Vercel Build 状态的实时通知系统。设置完成后，当 Vercel 部署成功或失败时，你的 Windows 电脑会立即收到系统级通知弹窗。

---

## 架构说明

### 方案 A：Vercel Webhook（需要 Pro 计划）

```
Vercel 部署完成
       │
       ▼ (秒级触发)
Vercel Webhook → POST 到 ngrok 公网 URL
       │
       ▼
ngrok 转发到 http://localhost:3001
       │
       ▼
本地 Node.js 服务器处理请求
       │
       ▼
Windows 系统通知弹窗
```

### 方案 B：GitHub Actions（免费）

```
Vercel 部署完成
       │
       ▼ (自动报告)
GitHub 收到 deployment_status 事件
       │
       ▼
GitHub Actions 触发 workflow
       │
       ▼
发送 POST 请求到 ngrok 公网 URL
       │
       ▼
本地 Node.js 服务器处理请求
       │
       ▼
Windows 系统通知弹窗
```

---

## 方案选择

| 特性 | Vercel Webhook | GitHub Actions |
|------|---------------|----------------|
| 费用 | $20/月（Pro 计划） | 免费 |
| 实时性 | 秒级 | 秒级 |
| 配置难度 | 简单 | 中等 |
| 需要电脑常开 | 是 | 是 |

---

## 方案 A：Vercel Webhook（需要 Pro 计划）

### 步骤 1：安装 ngrok 账号

ngrok 是一个反向隧道工具，可以将本地服务暴露到公网。Vercel 需要能够访问你的 webhook 端点，所以需要使用 ngrok。

1. **访问 ngrok 官网注册账号**
   - 打开 https://ngrok.com/
   - 点击 "Sign Up" 注册免费账号
   - 免费账号每月有 40GB 的流量限制（接收 webhook 绰绰有余）

2. **获取 Authtoken**
   - 登录后访问 https://dashboard.ngrok.com/get-started/your-authtoken
   - 复制你的 Authtoken（一串类似 `2AbCdEfGhIjKlMnOpQrStUvWxYz1234567890` 的字符串）

3. **配置 Authtoken**
   - 打开命令提示符（cmd）或 PowerShell
   - 运行以下命令：
   ```bash
   npx ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```
   - 将 `YOUR_AUTHTOKEN_HERE` 替换为你刚才复制的 Authtoken

---

### 步骤 2：启动本地 Webhook 服务器

**方式 A：使用批处理脚本（推荐）**

1. 双击运行 `scripts\start-webhook.bat`
   - 这会打开一个新窗口运行 webhook 服务器
   - 窗口标题为 "Vercel Webhook Server"

2. 等待服务器启动，看到以下日志表示成功：
   ```
   🚀 Vercel Webhook 监听服务器已启动
   本地地址：http://localhost:3001
   ```

**方式 B：使用 npm 命令**

```bash
npm run webhook
```

---

### 步骤 3：启动 ngrok 隧道

**方式 A：使用批处理脚本（推荐）**

1. 双击运行 `scripts\start-ngrok.bat`
   - 这会打开一个新窗口运行 ngrok
   - 窗口标题为 "ngrok tunnel"

2. 在 ngrok 窗口中，你会看到类似这样的信息：
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:3001
   ```
   复制 `https://abc123.ngrok.io` 这个 URL（你的 URL 会不同）

**方式 B：使用 npm 命令**

```bash
npm run webhook:ngrok
```

**方式 C：直接使用 npx**

```bash
npx ngrok http 3001
```

---

### 步骤 4：在 Vercel 配置 Webhook

> 注意：此功能需要 Vercel Pro 计划。如果你使用的是免费计划，请使用上面的 GitHub Actions 方案。

1. **访问 Vercel 控制台**
   - 打开 https://vercel.com/dashboard
   - 登录你的账号

2. **选择项目**
   - 找到你的 UsOnly 项目
   - 点击进入项目页面

3. **进入设置**
   - 点击顶部导航栏的 "Settings" 标签
   - 在左侧菜单中选择 "Git"

4. **添加 Webhook**
   - 向下滚动找到 "Webhooks" 部分
   - 点击 "Add Webhook" 按钮

5. **配置 Webhook**
   - **Events（事件）**: 选择以下事件
     - ✅ `Deployment – Succeeded` (部署成功)
     - ✅ `Deployment – Failed` (部署失败)
     - 可选：`Deployment – Created` (部署开始)
   
   - **Endpoint URL（端点 URL）**: 输入 ngrok URL
     ```
     https://YOUR_NGROK_URL.ngrok.io/api/webhook/vercel
     ```
     将 `YOUR_NGROK_URL` 替换为你从 ngrok 窗口复制的 URL

   - **Name（名称）**: 输入一个描述性名称，如 "Local Notification Server"

6. **保存配置**
   - 点击 "Save" 按钮保存

---

### 步骤 5：测试通知

1. **确保服务正在运行**
   - Webhook 服务器窗口正在运行
   - ngrok 隧道窗口正在运行

2. **触发一次部署**
   - 在本地运行 `git push` 推送到 GitHub
   - 或手动在 Vercel 触发重新部署

3. **等待通知**
   - 当 Vercel 部署完成时（通常 1-3 分钟）
   - 你的 Windows 系统会弹出通知
   - 成功：显示 "✅ UsOnly Build 成功" + 预览链接
   - 失败：显示 "❌ UsOnly Build 失败" + 错误信息

---

## 常见问题

### Q1: ngrok URL 每次重启都变化怎么办？

是的，免费版的 ngrok 每次重启都会生成新的随机 URL。你有两个选择：

**选项 A：每次重启后更新 Vercel 配置**
- 虽然麻烦，但完全免费
- 适合偶尔使用的场景

**选项 B：升级到 ngrok 付费版**
- 付费版提供固定域名
- 价格：约 $8/月

**选项 C：使用其他隧道服务**
- Cloudflare Tunnel（免费，有固定域名）
- localtunnel（开源，但稳定性一般）

### Q2: 通知没有声音？

检查 Windows 通知设置：
1. 打开 Windows 设置 → 系统 → 通知
2. 确保 "获取来自应用和其他发送者的通知" 已开启
3. 向下滚动找到 "Node.js"，确保通知已启用
4. 确保 "播放声音" 选项已勾选

### Q3: 关闭电脑后还能收到通知吗？

不能。这个方案需要你的电脑保持开机并运行 webhook 服务器和 ngrok 隧道。

如果你需要 24 小时接收通知，可以考虑：
- 使用云服务器运行 webhook 服务器
- 或使用第三方通知服务（如 PushPlus 微信推送）

### Q4: Webhook 签名验证失败？

如果你配置了 `VERCEL_WEBHOOK_SECRET`，请确保：
1. 在 `.env` 文件中设置正确的密钥
2. Vercel 端也配置了相同的密钥（如果支持）

如果不配置密钥，webhook 会跳过签名验证（仅建议本地开发使用）。

---

## 快速启动命令总结

```bash
# 1. 启动 Webhook 服务器（新窗口）
scripts\start-webhook.bat
# 或
npm run webhook

# 2. 启动 ngrok 隧道（新窗口）
scripts\start-ngrok.bat
# 或
npm run webhook:ngrok

# 3. 测试本地 webhook（可选）
curl -X POST http://localhost:3001/api/webhook/vercel ^
  -H "Content-Type: application/json" ^
  -d "{\"eventType\":\"deployment.succeeded\",\"deployment\":{\"id\":\"test123\",\"url\":\"https://test.vercel.app\"},\"project\":{\"name\":\"UsOnly\"}}"
```

---

## 文件结构

```
UsOnly/
├── src/
│   ├── lib/
│   │   ├── notification.ts        # 通知发送工具
│   │   ├── vercel-webhook.ts      # Webhook 解析工具
│   │   └── webhook-server.ts      # 独立 webhook 服务器
│   └── app/
│       └── api/
│           └── webhook/
│               └── vercel/
│                   └── route.ts   # Next.js webhook 端点（备用）
├── scripts/
│   ├── start-webhook.bat          # Webhook 服务器启动脚本
│   └── start-ngrok.bat            # ngrok 隧道启动脚本
├── doc/
│   └── VERCEL_SETUP_GUIDE.md      # 本指南
├── .env.example                   # 环境变量示例（已更新）
└── package.json                   # 已添加 npm 脚本
```

---

## 通知内容说明

### Build 成功
```
标题：✅ UsOnly Build 成功
内容：
  项目：UsOnly
  预览：https://xxx.vercel.app
```

### Build 失败
```
标题：❌ UsOnly Build 失败
内容：
  项目：UsOnly
  错误：[详细错误信息，最多 500 字符]
```

### Build 开始（可选）
```
标题：🔄 UsOnly Build 开始
内容：
  项目：UsOnly
  分支：main
```

---

## 安全注意事项

1. **ngrok URL 是公开的**
   - 任何知道 URL 的人都可以向你的 webhook 发送请求
   - 建议配置 `VERCEL_WEBHOOK_SECRET` 进行签名验证

2. **仅在需要时启动服务**
   - 不需要接收通知时，可以关闭 webhook 服务器和 ngrok
   - 避免暴露不必要的公网端点

3. **生产环境建议**
   - 如果需要在生产环境使用，建议部署到云服务器
   - 使用 HTTPS 和适当的认证机制

---

## 技术支持

如遇到问题，请检查：
1. 节点版本：`node --version`（需要 v18+）
2. ngrok 是否正确配置 Authtoken
3. 端口 3001 是否被占用
4. Windows 通知设置是否开启

查看日志：
- Webhook 服务器窗口会显示所有接收到的请求
- ngrok 窗口会显示所有转发的请求

---

## GitHub Actions 方案

### 步骤 1：启动本地 Webhook 服务器

1. 双击运行 `scripts\start-webhook.bat`
   - 这会打开一个新窗口运行 webhook 服务器
   - 窗口标题为 "Vercel Webhook Server"

2. 等待服务器启动，看到以下日志表示成功：
   ```
   🚀 Vercel Webhook 监听服务器已启动
   本地地址：http://localhost:3001
   GitHub Webhook 端点：http://localhost:3001/api/webhook/github
   ```

---

### 步骤 2：启动 ngrok 隧道

1. 双击运行 `scripts\start-ngrok.bat`
   - 这会打开一个新窗口运行 ngrok
   - 窗口标题为 "ngrok tunnel"

2. 在 ngrok 窗口中，你会看到类似这样的信息：
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:3001
   ```
   复制 `https://abc123.ngrok.io` 这个 URL（你的 URL 会不同）

---

### 步骤 3：配置 GitHub Secrets

1. **访问 GitHub 仓库**
   - 打开 https://github.com/calm-66/usonly
   - 点击顶部导航栏的 "Settings" 标签

2. **进入 Secrets 设置**
   - 在左侧菜单中选择 "Secrets and variables" → "Actions"
   - 点击 "New repository secret" 按钮

3. **添加 WEBHOOK_URL Secret**
   - **Name**: `WEBHOOK_URL`
   - **Value**: `https://abc123.ngrok.io`
   - 将 `abc123` 替换为你从 ngrok 窗口复制的 URL
   - 点击 "Add secret" 保存

4. **（可选）添加 WEBHOOK_SECRET Secret**
   - **Name**: `WEBHOOK_SECRET`
   - **Value**: 任意随机字符串（用于签名验证）
   - 点击 "Add secret" 保存

---

### 步骤 4：验证 GitHub Actions Workflow

项目已经包含了 `.github/workflows/vercel-deploy-notification.yml` 文件，它会：

- 监听 `deployment_status` 事件
- 当 Vercel 部署完成时自动触发
- 发送 webhook 到你的本地服务器

---

### 步骤 5：测试通知

1. **确保服务正在运行**
   - Webhook 服务器窗口正在运行
   - ngrok 隧道窗口正在运行

2. **触发一次部署**
   - 在本地运行 `git push` 推送到 GitHub
   - 或手动在 Vercel 触发重新部署

3. **等待通知**
   - 当 Vercel 部署完成时（通常 1-3 分钟）
   - GitHub Actions 会自动触发
   - 你的 Windows 系统会弹出通知
   - 成功：显示 "🐙 UsOnly Build 成功" + 预览链接
   - 失败：显示 "🐙 UsOnly Build 失败" + 错误信息

---

### GitHub Actions 常见问题

#### Q1: GitHub Actions 没有触发？

检查 GitHub Actions 是否启用：
1. 访问 https://github.com/calm-66/usonly/actions
2. 确保 Actions 没有被禁用
3. 查看是否有 workflow 运行记录

#### Q2: Workflow 运行失败？

查看 workflow 日志：
1. 访问 https://github.com/calm-66/usonly/actions
2. 点击最近的运行记录
3. 查看错误信息

常见错误：
- `WEBHOOK_URL` secret 未配置或配置错误
- ngrok 隧道未启动或已过期

#### Q3: 通知显示但内容不对？

检查 webhook 服务器日志：
- 服务器窗口会显示接收到的 payload
- 确认 `deployment_status` 事件是否正确传递

---

## 方案对比总结

| 特性 | Vercel Webhook | GitHub Actions |
|------|---------------|----------------|
| 费用 | $20/月（Pro 计划） | 免费 |
| 实时性 | 秒级 | 秒级 |
| 配置难度 | 简单 | 中等 |
| 通知图标 | 🔔 |  |
| 需要电脑常开 | 是 | 是 |

**推荐**：
- 如果你有 Vercel Pro 计划，使用 Vercel Webhook 更简单
- 如果你使用免费计划，GitHub Actions 是最佳选择
