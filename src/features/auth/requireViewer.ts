import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/adapter";
import type { SessionUser } from "@/features/auth/types";
import { joinHref } from "@/shared/lib/safeNext";

/**
 * For pages that only make sense signed in. Signed-out visitors go to the
 * returning door and come back to `nextPath` after their code.
 */
export async function requireViewer(nextPath: string): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(joinHref(nextPath));
  return user;
}
