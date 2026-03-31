-- Migration: Add location fields to Post table for map check-in feature
-- Generated for UsOnly app

-- Add latitude column (Float, nullable)
ALTER TABLE "Post" ADD COLUMN "latitude" FLOAT8;

-- Add longitude column (Float, nullable)
ALTER TABLE "Post" ADD COLUMN "longitude" FLOAT8;

-- Add location column (String, nullable)
ALTER TABLE "Post" ADD COLUMN "location" TEXT;

-- Create index for location-based queries (optional, for future features)
CREATE INDEX IF NOT EXISTS "Post_location_idx" ON "Post"("latitude", "longitude");