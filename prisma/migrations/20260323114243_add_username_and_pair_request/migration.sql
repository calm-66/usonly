-- DropIndex
DROP INDEX "Post_userId_date_key";

-- CreateIndex
CREATE INDEX "Post_userId_date_idx" ON "Post"("userId", "date");
