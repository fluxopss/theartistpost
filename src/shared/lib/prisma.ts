import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Lazy Prisma singleton. Returns null when DATABASE_URL is a placeholder
 * or the client cannot connect — callers should fall back to fixtures.
 */
export function getPrisma(): PrismaClient | null {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("USER:PASSWORD")) {
    return null;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
