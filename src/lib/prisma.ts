import { PrismaClient } from '@prisma/client'

// 配置 Prisma 以支持 Vercel Postgres
// 使用连接池避免连接数过多
const prismaOptions = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL,
    },
  },
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaOptions)

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}