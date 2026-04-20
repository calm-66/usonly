-- Migration: Add Payment Tables
-- Generated for UsOnly project
-- Description: Add PaymentStatus enum, PaymentOrder table, and Donation table

-- Step 1: Create PaymentStatus enum type
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create PaymentOrder table
CREATE TABLE IF NOT EXISTS "PaymentOrder" (
    "id" TEXT NOT NULL DEFAULT concat('po_', gen_random_uuid()),
    "outTradeNo" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "productName" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "param" TEXT,
    "tradeNo" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create Donation table
CREATE TABLE IF NOT EXISTS "Donation" (
    "id" TEXT NOT NULL DEFAULT concat('dn_', gen_random_uuid()),
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "message" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS "PaymentOrder_userId_idx" ON "PaymentOrder"("userId");
CREATE INDEX IF NOT EXISTS "PaymentOrder_status_idx" ON "PaymentOrder"("status");
CREATE INDEX IF NOT EXISTS "PaymentOrder_createdAt_idx" ON "PaymentOrder"("createdAt");
CREATE INDEX IF NOT EXISTS "Donation_createdAt_idx" ON "Donation"("createdAt");
CREATE INDEX IF NOT EXISTS "Donation_amount_idx" ON "Donation"("amount");

-- Step 5: Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_outTradeNo_key" ON "PaymentOrder"("outTradeNo");
CREATE UNIQUE INDEX IF NOT EXISTS "Donation_orderId_key" ON "Donation"("orderId");

-- Step 6: Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN foreign_key_violation THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Donation" ADD CONSTRAINT "Donation_orderId_fkey" 
    FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("outTradeNo") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN foreign_key_violation THEN null;
END $$;