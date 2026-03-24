import { PrismaClient } from '@prisma/client'

// 配置 Prisma 以支持多种数据库
// - 本地开发：SQLite（从 schema.prisma 自动读取）
// - Vercel 部署：PostgreSQL（通过环境变量）
const prismaOptions = (() => {
  // 检查是否使用 PostgreSQL
  const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL
  
  if (postgresUrl) {
    // 使用连接池避免连接数过多
    return {
      datasources: {
        db: {
          url: postgresUrl,
        },
      },
    }
  }
  
  // SQLite 模式下，从 schema.prisma 自动读取配置，不需要额外配置
  return undefined
})()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaOptions)

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
