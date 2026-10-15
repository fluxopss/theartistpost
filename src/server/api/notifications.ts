import type { NotificationType, PrismaClient } from "@prisma/client";

export type NotifyInput = {
  userId: string;
  actorId: string;
  type: NotificationType;
  targetKind: "post" | "community" | "person";
  targetRef: string | null;
  preview?: string | null;
};

/**
 * Create an in-app notification. Placeholder until the notifications task
 * lands; callers already depend on this exact signature and it never throws.
 */
export async function notify(
  _prisma: PrismaClient,
  _input: NotifyInput,
): Promise<void> {
  void _prisma;
  void _input;
}
