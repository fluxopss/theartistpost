// @vitest-environment node
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, HEAD } from "@/app/uploads/[file]/route";
import { storeUploadedMedia } from "@/server/api/media";
import { uploadDir } from "@/server/api/uploadStore";

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52,
]);

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "tap-uploads-"));
  vi.stubEnv("UPLOAD_DIR", dir);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

const ctx = (file: string) => ({ params: Promise.resolve({ file }) });
const url = (file: string) => `http://localhost/uploads/${file}`;

async function seed(ext: string, bytes: Buffer = PNG) {
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), bytes);
  return name;
}

describe("uploadDir", () => {
  it("honors UPLOAD_DIR and falls back to public/uploads", () => {
    expect(uploadDir()).toBe(dir);
    vi.stubEnv("UPLOAD_DIR", "");
    expect(uploadDir()).toBe(path.join(process.cwd(), "public", "uploads"));
  });
});

describe("storeUploadedMedia", () => {
  it("writes under UPLOAD_DIR and still returns a /uploads/<uuid> url", async () => {
    const file = new File([PNG], "a.png", { type: "image/png" });
    const stored = await storeUploadedMedia(file);
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    expect(stored.media.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    const onDisk = await readFile(path.join(dir, stored.media.url.split("/").pop()!));
    expect(onDisk.equals(PNG)).toBe(true);
  });
});

describe("GET /uploads/[file]", () => {
  it.each([
    "../.env",
    "..",
    "%2e%2e",
    "%2e%2e%2f.env",
    "x.svg",
    "abc.png",
    "not-a-uuid.png",
    `${randomUUID().toUpperCase()}.png`,
    `${randomUUID()}.svg`,
    `${randomUUID()}.png/../../x`,
    `${randomUUID()}.png\0`,
    `${randomUUID()}`,
  ])("404s a bad name: %s", async (name) => {
    const response = await GET(new Request(url(name)), ctx(name));
    expect(response.status).toBe(404);
  });

  it("404s a valid name that does not exist", async () => {
    const name = `${randomUUID()}.png`;
    expect((await GET(new Request(url(name)), ctx(name))).status).toBe(404);
  });

  it("serves an existing file with the right headers", async () => {
    const name = await seed("png");
    const response = await GET(new Request(url(name)), ctx(name));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-length")).toBe(String(PNG.length));
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(Buffer.from(await response.arrayBuffer()).equals(PNG)).toBe(true);
  });

  it.each([
    ["jpg", "image/jpeg"],
    ["webp", "image/webp"],
    ["gif", "image/gif"],
    ["mp4", "video/mp4"],
    ["webm", "video/webm"],
  ])("maps .%s to %s", async (ext, type) => {
    const name = await seed(ext);
    const response = await GET(new Request(url(name)), ctx(name));
    expect(response.headers.get("content-type")).toBe(type);
  });

  it("HEAD returns the headers and no body", async () => {
    const name = await seed("png");
    const response = await HEAD(new Request(url(name), { method: "HEAD" }), ctx(name));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe(String(PNG.length));
    expect((await response.arrayBuffer()).byteLength).toBe(0);
  });

  it("HEAD 404s a missing file", async () => {
    const name = `${randomUUID()}.png`;
    const response = await HEAD(new Request(url(name), { method: "HEAD" }), ctx(name));
    expect(response.status).toBe(404);
  });
});

describe("Range requests", () => {
  const body = Buffer.from("0123456789abcdefghij"); // 20 bytes

  const range = async (value: string) => {
    const name = await seed("mp4", body);
    return GET(
      new Request(url(name), { headers: { Range: value } }),
      ctx(name),
    );
  };

  it("returns 206 with Content-Range for a closed range", async () => {
    const response = await range("bytes=2-5");
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/20");
    expect(response.headers.get("content-length")).toBe("4");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("2345");
    expect(response.headers.get("content-type")).toBe("video/mp4");
  });

  it("supports open-ended and suffix ranges", async () => {
    const open = await range("bytes=15-");
    expect(open.status).toBe(206);
    expect(open.headers.get("content-range")).toBe("bytes 15-19/20");
    expect(Buffer.from(await open.arrayBuffer()).toString()).toBe("fghij");

    const suffix = await range("bytes=-3");
    expect(suffix.status).toBe(206);
    expect(suffix.headers.get("content-range")).toBe("bytes 17-19/20");
    expect(Buffer.from(await suffix.arrayBuffer()).toString()).toBe("hij");
  });

  it("clamps an end past the file", async () => {
    const response = await range("bytes=10-999");
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 10-19/20");
  });

  it("answers 416 for an unsatisfiable range", async () => {
    const response = await range("bytes=50-60");
    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */20");
  });

  it("ignores multi-range and malformed headers (full 200)", async () => {
    for (const value of ["bytes=0-1,5-6", "items=0-1", "bytes=abc", "bytes=5-2"]) {
      const response = await range(value);
      expect(response.status, value).toBe(200);
      expect(response.headers.get("content-length")).toBe("20");
    }
  });
});
