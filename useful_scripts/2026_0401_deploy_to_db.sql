-- ============================================
-- UsOnly 数据库迁移脚本
-- 从 main 分支升级到 preview 分支
-- ============================================
-- 生成时间：2026-04-01
-- 比较分支：main -> preview
-- 文件名格式：year_date_deploy_to_db.sql
-- ============================================

-- 差异说明：
-- preview 分支 Post 表新增字段（地图打卡功能）：
--   - latitude    Float?   纬度 (-90 到 90)
--   - longitude   Float?   经度 (-180 到 180)
--   - location    String?  位置名称（如"上海市 普陀区 长风新村街道 宁夏路"）
--
-- 此脚本用于将 main 分支的数据库升级到 preview 分支的结构
-- ============================================

BEGIN;

-- 为 Post 表添加位置相关字段（地图打卡功能）
-- latitude: 纬度，范围 -90 到 90
-- longitude: 经度，范围 -180 到 180
-- location: 位置名称，用户手动输入

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "location" TEXT;

COMMIT;

-- ============================================
-- 迁移完成
-- ============================================

-- 验证查询：
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'Post' 
-- ORDER BY ordinal_position;

-- 预期结果应包含：
-- latitude  | double precision | YES
-- longitude | double precision | YES
-- location  | text             | YES

-- 在 Neon 控制台执行此 SQL 脚本进行迁移
-- ============================================