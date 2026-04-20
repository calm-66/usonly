# Implementation Plan

## Overview
为 UsOnly 项目实现 ZPay 第三方支付集成以支持"给作者买一杯咖啡"打赏功能，并在 Monitor 项目中实现付费情况监控。

## 背景与范围

本项目旨在验证 UsOnly MVP 的用户付费意愿，通过集成 ZPay 第三方支付平台实现打赏功能。考虑到用户主要在手机端浏览器使用，采用 ZPay 的页面跳转支付方式（H5 支付）。

**Scope（范围）**:
- UsOnly 项目：打赏 UI、支付 API、回调处理、订单管理
- Monitor 项目：支付数据接收、统计展示
- 数据库：新增支付相关表结构
- 环境配置：ZPay 密钥管理

**Out of Scope（不在范围内）**:
- 订阅制功能（后续迭代）
- 复杂的打赏排行榜系统
- 多支付方式管理（首期仅支持支付宝/微信）

**技术约束**:
- 遵循现有项目架构（Next.js + Prisma + PostgreSQL）
- 使用环境变量管理敏感数据
- 代码需考虑后续订阅制功能的扩展性

## Types

定义支付相关的 TypeScript 类型和数据库模型。

### 数据库模型 (Prisma Schema)

#### 1. PaymentOrder (支付订单表)
```prisma
model PaymentOrder {
  id             String   @id @default(cuid())
  outTradeNo     String   @unique  // ZPay 订单号，格式：YYYYMMDDHHmmss + 随机 3 位
  userId         String?  // 用户 ID（如果已登录）
  amount         Decimal  @db.Decimal(10, 2)  // 订单金额
  currency       String   @default("CNY")
  productName    String   // 商品名称（打赏：Buy Me a Coffee）
  paymentType    String   // alipay / wxpay
  status         PaymentStatus @default(PENDING)
  param          String?  // 附加内容（通过 notify_url 原样返回）
  tradeNo        String?  // ZPay 交易号
  paidAt         DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  user           User?    @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}
```

#### 2. Donation (打赏记录表)
```prisma
model Donation {
  id             String   @id @default(cuid())
  orderId        String   @unique
  amount         Decimal  @db.Decimal(10, 2)
  message        String?  // 打赏留言（可选）
  isAnonymous    Boolean  @default(false)  // 是否匿名
  createdAt      DateTime @default(now())
  
  paymentOrder   PaymentOrder @relation(fields: [orderId], references: [id])
  
  @@index([createdAt])
  @@index([amount])
}
```

#### 3. PaymentEvent (支付事件表 - Monitor 项目)
```prisma
model PaymentEvent {
  id             String   @id @default(cuid())
  source         String   // 数据来源：usonly
  eventType      String   // payment.completed / donation.created
  orderId        String
  amount         Decimal  @db.Decimal(10, 2)
  currency       String   @default("CNY")
  metadata       Json?    // 额外元数据
  receivedAt     DateTime @default(now())
  
  @@index([eventType])
  @@index([receivedAt])
}
```

#### 4. PaymentStatus (枚举)
```prisma
enum PaymentStatus {
  PENDING      // 待支付
  PAID         // 已支付
  FAILED       // 支付失败
  REFUNDED     // 已退款
}
```

### TypeScript 类型定义

#### 1. ZPay 请求参数类型
```typescript
// src/types/payment.ts

export interface ZPayRequestParams {
  pid: string;        // 商户 ID
  money: string;      // 金额（字符串，最多 2 位小数）
  name: string;       // 商品名称
  notify_url: string; // 异步通知 URL
  out_trade_no: string; // 商户订单号
  return_url: string; // 跳转通知 URL
  sitename: string;   // 网站名称
  type: 'alipay' | 'wxpay' | 'qqpay' | 'tenpay';
  param?: string;     // 附加内容（可选）
  cid?: string;       // 支付渠道 ID（可选）
}
```

#### 2. ZPay 回调参数类型
```typescript
export interface ZPayNotifyParams {
  out_trade_no: string;  // 商户订单号
  trade_no: string;      // ZPay 交易号
  type: string;          // 支付方式
  money: string;         // 订单金额
  pid: string;           // 商户 ID
  param?: string;        // 附加内容
  sign: string;          // 签名
}
```

#### 3. 创建支付订单请求体
```typescript
export interface CreatePaymentRequest {
  amount: number;       // 打赏金额
  paymentType: 'alipay' | 'wxpay';
  message?: string;     // 打赏留言
  isAnonymous?: boolean; // 是否匿名
}
```

