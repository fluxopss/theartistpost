#!/usr/bin/env node
/**
 * Community v1 end-to-end check against a live deployment. Plain Node 22, no deps.
 *
 *   QA_REVIEW_CODE=... QA_MEMBER_EMAIL=... QA_ARTIST_EMAIL=... \
 *     node scripts/qa/community-e2e.mjs --base https://theartistpost.fluxlab.agency
 *
 * Signs the two demo accounts in with the App Review code, exercises profiles,
 * follows, the board, media, notifications, reports and blocks, prints a
 * PASS/FAIL table, and ALWAYS cleans up what it created (posts, follow, block,
 * profile fields). Never prints tokens or the code. Exit code 1 on any FAIL.
 *
 * Left behind by design (no delete API): report rows, and a QA avatar when the
 * account had none. Their ids/URLs are printed at the end.
 */
import { deflateSync } from "node:zlib";

const LABEL = "[QA] automated check — will be deleted";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const BASE = (arg("--base") ?? "").replace(/\/+$/, "");
const CODE = process.env.QA_REVIEW_CODE ?? "";
const MEMBER_EMAIL = process.env.QA_MEMBER_EMAIL ?? "";
const ARTIST_EMAIL = process.env.QA_ARTIST_EMAIL ?? "";

if (!BASE || !CODE || !MEMBER_EMAIL || !ARTIST_EMAIL) {
  console.error(
    "Usage: QA_REVIEW_CODE=… QA_MEMBER_EMAIL=… QA_ARTIST_EMAIL=… node scripts/qa/community-e2e.mjs --base <url>",
  );
  process.exit(2);
}

/* ---------------- tiny test harness ---------------- */

const rows = [];
function record(name, ok, detail = "") {
  rows.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Run a check; a thrown error is a FAIL. Returns the check's value (or undefined). */
async function check(name, fn) {
  try {
    const value = await fn();
    record(name, true);
    return value;
  } catch (error) {
    record(name, false, redact(error instanceof Error ? error.message : String(error)));
    return undefined;
  }
}

function redact(text) {
  return String(text).split(CODE).join("<code>").slice(0, 200);
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

/* ---------------- HTTP ---------------- */

class ApiFailure extends Error {
  constructor(status, code, message) {
    super(`HTTP ${status}${code ? ` ${code}` : ""}: ${message}`);
    this.status = status;
  }
}

async function call(token, method, path, body, init = {}) {
  const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const response = await fetch(`${BASE}/api/v1${path}`, { method, headers, body: payload, ...init });
  const json = await response.json().catch(() => null);
  if (!json?.ok) {
    throw new ApiFailure(response.status, json?.error?.code, json?.error?.message ?? "bad response");
  }
  return { status: response.status, data: json.data };
}

const get = (t, p) => call(t, "GET", p);
const post = (t, p, b) => call(t, "POST", p, b ?? {});
const patch = (t, p, b) => call(t, "PATCH", p, b);
const del = (t, p, b) => call(t, "DELETE", p, b);

async function expectStatus(promise, status) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiFailure && error.status === status) return;
    throw error;
  }
  throw new Error(`expected HTTP ${status}`);
}

async function signIn(email) {
  await post(null, "/auth/request-code", { email });
  const { data } = await post(null, "/auth/verify", { email, code: CODE });
  expect(typeof data.token === "string" && data.token.length > 20, "no session token");
  return data.token;
}

/* ---------------- tiny PNG ---------------- */

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n += 1) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** A solid-colour size×size RGB PNG. */
function makePng(size = 16, rgb = [46, 196, 182]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => rgb).flat())]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngForm(bytes = makePng(), type = "image/png", name = "qa.png") {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), name);
  return form;
}

