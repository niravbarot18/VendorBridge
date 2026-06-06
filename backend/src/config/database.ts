import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    // Test database connection readiness with a raw query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ MySQL database connected successfully via Prisma Client');
  } catch (error) {
    console.error('❌ MySQL database connection failed:', error);
    // Note: in local development, it might print connection failure if the MySQL server is not running yet.
    // We do NOT block startup during dev if it fails, so that offline dev mode is possible, but we log the error.
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('🔌 MySQL database disconnected');
}
