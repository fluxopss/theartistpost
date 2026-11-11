import { failureResponse } from "@/server/api/eventResult";
import { bookBlock, cancelBlock, listBlockBoard } from "@/server/api/blockBooking";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { authorizePublisher } from "@/features/auth/publishGate";
import {
  requireActiveMember,
  type AuthedContext,
} from "@/server/api/session";

export const runtime = "nodejs";

const BLOCKS_CLOSED_ERROR =
  "Sign-up blocks open to approved artists. Once Robbie approves your profile, they unlock here.";

/**
 * Same gate as studio writes (real session, approved ARTIST or ADMIN, not
 * suspended) with a friendlier refusal for people not approved yet.
 */
async function requireBlockArtist(
  request: Request,
): Promise<AuthedContext | Response> {
  const ctx = await requireActiveMember(request);
  if (ctx instanceof Response) return ctx;
  const gate = authorizePublisher(ctx.session, ctx.dbUser);
  return gate.ok ? ctx : apiError("forbidden", BLOCKS_CLOSED_ERROR);
}

async function readBody(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return apiError("validation_failed", "Expected a JSON body.");
  }
}

/** The next two weeks of blocks, spots left, and what I hold. */
export async function GET(request: Request) {
  return withApiErrors("signup-blocks", async () => {
    const session = await requireBlockArtist(request);
    if (session instanceof Response) return session;
    const result = await listBlockBoard(session.prisma, session.dbUser);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}

/** Body `{ day: "YYYY-MM-DD", index: 0-2 }`. Books one block for me. */
export async function POST(request: Request) {
  return withApiErrors("signup-blocks:post", async () => {
    const session = await requireBlockArtist(request);
    if (session instanceof Response) return session;
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const result = await bookBlock(session.prisma, session.dbUser, body);
    return result.ok ? apiOk(result.data, { status: 201 }) : failureResponse(result);
  });
}

/** Same body as POST. Cancels my own booking. */
export async function DELETE(request: Request) {
  return withApiErrors("signup-blocks:delete", async () => {
    const session = await requireBlockArtist(request);
    if (session instanceof Response) return session;
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const result = await cancelBlock(session.prisma, session.dbUser, body);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}