#### 4. 支付订单响应
```typescript
export interface CreatePaymentResponse {
  success: boolean;
  data?: {
    orderId: string;
    outTradeNo: string;
    payUrl: string;     // 跳转支付的 URL
  };
  error?: string;
}
```

#### 5. 支付事件上报类型 (Monitor)
```typescript
export interface PaymentEventPayload {
  source: 'usonly';
  eventType: 'payment.completed' | 'donation.created';
  orderId: string;
  amount: number;
  currency: string;
  metadata?: {
    paymentType?: string;
    productName?: string;
    userId?: string;
    message?: string;
  };
  timestamp: string;
}
```

## Files

### 新增文件 (UsOnly 项目)

#### 1. `src/lib/payment/zpay.ts`
ZPay SDK 封装，包含签名生成、参数验证等功能。

**内容结构**:
- `generateSign(params: object, key: string): string` - 生成 MD5 签名
- `verifySign(params: object, key: string): boolean` - 验证回调签名
- `createPayUrl(params: ZPayRequestParams, key: string): string` - 生成支付 URL
- `generateOutTradeNo(): string` - 生成订单号（YYYYMMDDHHmmss + 随机 3 位）

#### 2. `src/lib/payment/index.ts`
支付服务统一出口，封装业务逻辑。

**内容结构**:
- `createPaymentOrder(data: CreatePaymentRequest): Promise<PaymentOrder>` - 创建订单
- `handlePaymentNotify(params: ZPayNotifyParams): Promise<boolean>` - 处理回调
- `getPaymentStatus(orderId: string): Promise<PaymentStatus>` - 查询状态

#### 3. `src/app/api/payment/create/route.ts`
创建支付订单 API 端点（POST）。

**请求体**: `CreatePaymentRequest`
**响应**: `CreatePaymentResponse`

#### 4. `src/app/api/payment/notify/route.ts`
ZPay 异步回调处理端点（POST）。

**功能**:
- 验证签名
- 更新订单状态
- 创建打赏记录
- 返回 `success` 给 ZPay
- 推送事件到 Monitor

#### 5. `src/app/api/payment/return/route.ts`
ZPay 同步跳转处理端点（GET）。

**功能**:
- 显示支付结果页面
- 展示感谢信息

#### 6. `src/app/api/payment/status/[orderId]/route.ts`
查询支付订单状态端点（GET）。

#### 7. `src/components/payment/DonationModal.tsx`
打赏弹窗组件。

**功能**:
- 金额输入框（placeholder: ¥5）
- 支付方式选择（支付宝/微信）
- 留言输入框（可选）
- 匿名选项

#### 8. `src/components/payment/ThankYouModal.tsx`
感谢弹窗组件。

**功能**:
- 展示感谢信息
- 关闭按钮

#### 9. `src/app/donate/page.tsx`
打赏页面（可选，也可只在弹窗中完成）。

### 修改文件 (UsOnly 项目)

#### 1. `prisma/schema.prisma`
添加 `PaymentOrder`, `Donation` 模型和 `PaymentStatus` 枚举。

#### 2. `.env.local` / `.env.example`
添加环境变量：
```env
# ZPay Payment
ZPAY_PID=your_pid_here
ZPAY_KEY=your_key_here
ZPAY_NOTIFY_URL=https://yourdomain.com/api/payment/notify
ZPAY_RETURN_URL=https://yourdomain.com/api/payment/return

# Monitor API (for event push)
MONITOR_API_URL=https://your-monitor-domain.com
MONITOR_API_KEY=your_monitor_api_key
```

#### 3. `package.json`
添加依赖：
```json
{
  "dependencies": {
    "utility": "^1.x.x"
  }
}
```

#### 4. `src/app/layout.tsx` 或首页
添加打赏入口按钮（如页面右下角悬浮按钮或导航栏）。

### 新增文件 (Monitor 项目)

#### 1. `src/app/api/payment/event/route.ts`
接收支付事件上报端点（POST）。

**功能**:
- 验证 API Key
- 存储事件到 `PaymentEvent` 表
- 返回成功响应

#### 2. `src/app/api/payment/stats/route.ts`
支付统计端点（GET）。

**返回数据**:
- 总收入金额
- 订单总数
- 今日/本周/本月收入
- 平均客单价

#### 3. `src/app/api/payment/events/route.ts`
支付事件列表端点（GET）。

