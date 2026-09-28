import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { absoluteUrl } from "@/server/api/urls";

export const IMAGE_MAX_BYTES = 2.5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 25 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

const IMAGE_MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

export type StoredMedia = {
  url: string;
  absoluteUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  contentType: string;
  bytes: number;
};

export type StoreMediaResult =
  | { ok: true; media: StoredMedia }
  | { ok: false; error: string; code: "validation_failed" };

function sniffImageMime(buffer: Buffer): string | null {
  for (const { mime, bytes } of IMAGE_MAGIC) {
    if (bytes.every((b, i) => buffer[i] === b)) {
      if (mime === "image/webp") {
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

function sniffVideoMime(buffer: Buffer, declared: string): string | null {
  // ISO BMFF (mp4/m4v/mov): "ftyp" at offset 4
  if (
    buffer.length >= 8 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return declared === "video/mp4" ? "video/mp4" : null;
  }
  // WebM / EBML
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return declared === "video/webm" ? "video/webm" : null;
  }
  return null;
}

function extensionFor(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default:
      return "jpg";
  }
}

/**
 * Validate and store an uploaded image or video under public/uploads.
 * Same on-disk convention as legacy POST /api/upload.
 */
export async function storeUploadedMedia(file: File): Promise<StoreMediaResult> {
  const declared = file.type;
  const isImage = IMAGE_TYPES.has(declared);
  const isVideo = VIDEO_TYPES.has(declared);

  if (!isImage && !isVideo) {
    return {
      ok: false,
      error: "Use JPEG, PNG, WebP, GIF, MP4, or WebM",
      code: "validation_failed",
    };
  }

  const max = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > max) {
    return {
      ok: false,
      error: isVideo
        ? "Video must be under 25MB"
        : "Image must be under 2.5MB",
      code: "validation_failed",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = isImage
    ? sniffImageMime(buffer)
    : sniffVideoMime(buffer, declared);

  if (!sniffed || sniffed !== declared) {
    return {
      ok: false,
      error: "File contents must match an allowed media type",
      code: "validation_failed",
    };
  }

  const ext = extensionFor(sniffed);
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);

  const url = `/uploads/${name}`;
  return {
    ok: true,
    media: {
      url,
      absoluteUrl: absoluteUrl(url) ?? url,
      mediaType: isVideo ? "VIDEO" : "IMAGE",
      contentType: sniffed,
      bytes: buffer.length,
    },
  };
}
