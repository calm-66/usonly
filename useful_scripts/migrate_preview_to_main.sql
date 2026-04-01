-- ============================================
-- UsOnly 数据库迁移脚本
-- 从 preview 分支迁移到 main 分支
-- ============================================
-- 生成时间：2026-04-01
-- 比较分支：preview -> main
-- ============================================

-- 差异说明：
-- preview 分支 Post 表新增字段：
--   - latitude    Float?   纬度（地图打卡功能）
--   - longitude   Float?   经度（地图打卡功能）
--   - location    String?  位置名称（地图打卡功能）
--
-- 注意：此脚本用于将 preview 分支的数据库结构回滚到 main 分支
-- 如果 preview 分支有数据，这些字段的数据将会丢失
-- ============================================

BEGIN;

-- 如果要从 preview 回滚到 main，需要删除 Post 表的位置相关字段
-- PostgreSQL 11+ 支持 DROP COLUMN IF EXISTS

-- 删除 Post 表新增的位置字段
ALTER TABLE "Post" DROP COLUMN IF EXISTS "latitude";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "longitude";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "location";

COMMIT;

-- ============================================
-- 迁移完成
-- ============================================
-- 验证查询：
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'Post' 
-- ORDER BY ordinal_position;
-- ============================================