#### 4. `prisma/schema.prisma` (Monitor)
添加 `PaymentEvent` 模型。

### 修改文件 (Monitor 项目)

#### 1. `.env.local` / `.env.example`
添加环境变量：
```env
# UsOnly API (for pull mode)
USONLY_API_URL=https://usonly-domain.com
USONLY_API_KEY=your_usonly_api_key
```

#### 2. Dashboard 页面
添加支付统计卡片和图表。

### 配置文件

#### 1. `prisma/migrations/` (UsOnly)
生成并应用迁移脚本。

#### 2. `prisma/migrations/` (Monitor)
生成并应用迁移脚本。

## Functions

### UsOnly 项目函数

#### 1. `generateSign` (新增)
- **文件**: `src/lib/payment/zpay.ts`
- **签名**: `(params: object, key: string) => string`
- **功能**: 根据 ZPay 规则生成 MD5 签名
- **实现要点**:
  - 排除空值、sign、sign_type
  - 按 key 字母排序
  - 拼接成 `key=value&key=value` 格式
  - 末尾添加 key 后进行 MD5

#### 2. `verifySign` (新增)
- **文件**: `src/lib/payment/zpay.ts`
- **签名**: `(params: object, key: string) => boolean`
- **功能**: 验证 ZPay 回调签名

#### 3. `createPayUrl` (新增)
- **文件**: `src/lib/payment/zpay.ts`
- **签名**: `(params: ZPayRequestParams, key: string) => string`
- **功能**: 生成支付跳转 URL

#### 4. `generateOutTradeNo` (新增)
- **文件**: `src/lib/payment/zpay.ts`
- **签名**: `() => string`
- **功能**: 生成唯一订单号（YYYYMMDDHHmmss + 3 位随机数）

#### 5. `createPaymentOrder` (新增)
- **文件**: `src/lib/payment/index.ts`
- **签名**: `(data: CreatePaymentRequest) => Promise<PaymentOrder>`
- **功能**: 创建支付订单记录

#### 6. `handlePaymentNotify` (新增)
- **文件**: `src/lib/payment/index.ts`
- **签名**: `(params: ZPayNotifyParams) => Promise<boolean>`
- **功能**: 
  - 验证签名
  - 更新订单状态为 PAID
  - 创建 Donation 记录
  - 推送事件到 Monitor
  - 返回 true 表示成功

#### 7. `pushPaymentEventToMonitor` (新增)
- **文件**: `src/lib/payment/index.ts`
- **签名**: `(event: PaymentEventPayload) => Promise<void>`
- **功能**: 主动推送支付事件到 Monitor

### Monitor 项目函数

#### 1. `verifyApiKey` (新增)
- **文件**: `src/lib/auth.ts` 或中间件
- **签名**: `(request: Request) => boolean`
- **功能**: 验证 API Key

#### 2. `fetchUsOnlyPaymentStats` (新增)
- **文件**: `src/lib/payment.ts`
- **签名**: `() => Promise<PaymentStats>`
- **功能**: 定时从 UsOnly 拉取支付统计（方案 B）

## Classes

本项目主要使用函数式编程，不涉及复杂的类设计。

### 可选：PaymentService 类

如果后续需要扩展，可考虑创建服务类：

```typescript
// src/lib/payment/service.ts
export class PaymentService {
  private pid: string;
  private key: string;
  private notifyUrl: string;
  private returnUrl: string;

  constructor(config: PaymentConfig);
  
  createOrder(data: CreatePaymentRequest): Promise<PaymentOrder>;
  handleNotify(params: ZPayNotifyParams): Promise<boolean>;
  getStatus(orderId: string): Promise<PaymentStatus>;
  refund(orderId: string, amount?: number): Promise<boolean>; // 未来扩展
}
```

## Dependencies

### UsOnly 项目

#### 新增依赖
```json
{
  "dependencies": {
    "utility": "^1.18.0"
  }
}
```

**说明**: `utility` 库提供 MD5 加密功能，与用户提供的 demo 保持一致。

#### 安装命令
```bash
npm install utility
```

### Monitor 项目

无需新增依赖（使用现有 `crypto` 模块即可）。

## Testing

### 单元测试

#### 1. ZPay 签名测试
- **文件**: `src/lib/payment/__tests__/zpay.test.ts`
- **测试用例**:
  - `generateSign` 生成正确的 MD5 签名
  - `verifySign` 验证签名正确/错误
  - `generateOutTradeNo` 生成唯一订单号
  - `createPayUrl` 生成正确的支付 URL

