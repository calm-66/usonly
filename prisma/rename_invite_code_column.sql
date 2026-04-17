-- 将 User 表的 invite_code 列重命名为 inviteCode
-- 执行方式：在 Neon 控制台 SQL 编辑器中运行此脚本

-- 重命名列
ALTER TABLE "User" 
RENAME COLUMN "invite_code" TO "inviteCode";

-- 验证
-- SELECT id, username, "inviteCode" FROM "User" LIMIT 10;