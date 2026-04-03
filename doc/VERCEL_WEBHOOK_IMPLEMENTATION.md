# Vercel Build 实时通知实现计划

## [Overview]
实现一个基于本地通知服务的 Vercel Build 状态实时通知系统，通过 ngrok 暴露本地 webhook 端点，在 Windows 上显示系统级通知弹窗。

## [Types]
定义 Vercel Webhook  payload 类型和通知配置类型。

### Vercel Webhook Payload 类型
```typescript
interface VercelWebhookPayload {
  eventType: string;           // 'deployment.created' | 'deployment.succeeded' | 'deployment.failed'
  deployment: {
    id: string;                // 部署 ID
    url: string;               // 部署预览 URL
    meta: {
      commitRef?: string;      // Git 分支/提交引用
    };
    errorCode?: string;        // 错误代码（失败时）
    errorMessage?: string;     // 错误信息（失败时）
  };
  project: {
    name: string;              // 项目名称
  };
}
```

### 通知配置类型
```typescript
interface NotificationConfig {
  title: string;               // 通知标题
  message: string;             // 通知内容
  icon?: string;               // 图标路径（可选）
  sound?: boolean;             // 是否播放声音
  timeout?: number;            // 超时时间（秒）
}
```

## [Files]
### 新增文件
1. **`src/app/api/webhook/vercel/route.ts`** - Vercel webhook 接收端点
   - 处理 Vercel 发送的 POST 请求
   - 解析 build 状态
   - 触发 Windows 系统通知

2. **`src/lib/vercel-webhook.ts`** - Webhook 处理工具
   - 验证 webhook 签名（可选）
   - 解析 payload
   - 生成通知内容

3. **`src/lib/notification.ts`** - 通知发送工具
   - 使用 node-notifier 发送 Windows 通知
   - 支持成功/失败不同样式

4. **`scripts/start-webhook-server.bat`** - 启动 webhook 服务器脚本
   - 自动启动 ngrok
   - 启动本地服务器
   - 显示 ngrok URL

5. **`vercel-webhook-config.json`** - ngrok 配置文件
   - 配置 ngrok 隧道

6. **`doc/VERCEL_SETUP_GUIDE.md`** - Vercel 配置指南
   - 如何在 Vercel 控制台配置 webhook
   - ngrok 注册和使用说明

### 修改文件
1. **`package.json`** - 添加新依赖和脚本
   - 添加 `node-notifier` 依赖
   - 添加 `ngrok` 依赖（开发依赖）
   - 添加启动脚本

2. **`.env.example`** - 添加新环境变量
   - `VERCEL_WEBHOOK_SECRET` - webhook 验证密钥

## [Functions]
### 新增函数

1. **`handleVercelWebhook(request: NextRequest)`** - `src/app/api/webhook/vercel/route.ts`
   - 接收 Vercel webhook POST 请求
   - 验证请求来源
   - 调用通知发送函数

2. **`sendBuildNotification(status: 'success' | 'failure', data: VercelWebhookPayload)`** - `src/lib/notification.ts`
   - 根据 build 状态生成不同通知
   - 成功：简短标题 + 预览链接
   - 失败：详细错误信息

3. **`parseVercelWebhook(payload: VercelWebhookPayload)`** - `src/lib/vercel-webhook.ts`
   - 解析 webhook payload
   - 提取关键信息（状态、URL、错误信息）
   - 返回格式化数据

## [Classes]
无新增类，使用函数式实现。

## [Dependencies]
### 新增依赖
1. **`node-notifier`** (v10+)
   - 用于发送 Windows 系统通知
   - 支持原生通知弹窗

2. **`ngrok`** (v5+)
   - 开发依赖
   - 用于暴露本地服务到公网

### 安装命令
```bash
npm install node-notifier
npm install -D ngrok
```

## [Testing]
### 测试步骤
1. 启动本地 webhook 服务器
2. 获取 ngrok 公网 URL
3. 在 Vercel 配置 webhook
4. 触发手动部署
5. 验证通知弹窗显示

### 本地测试
```bash
# 使用 curl 模拟 Vercel webhook
curl -X POST http://localhost:3001/api/webhook/vercel \
  -H "Content-Type: application/json" \
  -d '{"eventType":"deployment.succeeded","deployment":{"id":"test123","url":"https://test.vercel.app"},"project":{"name":"UsOnly"}}'
```

## [Implementation Order]
1. ✅ 安装依赖包（node-notifier, ngrok, tsx）
2. ✅ 创建通知发送工具 `src/lib/notification.ts`
3. ✅ 创建 webhook 处理工具 `src/lib/vercel-webhook.ts`
4. ✅ 创建 webhook API Route `src/app/api/webhook/vercel/route.ts`
5. ✅ 创建独立 webhook 服务器 `src/lib/webhook-server.ts`
6. ✅ 创建启动脚本 `scripts/start-webhook.bat` 和 `scripts/start-ngrok.bat`
7. ✅ 更新 `.env.example` 添加 webhook secret
8. ✅ 创建 Vercel 配置指南 `doc/VERCEL_SETUP_GUIDE.md`
9. ✅ 更新 `package.json` 添加依赖和脚本
10. ✅ 测试本地通知功能 - 测试通过，服务器正常运行并接收 webhook

## [Usage]
### 启动步骤

1. **启动 Webhook 服务器**
   ```bash
   scripts\start-webhook.bat
   # 或
   npm run webhook
   ```

2. **启动 ngrok 隧道**
   ```bash
   scripts\start-ngrok.bat
   # 或
   npm run webhook:ngrok
   ```

3. **复制 ngrok URL**
   - 在 ngrok 窗口中找到类似 `https://xxx.ngrok.io` 的 URL

4. **在 Vercel 配置 Webhook**
   - 访问 Vercel Dashboard → Settings → Git → Webhooks
   - 添加 Webhook，URL: `https://xxx.ngrok.io/api/webhook/vercel`
   - 选择事件：Deployment – Succeeded, Deployment – Failed

5. **测试通知**
   ```bash
   powershell -ExecutionPolicy Bypass -File scripts\test-webhook.ps1
   ```
