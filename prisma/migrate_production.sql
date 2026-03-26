-- 创建评论表
CREATE TABLE IF NOT EXISTS "Comment" (
    id TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    content TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY (id)
);

-- 创建通知表
CREATE TABLE IF NOT EXISTS "Notification" (
    id TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "senderId" TEXT,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY (id)
);

-- 添加外键约束
ALTER TABLE "Comment" 
ADD CONSTRAINT "Comment_postId_fkey" 
FOREIGN KEY ("postId") 
REFERENCES "Post"(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" 
ADD CONSTRAINT "Comment_userId_fkey" 
FOREIGN KEY ("userId") 
REFERENCES "User"(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" 
ADD CONSTRAINT "Comment_parentId_fkey" 
FOREIGN KEY ("parentId") 
REFERENCES "Comment"(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- 添加通知表外键约束
ALTER TABLE "Notification" 
ADD CONSTRAINT "Notification_receiverId_fkey" 
FOREIGN KEY ("receiverId") 
REFERENCES "User"(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" 
ADD CONSTRAINT "Notification_senderId_fkey" 
FOREIGN KEY ("senderId") 
REFERENCES "User"(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" 
ADD CONSTRAINT "Notification_postId_fkey" 
FOREIGN KEY ("postId") 
REFERENCES "Post"(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- 添加索引
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");
CREATE INDEX "Notification_receiverId_isRead_createdAt_idx" ON "Notification"("receiverId", "isRead", "createdAt");

-- 更新 Post 表添加关联（Prisma 会自动处理，不需要额外操作）
-- 更新 User 表添加关联（Prisma 会自动处理，不需要额外操作）