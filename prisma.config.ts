import path from 'node:path'
import { PrismaConfig } from 'prisma'

export default {
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: `file:${path.join(__dirname, 'prisma', 'dev.db')}`,
  },
} satisfies PrismaConfig