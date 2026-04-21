-- 迁移脚本：将 Donation 表数据整合到 PaymentOrder 表，然后删除 Donation 表
-- 执行日期：2026-04-21
-- 
-- 说明：保留 param 字段用于存储商品补充信息（ZPay 回调原样返回）
--       新增 message 和 isAnonymous 字段便于直接查询打赏数据

-- 步骤 1: 向 PaymentOrder 表添加新字段
ALTER TABLE "PaymentOrder" 
ADD COLUMN IF NOT EXISTS "message" TEXT,
ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- 步骤 2: 将 Donation 表的数据迁移到 PaymentOrder 表
-- （如果 Donation 表中有数据）
UPDATE "PaymentOrder" po
SET 
  "message" = d."message",
  "isAnonymous" = d."isAnonymous"
FROM "Donation" d
WHERE d."orderId" = po."id"
  AND po."message" IS NULL;

-- 步骤 3: 删除 Donation 表的外键约束
ALTER TABLE "Donation" DROP CONSTRAINT IF EXISTS "Donation_orderId_fkey";

-- 步骤 4: 删除 Donation 表
DROP TABLE IF EXISTS "Donation";

-- 迁移完成
-- 注意：
-- 1. param 字段已保留，继续用于存储 JSON 格式的补充信息
-- 2. 请确保在生产环境执行前先在测试环境验证
