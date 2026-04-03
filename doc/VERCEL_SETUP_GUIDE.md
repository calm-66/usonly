# Vercel Build 实时通知设置指南

## 概述

本指南将帮助你设置 Vercel Build 状态的实时通知系统。使用 GitHub Actions + ngrok 方案，当 Vercel 部署成功或失败时，你的 Windows 电脑会立即收到系统级通知弹窗。

**方案特点**：
- 完全免费（使用 GitHub Actions + ngrok 免费版）
- 秒级通知（部署完成后立即推送）
- Windows 系统级通知弹窗

---

## 架构说明

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
本地 Next.js API route 处理请求
       │
       ▼
Windows 系统会通知弹窗
```


---

## 设置步骤

### 步骤 1：安装 ngrok 账号

ngrok 是一个反向隧道工具，可以将本地服务暴露到公网。

1. **访问 ngrok 官网注册账号**
   - 打开 https://ngrok.com/
   - 点击 "Sign Up" 注册免费账号
   - 免费账号每月有 40GB 的流量限制（接收 webhook 绰绰有余）

2. **获取 Authtoken**
   - 登录后访问 https://dashboard.ngrok.com/get-started/your-authtoken
   - 复制你的 Authtoken

3. **配置 Authtoken**
   - 打开命令提示符（cmd）或 PowerShell
   - 运行以下命令：
   ```bash
   npx ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```
   - 将 `YOUR_AUTHTOKEN_HERE` 替换为你刚才复制的 Authtoken

---

### 步骤 2：启动 Next.js 开发服务器

1. **双击运行批处理脚本**
   ```bash
   scripts\start-webhook.bat
   ```
   
2. **等待服务器启动**
   - 这会启动 Next.js 开发服务器
   - GitHub webhook 端点地址：`http://localhost:3000/api/webhook/github`

---

### 步骤 3：启动 ngrok 隧道

1. **双击运行批处理脚本**
   ```bash
   scripts\start-ngrok.bat
   ```
   
2. **复制 ngrok URL**
   - 在 ngrok 窗口中，你会看到类似这样的信息：
   ```
   Forwarding  https://abc123.ngrok-free.dev -> http://localhost:3000
   ```
   - 复制 `https://abc123.ngrok-free.dev` 这个 URL（你的 URL 会不同）

---

### 步骤 4：配置 GitHub Secrets

1. **访问 GitHub 仓库**
   - 打开 https://github.com/calm-66/usonly
   - 点击顶部导航栏的 "Settings" 标签

2. **进入 Secrets 设置**
   - 在左侧菜单中选择 "Secrets and variables" → "Actions"
   - 点击 "New repository secret" 按钮

3. **添加 WEBHOOK_URL Secret**
   - **Name**: `WEBHOOK_URL`
   - **Value**: `https://abc123.ngrok-free.dev`
   - 将 `abc123` 替换为你从 ngrok 窗口复制的完整 URL
   - 点击 "Add secret" 保存

---

### 步骤 5：测试通知

1. **确保服务正在运行**
   - Next.js 开发服务器正在运行
   - ngrok 隧道正在运行

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

## 快速启动命令总结

```bash
# 1. 启动 Next.js 开发服务器（新窗口）
scripts\start-webhook.bat

# 2. 启动 ngrok 隧道（新窗口）
scripts\start-ngrok.bat

# 3. 测试本地 webhook（可选）
curl -X POST http://localhost:3000/api/webhook/github ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"created\",\"deployment_status\":{\"state\":\"success\",\"environment_url\":\"https://test.vercel.app\"},\"deployment\":{\"id\":\"123\",\"sha\":\"abc123\",\"ref\":\"main\"},\"repository\":{\"name\":\"usonly\",\"full_name\":\"calm-66/usonly\"}}"
```

---

## 文件结构

```
UsOnly/
├── src/
│   ├── lib/
│   │   ├── notification.ts        # 通知发送工具
│   │   └── github-webhook.ts      # GitHub webhook 解析工具
│   └── app/
│       └── api/
│           └── webhook/
│               └── github/
│                   └── route.ts   # GitHub webhook 端点
├── scripts/
│   ├── start-webhook.bat          # Next.js 服务器启动脚本
│   └── start-ngrok.bat            # ngrok 隧道启动脚本
├── .github/
│   └── workflows/
│       └── vercel-deploy-notification.yml  # GitHub Actions workflow
├── doc/
│   └── VERCEL_SETUP_GUIDE.md      # 本指南
├── .env.example                   # 环境变量示例
└── package.json                   # 项目依赖
```

---

## 通知内容说明

### Build 成功
```
========================================
🐙 GitHub Deployment Notification
========================================
时间：2026-04-03 16:30:00
状态：success
项目：usonly
分支：main
提交：abc123d
部署 URL: https://usonly-xxx.vercel.app
========================================
```

### Build 失败
```
========================================
🐙 GitHub Deployment Notification
========================================
时间：2026-04-03 16:30:00
状态：failure
项目：usonly
分支：main
提交：abc123d
错误：Build failed with error
========================================
```

---

## 常见问题

### Q1: ngrok URL 每次重启都变化怎么办？

是的，免费版的 ngrok 每次重启都会生成新的随机 URL。

**解决方案**：每次重启 ngrok 后，更新 GitHub Secret `WEBHOOK_URL` 的值。

---

### Q2: 通知没有声音？

检查 Windows 通知设置：
1. 打开 Windows 设置 → 系统 → 通知
2. 确保 "获取来自应用和其他发送者的通知" 已开启
3. 确保 "播放声音" 选项已勾选

---

### Q3: 关闭电脑后还能收到通知吗？

不能。这个方案需要你的电脑保持开机并运行：
- Next.js 开发服务器
- ngrok 隧道

---

### Q4: GitHub Actions 没有触发？

检查 GitHub Actions 是否启用：
1. 访问 https://github.com/calm-66/usonly/actions
2. 确保 Actions 没有被禁用
3. 查看是否有 workflow 运行记录

---

### Q5: Workflow 运行失败？

查看 workflow 日志：
1. 访问 https://github.com/calm-66/usonly/actions
2. 点击最近的运行记录
3. 查看错误信息

常见错误：
- `WEBHOOK_URL` secret 未配置或配置错误
- ngrok 隧道未启动或已过期
- Next.js 服务器未运行

---

## 安全注意事项

1. **ngrok URL 是公开的**
   - 任何知道 URL 的人都可以向你的 webhook 发送请求
   - 仅在需要时启动服务

2. **避免暴露不必要的公网端点**
   - 不需要接收通知时，可以关闭 ngrok

---

## 技术支持

如遇到问题，请检查：
1. 节点版本：`node --version`（需要 v18+）
2. ngrok 是否正确配置 Authtoken
3. 端口 3000 是否被占用
4. Windows 通知设置是否开启

查看日志：
- Next.js 开发服务器窗口会显示所有请求
- ngrok 窗口会显示所有转发的请求