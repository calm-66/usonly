-- UsOnly 数据库迁移脚本
-- 从 main 分支迁移到 preview 分支
-- 生成日期：2026-04-03
-- 
-- 变更说明：
-- 1. 从 Post 表中删除 isLatePost 列（不再需要补传标记功能）
-- 2. 前端代码中已移除对该字段的使用
-- 3. 前端"我们的"标签页配对天数显示优化（去掉"d"后缀）

-- 删除 Post 表中的 isLatePost 列
ALTER TABLE "Post" DROP COLUMN "isLatePost";

-- 说明：
-- 此迁移将永久删除 isLatePost 列数据，请确保不再需要此功能
-- 迁移前建议备份数据库