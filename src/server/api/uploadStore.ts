import path from "node:path";

/**
 * Where uploaded media lives on disk. `UPLOAD_DIR` wins; otherwise
 * `public/uploads` (the historical location, so existing files keep working).
 * Files are served by `src/app/uploads/[file]/route.ts`: `next start` does not
 * serve files written to `public/` after the build.
 */
export function uploadDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  return configured ? configured : path.join(process.cwd(), "public", "uploads");
}