async function expectImage(url) {
  const response = await fetch(url);
  expect(response.status === 200, `GET image → HTTP ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  expect(type.startsWith("image/"), `content-type ${type || "(none)"}`);
  const bytes = (await response.arrayBuffer()).byteLength;
  expect(bytes > 0, "empty image");
}

/* ---------------- the run ---------------- */

const created = { posts: [], reports: [] };
let member;
let artist;
const original = {};
const tokens = {};

async function main() {
  console.log(`Community v1 E2E against ${BASE}\n`);

  tokens.member = await check("sign in demo member (review code)", () => signIn(MEMBER_EMAIL));
  tokens.artist = await check("sign in demo artist (review code)", () => signIn(ARTIST_EMAIL));
  if (!tokens.member || !tokens.artist) {
    console.log("\nCannot continue without both sessions.");
    return;
  }
  const M = tokens.member;
  const A = tokens.artist;

  // GET /me — and make sure both can use the community (accept Guidelines once).
  member = await check("GET /me (member)", async () => {
    let { data } = await get(M, "/me");
    expect(data.user?.id && data.user?.handle, "member has no handle");
    if (!data.user.termsAcceptedAt) {
      await post(M, "/me/terms", { accept: true });
      data = (await get(M, "/me")).data;
    }
    expect(data.user.termsAcceptedAt, "terms not accepted");
    return data.user;
  });
  artist = await check("GET /me (artist)", async () => {
    let { data } = await get(A, "/me");
    expect(data.user?.id && data.user?.handle, "artist has no handle");
    if (!data.user.termsAcceptedAt) {
      await post(A, "/me/terms", { accept: true });
      data = (await get(A, "/me")).data;
    }
    expect(data.user.termsAcceptedAt, "terms not accepted");
    return data.user;
  });
  if (!member || !artist) return;

  original.headline = member.headline ?? null;
  original.topicSlugs = (member.topics ?? []).map((t) => t.slug);
  original.avatar = member.image ?? null;
  original.viewerFollows = (await get(M, `/people/${artist.handle}`)).data.viewerFollows;

  await check("PATCH /me headline round-trips", async () => {
    await patch(M, "/me", { headline: LABEL.slice(0, 80) });
    const { data } = await get(M, "/me");
    expect(data.user.headline === LABEL.slice(0, 80), "headline not saved");
  });

  await check("topics: set 2, read back", async () => {
    const { data: topics } = await get(null, "/topics");
    expect(Array.isArray(topics) && topics.length >= 2, "fewer than 2 topics");
    const slugs = topics.slice(0, 2).map((t) => t.slug);
    await patch(M, "/me", { topicSlugs: slugs });
    const { data } = await get(M, "/me");
    const got = data.user.topics.map((t) => t.slug).sort();
    expect(JSON.stringify(got) === JSON.stringify([...slugs].sort()), "topics mismatch");
  });

  await check("avatar upload, then the avatar URL serves an image", async () => {
    const { data } = await call(M, "POST", "/me/avatar", pngForm());
    expect(typeof data.avatarUrl === "string", "no avatarUrl");
    await expectImage(data.avatarUrl);
  });

  await check("follow artist + followers list shows the member", async () => {
    if (original.viewerFollows) await post(M, `/people/${artist.handle}/follow`); // reset to a known state
    const { data } = await post(M, `/people/${artist.handle}/follow`);
    expect(data.following === true, "not following");
    expect(data.followerCount >= 1, "followerCount < 1");
    const followers = (await get(M, `/people/${artist.handle}/followers`)).data.items;
    expect(followers.some((p) => p.handle === member.handle), "member not in followers");
    const person = (await get(M, `/people/${artist.handle}`)).data;
    expect(person.viewerFollows === true && person.followerCount >= 1, "person DTO stale");
  });

  // Artist's own post (target for support / reply / report).
  const postA = await check("artist posts to the board", async () => {
    const { status, data } = await post(A, "/community", { kind: "UPDATE", body: LABEL });
    expect(status === 201 && data.id, "post not created");
    created.posts.push({ id: data.id, token: A });
    return data;
  });

  // Member's post: uploaded image + @mention of the artist.
  const postM = await check("member posts with an uploaded image + @mention", async () => {
    const { data: media } = await call(M, "POST", "/community/media", pngForm());
    expect(typeof media.url === "string", "no media url");
    await expectImage(media.url);
    const { status, data } = await post(M, "/community", {
      kind: "SHOUTOUT",
      body: `${LABEL} @${artist.handle}`,
      imageUrl: media.url,
    });
    expect(status === 201 && data.id, "post not created");
    expect(typeof data.imageUrl === "string", "post lost its image");
    created.posts.push({ id: data.id, token: M });
    await expectImage(data.imageUrl);
    return data;
  });

  await check("board list shows the member's post", async () => {
    expect(postM, "no post to look for");
    const { data } = await get(A, "/community?take=30");
    expect(data.items.some((p) => p.id === postM.id), "post missing from /community");
    const thread = (await get(M, `/community/${postM.id}`)).data;
    expect(thread.post.id === postM.id, "thread mismatch");
  });

  await check("support toggles on/off/on and the count follows", async () => {
    expect(postA, "no artist post");
    const on = (await post(M, `/community/${postA.id}/support`)).data;
    expect(on.supported === true && on.supportCount === 1, `on → ${JSON.stringify(on)}`);
    const off = (await post(M, `/community/${postA.id}/support`)).data;
    expect(off.supported === false && off.supportCount === 0, `off → ${JSON.stringify(off)}`);
    const again = (await post(M, `/community/${postA.id}/support`)).data;
    expect(again.supported === true && again.supportCount === 1, `on again → ${JSON.stringify(again)}`);
  });

  await check("member replies to the artist's post", async () => {
    expect(postA, "no artist post");
    const { status, data } = await post(M, "/community", {
      kind: "KINDNESS",
      body: LABEL,
      parentId: postA.id,
    });
    expect(status === 201 && data.parentId === postA.id, "reply not created");
    const thread = (await get(A, `/community/${postA.id}`)).data;
    expect(thread.replies.some((r) => r.id === data.id), "reply not in thread");
  });

  await check("artist notifications: MENTION + REPLY + SUPPORT from the member", async () => {
    const { data } = await get(A, "/notifications?take=30");
    const mine = data.items.filter((n) => n.actor?.handle === member.handle);
    const types = new Set(mine.map((n) => n.type));
    for (const type of ["MENTION", "REPLY", "SUPPORT"]) {
      expect(types.has(type), `missing ${type} (have ${[...types].join(",") || "none"})`);
    }
    expect(data.unreadCount >= 3, `unreadCount ${data.unreadCount}`);
  });

  await check("mark all read → unreadCount 0", async () => {
    const { data } = await post(A, "/notifications/read", {});
    expect(data.unreadCount === 0, `unreadCount ${data.unreadCount}`);
    const me = (await get(A, "/me")).data;
    expect(me.user.unreadNotifications === 0, "/me still shows unread");
  });

  await check("report, then a duplicate report returns the same id", async () => {
    expect(postA, "no artist post");
    const body = { targetType: "COMMUNITY_POST", targetId: postA.id, reason: "spam", note: LABEL };
    const first = await post(M, "/reports", body);
    expect(first.data.id, "no report id");
    created.reports.push(first.data.id);
    const second = await post(M, "/reports", body);
    expect(second.data.id === first.data.id, "duplicate got a different id");
    expect(second.status === 200, `duplicate status ${second.status}`);
  });

  await check("block hides the member's post from the artist; unblock restores it", async () => {
    expect(postM, "no member post");
    await post(A, "/blocks", { handle: member.handle });
    const hidden = (await get(A, "/community?take=30")).data.items;
    expect(!hidden.some((p) => p.id === postM.id), "post still visible after block");
    await expectStatus(get(A, `/people/${member.handle}`), 404);
    expect((await get(A, "/blocks")).data.some((p) => p.handle === member.handle), "block not listed");
    await del(A, `/blocks/${member.handle}`);
    const back = (await get(A, "/community?take=30")).data.items;
    expect(back.some((p) => p.id === postM.id), "post still hidden after unblock");
  });

  await check("suggested people (member) → 200", async () => {
    const { data } = await get(M, "/people?suggested=1");
    expect(Array.isArray(data.items) && data.items.length <= 12, "bad page");
  });

  await check("following feed → 200", async () => {
    const { data } = await get(M, "/feed?kind=following");
    expect(data.kind === "following" && Array.isArray(data.items), "bad feed");
  });

  await check("delete own posts → thread 404", async () => {
    for (const p of [...created.posts]) {
      const { data } = await del(p.token, `/community/${p.id}`);
      expect(data.deleted === true, "not deleted");
      await expectStatus(get(M, `/community/${p.id}`), 404);
      created.posts = created.posts.filter((x) => x.id !== p.id);
    }
  });
}

/** Always runs: undo everything this script changed that the API lets us undo. */
async function cleanup() {
  console.log("\ncleanup");
  const M = tokens.member;
  const A = tokens.artist;
  const step = async (name, fn) => {
    try {
      await fn();
      console.log(`  ok    ${name}`);
    } catch (error) {
      console.log(`  FAIL  ${name} — ${redact(error instanceof Error ? error.message : String(error))}`);
      cleanupFailures += 1;
    }
  };

  for (const p of created.posts) {
    await step(`delete post ${p.id}`, async () => {
      try {
        await del(p.token, `/community/${p.id}`);
      } catch (error) {
        if (!(error instanceof ApiFailure && error.status === 404)) throw error;
      }
    });
  }
  if (A && member) {
    await step("unblock member (artist side)", async () => {
      await del(A, `/blocks/${member.handle}`);
    });
  }
  if (M && artist && original.viewerFollows !== undefined) {
    await step("restore follow state", async () => {
      const now = (await get(M, `/people/${artist.handle}`)).data.viewerFollows;
      if (now !== original.viewerFollows) await post(M, `/people/${artist.handle}/follow`);
    });
  }
  if (M && member) {
    await step("restore headline and topics", async () => {
      await patch(M, "/me", { headline: original.headline, topicSlugs: original.topicSlugs });
    });
    if (original.avatar) {
      await step("restore original avatar", async () => {
        const res = await fetch(original.avatar);
        expect(res.ok, `original avatar → HTTP ${res.status}`);
        const type = (res.headers.get("content-type") ?? "image/png").split(";")[0];
        const ext = type.split("/")[1] ?? "png";
        await call(M, "POST", "/me/avatar", pngForm(Buffer.from(await res.arrayBuffer()), type, `avatar.${ext}`));
      });
    } else {
      console.log("  note  member had no avatar; the QA avatar stays (no remove API)");
    }
  }
}

let cleanupFailures = 0;
try {
  await main();
} catch (error) {
  record("unexpected error", false, redact(error instanceof Error ? error.message : String(error)));
} finally {
  await cleanup();
}

const failed = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length - failed} passed, ${failed} failed${cleanupFailures ? `, ${cleanupFailures} cleanup step(s) failed` : ""}`);
if (created.reports.length) {
  console.log(`report ids left in the queue (dismiss as admin): ${created.reports.join(", ")}`);
}
process.exit(failed || cleanupFailures ? 1 : 0);
