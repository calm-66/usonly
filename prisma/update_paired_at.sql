-- 为已配对但未设置 pairedAt 的用户更新字段
-- 按 2026-03-30 配对日期更新
UPDATE "User" 
SET "pairedAt" = '2026-03-30 00:00:00.000'
WHERE "partnerId" IS NOT NULL 
  AND "pairedAt" IS NULL;

-- 验证更新结果
SELECT id, username, email, "partnerId", "pairedAt" 
FROM "User" 
WHERE "partnerId" IS NOT NULL;