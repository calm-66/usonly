-- AlterTable - 添加 title 字段
ALTER TABLE "Post" ADD COLUMN "title" TEXT;

-- 将现有 theme 数据迁移到 title（可选）
UPDATE "Post" SET "title" = "theme" WHERE "theme" IS NOT NULL;

-- AlterTable - 移除 theme 字段
ALTER TABLE "Post" DROP COLUMN "theme";