-- 多照片支持迁移脚本
-- 执行顺序：
-- 1. 首先确保 schema.prisma 已更新为 imageUrls String[]
-- 2. 在 Neon 控制台执行以下 SQL 脚本

-- 步骤 1: 添加新的 imageUrls 列（如果不存在）
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 步骤 2: 将旧的 imageUrl 数据迁移到 imageUrls 数组
UPDATE "Post" SET "imageUrls" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL AND "imageUrls" = ARRAY[]::TEXT[];

-- 步骤 3: 删除旧的 imageUrl 列（可选，确认数据迁移完成后再执行）
-- ALTER TABLE "Post" DROP COLUMN "imageUrl";

-- 注意：Prisma 迁移会自动处理 schema 变更
-- 此脚本仅用于在 Neon 生产环境手动迁移现有数据