#### 2. 支付服务测试
- **文件**: `src/lib/payment/__tests__/index.test.ts`
- **测试用例**:
  - `createPaymentOrder` 创建订单成功
  - `handlePaymentNotify` 处理回调成功
  - 签名验证失败时抛出错误

### 集成测试

#### 1. API 端点测试
- **文件**: `src/app/api/payment/__tests__/route.test.ts`
- **测试用例**:
  - POST `/api/payment/create` 创建订单
  - POST `/api/payment/notify` 处理回调
  - GET `/api/payment/status/[orderId]` 查询状态

#### 2. E2E 测试（可选）
- 模拟完整支付流程
- 使用 ZPay 测试环境（如有）

### 手动测试清单

1. **创建订单**
   - [ ] 输入金额 ¥5，选择支付宝，点击支付
   - [ ] 正确跳转到 ZPay 收银台
   - [ ] 订单号格式正确

2. **支付回调**
   - [ ] 支付成功后，ZPay 正确调用 notify_url
   - [ ] 数据库订单状态更新为 PAID
   - [ ] Donation 记录创建成功
   - [ ] Monitor 收到事件推送

3. **同步跳转**
   - [ ] 支付成功后跳转到 return_url
   - [ ] 显示感谢信息

4. **异常处理**
   - [ ] 签名验证失败时拒绝请求
   - [ ] 重复回调时正确处理（幂等性）
   - [ ] 网络异常时错误处理

### Monitor 测试

1. **事件接收**
   - [ ] POST `/api/payment/event` 接收事件
   - [ ] API Key 验证通过
   - [ ] 事件存储到数据库

2. **统计展示**
   - [ ] Dashboard 显示正确统计数据
   - [ ] 图表渲染正常

## Implementation Order

按以下顺序实施以最小化冲突并确保成功集成：

### 第一阶段：数据库准备 (UsOnly)
1. 修改 `prisma/schema.prisma`，添加 `PaymentOrder` 和 `Donation` 模型
2. 生成并应用迁移：`npx prisma migrate dev --name add_payment`
3. 更新 `.env.example` 添加 ZPay 环境变量

### 第二阶段：ZPay SDK 封装 (UsOnly)
4. 创建 `src/lib/payment/zpay.ts`，实现签名生成和验证
5. 创建 `src/lib/payment/index.ts`，实现支付服务
6. 编写单元测试验证签名逻辑

### 第三阶段：API 端点 (UsOnly)
7. 创建 `POST /api/payment/create` 端点
8. 创建 `POST /api/payment/notify` 端点
9. 创建 `GET /api/payment/return` 端点
10. 创建 `GET /api/payment/status/[orderId]` 端点

### 第四阶段：前端 UI (UsOnly)
11. 创建 `DonationModal.tsx` 组件
12. 创建 `ThankYouModal.tsx` 组件
13. 在首页或适当位置添加打赏入口

### 第五阶段：Monitor 集成
14. 修改 Monitor `prisma/schema.prisma`，添加 `PaymentEvent` 模型
15. 生成并应用迁移
16. 创建 `POST /api/payment/event` 端点
17. 创建 `GET /api/payment/stats` 端点
18. 在 Dashboard 添加支付统计展示

### 第六阶段：联调测试
19. 配置 ZPay 环境变量（使用真实 pid 和 key）
20. 配置 ZPay 后台回调 URL
21. 执行完整支付流程测试
22. 验证 Monitor 数据同步

### 第七阶段：部署准备
23. 更新生产环境变量
24. 配置生产环境回调 URL
25. 编写部署文档和运维手册

---

## 附录：ZPay API 参考

### 支付请求参数
```
https://z-pay.cn/submit.php?
  name=商品名称
  &money=金额
  &type=alipay|wxpay
  &out_trade_no=订单号
  &notify_url=异步通知 URL
  &pid=商户 ID
  &param=附加内容
  &return_url=跳转 URL
  &sign=MD5 签名
  &sign_type=MD5
```

### 签名规则
```
sign = MD5(name + money + out_trade_no + notify_url + pid + param + return_url + type + key)
```
注意：参数按字母顺序排序，空值跳过，末尾拼接 key

### 回调通知 (POST)
```
out_trade_no: 商户订单号
trade_no: ZPay 交易号
type: 支付方式
money: 订单金额
pid: 商户 ID
param: 附加内容
sign: 签名
```

响应 `success` 表示接收成功。