import { vi } from "vitest";
import type { Mock } from "vitest";
import { encodeSessionToken } from "@/features/auth/sessionCookie";

/**
 * Shared test kit for the community API tests: a lazily-built mocked Prisma
 * client (any `db.model.method` is a vi.fn with a sensible default), user
 * fixtures, and request helpers. Import `./testkit` from inside
 * `vi.mock("@/shared/lib/prisma", async () => …)` so the route handlers and
 * the test share one instance.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn = Mock<(...args: any[]) => any>;

const fns = new Map<string, Fn>();

function defaultFor(method: string): unknown {
  if (method === "findMany") return [];
  if (method === "count") return 0;
  if (method === "findUnique" || method === "findFirst") return null;
  return {};
}

function getFn(path: string, method: string): Fn {
  const key = `${path}.${method}`;
  let fn = fns.get(key);
  if (!fn) {
    fn = vi.fn(async () => defaultFor(method)) as unknown as Fn;
    fns.set(key, fn);
  }
  return fn;
}

type ModelMock = Record<string, Fn>;
type DbMock = Record<string, ModelMock> & {
  $transaction: Fn;
};

function modelProxy(name: string): ModelMock {
  return new Proxy({} as ModelMock, {
    get(_target, method: string) {
      return getFn(name, method);
    },
  });
}

const models = new Map<string, ModelMock>();

export const db = new Proxy({} as DbMock, {
  get(_target, name: string) {
    if (name === "$transaction") return getFn("$", "transaction");
    let model = models.get(name);
    if (!model) {
      model = modelProxy(name);
      models.set(name, model);
    }
    return model;
  },
});

export const state = { connected: true };

/** Reset every mock to its default; call in `beforeEach`. */
export function resetDb(): void {
  state.connected = true;
  for (const [key, fn] of fns) {
    const method = key.split(".")[1] ?? "";
    fn.mockReset();
    if (key === "$.transaction") {
      fn.mockImplementation((async (arg: unknown) =>
        Array.isArray(arg)
          ? Promise.all(arg)
          : (arg as (tx: unknown) => unknown)(db)));
    } else {
      fn.mockImplementation(async () => defaultFor(method));
    }
  }
  getFn("$", "transaction").mockImplementation((async (arg: unknown) =>
    Array.isArray(arg)
      ? Promise.all(arg)
      : (arg as (tx: unknown) => unknown)(db)));
}

export function getTestPrisma() {
  return state.connected ? db : null;
}

const DATE = new Date("2026-01-01T00:00:00Z");

export type UserRow = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: "VIEWER" | "ARTIST" | "ADMIN";
  supabaseAuthId: string | null;
  handle: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  chapterId: string | null;
  termsAcceptedAt: Date | null;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  artistProfile: null | {
    id: string;
    userId: string;
    handle: string;
    bio: string | null;
    avatarUrl: string | null;
    socialLinks: unknown;
    approved: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
};

/** A fully onboarded community member (handle + terms accepted). */
export function userRow(overrides: Partial<UserRow> = {}): UserRow {
  const id = overrides.id ?? "user_member";
  return {
    id,
    email: `${id}@example.com`,
    name: "Member One",
    image: null,
    role: "VIEWER",
    supabaseAuthId: null,
    handle: id.replace(/^user_/, ""),
    bio: null,
    headline: null,
    location: null,
    chapterId: null,
    termsAcceptedAt: DATE,
    suspendedAt: null,
    createdAt: DATE,
    updatedAt: DATE,
    artistProfile: null,
    ...overrides,
  };
}

export function artistRow(
  handle: string,
  overrides: Partial<UserRow> = {},
  approved = true,
): UserRow {
  const id = overrides.id ?? `user_${handle}`;
  return userRow({
    id,
    role: "ARTIST",
    handle,
    artistProfile: {
      id: `ap_${handle}`,
      userId: id,
      handle,
      bio: null,
      avatarUrl: null,
      socialLinks: null,
      approved,
      createdAt: DATE,
      updatedAt: DATE,
    },
    ...overrides,
  });
}

export function bearerFor(user: Pick<UserRow, "id" | "email" | "name" | "role"> & { artistProfile?: { handle: string } | null }) {
  const token = encodeSessionToken(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      handle: user.artistProfile?.handle,
    },
    "test-auth-secret-for-v1",
  );
  return { Authorization: `Bearer ${token}` };
}

export function jsonRequest(
  url: string,
  method: "POST" | "PATCH" | "DELETE" | "PUT",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function getRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

/** Resolve the signed-in user for the next `requireApiSession` call. */
export function signInAs(user: UserRow) {
  db.user.findUnique.mockResolvedValueOnce(user);
  return bearerFor(user);
}
