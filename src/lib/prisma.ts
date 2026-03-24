import { PrismaClient } from '@prisma/client'

// 配置 Prisma 以支持多种数据库
// - 本地开发：可以使用 SQLite 或本地 PostgreSQL
// - Vercel 部署：PostgreSQL（通过环境变量）
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 构建 Prisma 客户端配置
function getPrismaOptions() {
  // 检查是否有 PostgreSQL 环境变量
  const postgresUrl = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    process.env.POSTGRES_PRISMA_URL ||
    process.env.VERCEL_POSTGRES_URL
  
  if (postgresUrl) {
    // 生产环境：使用 PostgreSQL
    return {
      datasources: {
        db: {
          url: postgresUrl,
        },
      },
    }
  }
  
  // 本地开发：从 schema.prisma 读取配置
  return undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(getPrismaOptions())

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
