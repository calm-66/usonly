# ZPay 支付平台配置指南

本文档详细说明如何配置 ZPay 聚合支付平台，使 UsOnly 应用能够接收打赏。

## 配置步骤

### 1. 获取商户凭证

在 ZPay 平台（https://z-pay.cn）注册并通过审核后，您会获得：
- **商户 ID (PID)** - 您的商户标识
- **商户密钥 (KEY)** - 用于签名验证的密钥

**重要**：请妥善保管商户密钥，不要泄露给他人。

### 2. Vercel 环境变量配置

在 Vercel 控制台中配置环境变量：

1. 进入项目 → Settings → Environment Variables
2. 添加以下变量：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `ZPAY_PID` | 你的商户 ID | Production, Preview |
| `ZPAY_KEY` | 你的商户密钥 | Production, Preview |

### 3. ZPay 商户后台配置

登录 ZPay 商户后台，配置回调地址：

**异步通知地址 (notify_url)**:
```
https://your-production-domain.com/api/payment/notify
```

**跳转通知地址 (return_url)**:
```
https://your-production-domain.com/api/payment/return
```

**注意**：
- 将 `your-production-domain.com` 替换为你的实际域名
- 如果使用 Vercel 默认域名，格式为：`https://your-project-name.vercel.app`
- 自定义域名：`https://your-custom-domain.com`

### 4. 回调 URL 说明

#### 异步通知 (notify_url)
- **触发时机**：用户支付成功后，ZPay 服务器自动向您的服务器发送 POST 请求
- **处理方式**：服务器验证签名、更新订单状态、创建打赏记录
- **响应要求**：必须返回纯文本 `success` 表示接收成功

#### 跳转通知 (return_url)
- **触发时机**：用户支付成功后，浏览器重定向到此 URL
- **处理方式**：重定向到感谢页面 `/payment/thank-you`
- **用户可见**：用户会看到页面跳转

### 5. 动态域名支持

本系统已实现动态域名获取，无需为不同环境配置不同的回调 URL：

- **Preview 环境**：自动使用 `https://your-project-git-branch.vercel.app`
- **Production 环境**：自动使用 `https://your-project.vercel.app`
- **本地开发**：自动使用 `http://localhost:3000`

但需要注意：
- ZPay 商户后台配置的回调地址是固定的
- 建议配置为 Production 域名
- Preview 环境的订单也会回调到 Production 地址处理

### 6. 测试支付流程

1. **部署代码到 Vercel**
   ```bash
   git push
   ```

2. **访问应用**
   - 打开 https://your-domain.com
   - 登录账户

3. **发起打赏**
   - 点击打赏按钮
   - 选择金额（如 ¥5）
   - 选择支付方式（支付宝/微信）
   - 点击"打赏"

4. **完成支付**
   - 跳转到 ZPay 支付页面
   - 使用支付宝/微信扫码支付
   - 支付完成后自动跳转回感谢页面

5. **验证结果**
   - 检查数据库 `PaymentOrder` 表，订单状态应为 `PAID`
   - 检查数据库 `Donation` 表，应新增一条打赏记录
   - 查看 Vercel 日志，确认回调处理成功

### 7. 常见问题排查

#### 问题：支付成功但订单状态未更新

**可能原因**：
- ZPAY_KEY 配置错误，导致签名验证失败
- 回调 URL 配置错误，ZPay 无法访问
- 数据库连接问题

**解决方法**：
1. 检查 Vercel 环境变量是否正确配置
2. 检查 Vercel Functions 日志，查看回调处理详情
3. 确认 ZPay 后台的回调地址正确

#### 问题：签名验证失败

**可能原因**：
- 商户密钥配置错误
- 密钥包含多余空格或字符

**解决方法**：
1. 确认 ZPay 后台的密钥
2. 在 Vercel 中重新配置 `ZPAY_KEY`，确保无多余字符

#### 问题：404 错误 - 回调接口不存在

**可能原因**：
- 代码未部署到 Vercel
- 路由路径配置错误

**解决方法**：
1. 确认代码已推送到 GitHub 并部署
2. 检查 Vercel 部署日志

## 安全建议

1. **保护商户密钥**
   - 只在 Vercel 环境变量中配置
   - 不要提交到 Git 仓库
   - 定期更换密钥

2. **验证回调签名**
   - 系统已实现签名验证
   - 确保所有回调都经过验证

3. **幂等性处理**
   - 系统已实现订单幂等性处理
   - 防止重复处理同一订单

## 技术支持

如有问题，请查看：
- ZPay 官方文档：https://z-pay.cn/help
- Vercel 日志：https://vercel.com/dashboard