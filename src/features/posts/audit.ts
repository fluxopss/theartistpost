import type { Prisma, PrismaClient } from "@prisma/client";

export type AuditWrite = {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: Prisma.InputJsonValue;
};

export async function writeAuditLog(
  prisma: PrismaClient,
  entry: AuditWrite,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      meta: entry.meta ?? undefined,
    },
  });
}
