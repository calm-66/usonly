-- 为用户表添加取消配对和归档相关字段
-- 如果字段已存在则跳过

-- 添加 breakupInitiated 字段（默认 false）
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'breakupInitiated') THEN
    ALTER TABLE "User" ADD COLUMN "breakupInitiated" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 添加 breakupAt 字段
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'breakupAt') THEN
    ALTER TABLE "User" ADD COLUMN "breakupAt" TIMESTAMP(3);
  END IF;
END $$;

-- 添加 archivedPartnerId 字段
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'archivedPartnerId') THEN
    ALTER TABLE "User" ADD COLUMN "archivedPartnerId" TEXT;
  END IF;
END $$;

-- 添加 archivedAt 字段（User 表）
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'archivedAt') THEN
    ALTER TABLE "User" ADD COLUMN "archivedAt" TIMESTAMP(3);
  END IF;
END $$;

-- 为 Post 表添加归档相关字段

-- 添加 archivedAt 字段（Post 表）
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Post' AND column_name = 'archivedAt') THEN
    ALTER TABLE "Post" ADD COLUMN "archivedAt" TIMESTAMP(3);
  END IF;
END $$;

-- 添加 archivedBy 字段
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Post' AND column_name = 'archivedBy') THEN
    ALTER TABLE "Post" ADD COLUMN "archivedBy" TEXT;
  END IF;
END $$;

-- 为 archivedAt 字段添加索引（Post 表）
CREATE INDEX IF NOT EXISTS "Post_archivedAt_idx" ON "Post"("archivedAt");

-- 为 userId 和 date 添加复合索引（Post 表）
CREATE INDEX IF NOT EXISTS "Post_userId_date_idx" ON "Post"("userId", "date");