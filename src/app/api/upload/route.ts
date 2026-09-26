import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/features/auth/adapter";
import {
  authorizePublisher,
  isMockGuestSession,
  PUBLISHING_CLOSED_ERROR,
} from "@/features/auth/publishGate";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 2.5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Magic-byte sniff for common image types (client Content-Type is not enough). */
const MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF….WEBP
];

/** Per-IP rate limit stub (in-memory; resets on process restart). */
const uploadHits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = uploadHits.get(ip);
  if (!entry || entry.resetAt < now) {
    uploadHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

function sniffImageMime(buffer: Buffer): string | null {
  for (const { mime, bytes } of MAGIC) {
    if (bytes.every((b, i) => buffer[i] === b)) {
      if (mime === "image/webp") {
        // RIFF container must claim WEBP at offset 8
        if (
          buffer.length >= 12 &&
          buffer[8] === 0x57 &&
          buffer[9] === 0x45 &&
          buffer[10] === 0x42 &&
          buffer[11] === 0x50
        ) {
          return mime;
        }
        continue;
      }
      return mime;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || isMockGuestSession(session)) {
    return NextResponse.json(
      { error: "Uploads are closed until an artist is approved." },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { error: PUBLISHING_CLOSED_ERROR },
      { status: 403 },
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.email },
    include: { artistProfile: true },
  });
  const gate = authorizePublisher(session, dbUser);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const ip = clientIp(request);
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many uploads. Try again shortly." },
      { status: 429 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Use JPEG, PNG, WebP, or GIF" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 2.5MB" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImageMime(buffer);
    if (!sniffed || sniffed !== file.type) {
      return NextResponse.json(
        { error: "File contents must match an allowed image type" },
        { status: 400 },
      );
    }

    const ext =
      sniffed === "image/png"
        ? "png"
        : sniffed === "image/webp"
          ? "webp"
          : sniffed === "image/gif"
            ? "gif"
            : "jpg";
    const name = `${randomUUID()}.${ext}`;
    // Keep public/uploads this sprint so Next static serve still works.
    // Private storage ships when a media route can stream outside public/.
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);

    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (error) {
    console.error("[upload]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
