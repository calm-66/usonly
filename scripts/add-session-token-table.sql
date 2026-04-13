-- 添加 SessionToken 表用于自动登录功能
-- 执行时间：2026-04-13

-- 创建 SessionToken 表
CREATE TABLE "SessionToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionToken_pkey" PRIMARY KEY ("id")
);

-- 添加 token 唯一索引
CREATE UNIQUE INDEX "SessionToken_token_key" ON "SessionToken"("token");

-- 添加 userId 索引
CREATE INDEX "SessionToken_userId_idx" ON "SessionToken"("userId");

-- 添加 token 索引
CREATE INDEX "SessionToken_token_idx" ON "SessionToken"("token");

-- 添加外键约束（关联到 User 表，删除用户时级联删除 session）
ALTER TABLE "SessionToken" 
ADD CONSTRAINT "SessionToken_userId_fkey" 
FOREIGN KEY ("userId") 
REFERENCES "User"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- 注释说明
COMMENT ON TABLE "SessionToken" IS 'Session Token 表 - 用于自动登录';
COMMENT ON COLUMN "SessionToken"."id" IS '主键 ID';
COMMENT ON COLUMN "SessionToken"."userId" IS '关联的用户 ID';
COMMENT ON COLUMN "SessionToken"."token" IS 'Session Token（加密安全的随机字符串）';
COMMENT ON COLUMN "SessionToken"."expiresAt" IS '过期时间（默认 30 天）';
COMMENT ON COLUMN "SessionToken"."createdAt" IS '创建时间';
COMMENT ON COLUMN "SessionToken"."updatedAt" IS '更新时间';