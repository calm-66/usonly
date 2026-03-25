# UsOnly 开发与部署工作流程

## 分支策略

本项目采用 **Preview 分支** 进行预生产测试，确保代码在合并到生产环境前经过充分验证。

### 分支说明

| 分支 | 环境 | 用途 |
|------|------|------|
| `main` | Production | 正式生产环境，用户访问的版本 |
| `preview` | Pre-Production | 预生产测试环境，使用生产数据库进行验证 |

---

## 开发工作流程

### 1. 本地开发

```bash
# 切换到 preview 分支
git checkout preview

# 安装依赖（如需要）
npm install

# 启动本地开发服务器
npm run dev
```

在浏览器访问 `http://localhost:3000` 进行本地测试。

---

### 2. 推送到 Preview 环境测试

```bash
# 提交更改
git add .
git commit -m "描述你的更改"

# 推送到 preview 分支
git push origin preview
```

**Vercel 会自动：**
- 检测到 `preview` 分支的推送
- 自动部署 Preview 环境
- 生成测试 URL（如 `https://usonly-git-preview-xxx.vercel.app`）

**查看部署状态：**
1. 访问 https://vercel.com/dashboard
2. 进入 UsOnly 项目
3. 点击 "Deployments" 标签页
4. 查看最新的 Preview 部署

---

### 3. 在 Preview 环境测试

访问 Vercel 提供的 Preview URL，使用**生产数据库**进行测试：

- ✅ 测试用户注册/登录
- ✅ 测试配对功能
- ✅ 测试图片上传（头像、分享）
- ✅ 测试时间轴展示
- ✅ 移动端响应式测试

**优势：**
- 使用与生产环境相同的数据库（PostgreSQL）
- 使用相同的云服务（ImgBB）
- 可以真实模拟用户访问

---

### 4. 测试通过后合并到 main

```bash
# 切换回 main 分支
git checkout main

# 拉取最新代码
git pull origin main

# 合并 preview 分支
git merge preview

# 推送到生产环境
git push origin main
```

**Vercel 会自动：**
- 检测到 `main` 分支的推送
- 自动部署 Production 环境
- 更新生产 URL（`www.xyzxzy.online`）

---

### 5. 验证生产环境

访问 `https://www.xyzxzy.online` 确认更新已生效。

---

## 常见问题

### Q: 为什么不直接在 main 分支开发？

A: 
- 直接在 main 开发会导致每次提交都触发生产部署
- 未经测试的代码可能影响生产环境
- Preview 分支允许在合并前进行完整测试

### Q: 本地开发使用什么数据库？

A:
- 本地开发使用 SQLite（`prisma/dev.db`）
- Preview 和 Production 使用 PostgreSQL（Vercel Postgres）

### Q: 如何查看 Vercel 部署日志？

A:
1. 访问 Vercel Dashboard
2. 进入项目 → Deployments
3. 点击任意部署
4. 查看 "Build Logs" 或 "Function Logs"

### Q: Preview 部署和 Production 部署有什么区别？

A:
| 特性 | Preview | Production |
|------|---------|------------|
| 触发分支 | 非 main 分支 | main 分支 |
| URL | `usonly-git-preview-xxx.vercel.app` | `www.xyzxzy.online` |
| 数据库 | 生产数据库 | 生产数据库 |
| 自动部署 | ✅ | ✅ |
| 用途 | 测试验证 | 正式环境 |

---

## 快速命令参考

```bash
# 本地开发
git checkout preview
npm run dev

# 推送到 Preview 测试
git add . && git commit -m "xxx"
git push origin preview

# 合并到生产
git checkout main
git pull origin main
git merge preview
git push origin main
```

---

## 环境变量管理

在 Vercel 项目设置中配置环境变量（Settings → Environment Variables）：

| 变量名 | 用途 | 环境 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | All |
| `NEXT_PUBLIC_IMGBB_API_KEY` | ImgBB API Key | All |

---

*最后更新：2026-03-24*