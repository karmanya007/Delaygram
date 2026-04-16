import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// In serverless environments (Vercel), add ?connection_limit=1&pool_timeout=20
// to DATABASE_URL to prevent connection exhaustion across concurrent invocations.
//
// For production at scale, replace with Prisma Accelerate:
//   1. Set DATABASE_URL to your Accelerate proxy URL
//   2. npm install @prisma/extension-accelerate
//   3. Wrap: new PrismaClient().$extends(withAccelerate())
export const prisma =
  globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;