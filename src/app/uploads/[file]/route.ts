import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { uploadDir } from "@/server/api/uploadStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Uploaded media (`/uploads/<uuid>.<ext>`). `next start` does not serve files
 * written to `public/` after the build, so uploads are streamed from
 * `uploadDir()` here. Only our own random-UUID names are accepted, which also
 * rules out any path traversal.
 */
const NAME_RE = /^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm)$/;

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
};

type Ctx = RouteContext<"/uploads/[file]">;

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

/**
 * One `bytes=` range. Returns the satisfiable [start, end], "unsatisfiable",
 * or null when the header is absent, multi-range or malformed (serve the
 * whole file, as the spec allows).
 */
function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  let start: number;
  let end: number;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (suffix === 0) return "unsatisfiable";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
    if (rawEnd !== "" && end < start) return null;
  }
  if (start >= size) return "unsatisfiable";
  return { start, end: Math.min(end, size - 1) };
}

async function serve(request: Request, ctx: Ctx, withBody: boolean) {
  const { file } = await ctx.params;
  if (!NAME_RE.test(file)) return notFound();

  const filePath = path.join(uploadDir(), file);
  let size: number;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return notFound();
    size = info.size;
  } catch {
    return notFound();
  }

  const headers = new Headers({
    "Content-Type": TYPES[file.slice(file.lastIndexOf(".") + 1)]!,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  });

  const range = parseRange(request.headers.get("range"), size);
  if (range === "unsatisfiable") {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  const length = size === 0 ? 0 : end - start + 1;
  headers.set("Content-Length", String(length));
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);

  const status = range ? 206 : 200;
  if (!withBody || length === 0) return new Response(null, { status, headers });

  const stream = createReadStream(filePath, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status,
    headers,
  });
}

export async function GET(request: Request, ctx: Ctx) {
  return serve(request, ctx, true);
}

export async function HEAD(request: Request, ctx: Ctx) {
  return serve(request, ctx, false);
}
