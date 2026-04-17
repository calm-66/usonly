-- 为 User 表添加 invite_code 字段
-- 执行方式：在 Neon 控制台 SQL 编辑器中运行此脚本

-- 添加 invite_code 列（允许 NULL 先，以便添加列）
ALTER TABLE "User" 
ADD COLUMN "invite_code" VARCHAR(255);

-- 为现有用户生成唯一的邀请码（使用 UUID 的前 8 位）
-- 注意：这需要执行一个脚本来为每个现有用户生成唯一的 invite_code
-- 以下是临时 SQL 块，用于更新现有用户

-- 创建一个临时函数来生成随机邀请码
-- 由于 PostgreSQL 不支持直接在 UPDATE 中使用 uuid_generate_v4()  tanpa extension
-- 我们使用 gen_random_uuid() 如果可用，或者使用 MD5

-- 方法 1: 如果数据库有 uuid-ossp 扩展
-- UPDATE "User" 
-- SET invite_code = UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 8))
-- WHERE invite_code IS NULL;

-- 方法 2: 使用 MD5 和随机数（更通用）
UPDATE "User" 
SET invite_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id || NOW()::TEXT), 1, 8))
WHERE invite_code IS NULL;

-- 添加唯一约束
ALTER TABLE "User" 
ADD CONSTRAINT "User_invite_code_key" UNIQUE ("invite_code");

-- 设置为 NOT NULL（现在所有记录都有值了）
ALTER TABLE "User" 
ALTER COLUMN "invite_code" SET NOT NULL;

-- 验证
-- SELECT id, username, invite_code FROM "User" LIMIT 10;