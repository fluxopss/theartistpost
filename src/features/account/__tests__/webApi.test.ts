import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webApi } from "../webApi";

const fetchMock = vi.fn();
const assign = vi.fn();

function respond(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

beforeEach(() => {
  fetchMock.mockReset();
  assign.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("location", { ...window.location, pathname: "/settings/profile", search: "", assign });
});
afterEach(() => vi.unstubAllGlobals());

describe("webApi", () => {
  it("calls /api/v1 relative with same-origin credentials and JSON", async () => {
    fetchMock.mockReturnValue(respond(200, { ok: true, data: {} }));
    await webApi("/me", { method: "PATCH", json: { name: "Rae" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/me",
      expect.objectContaining({
        method: "PATCH",
        credentials: "same-origin",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: '{"name":"Rae"}',
      }),
    );
  });

  it("defaults to GET with no body", async () => {
    fetchMock.mockReturnValue(respond(200, { ok: true, data: 1 }));
    await webApi("/me");
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("sends FormData without a Content-Type header", async () => {
    fetchMock.mockReturnValue(respond(200, { ok: true, data: { avatarUrl: "/uploads/a.jpg" } }));
    const form = new FormData();
    form.set("file", new Blob(["x"]), "a.jpg");
    await webApi("/me/avatar", { method: "POST", form });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.body).toBe(form);
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  it("unwraps { ok:true, data }", async () => {
    fetchMock.mockReturnValue(respond(200, { ok: true, data: { following: true, followerCount: 3 } }));
    await expect(webApi("/people/rae/follow", { method: "POST" })).resolves.toEqual({
      ok: true,
      data: { following: true, followerCount: 3 },
    });
  });

  it("returns the error envelope and status on 4xx", async () => {
    const error = { code: "validation_failed", message: "Bad", fields: { bio: "Too long" } };
    fetchMock.mockReturnValue(respond(400, { ok: false, error }));
    await expect(webApi("/me", { method: "PATCH", json: {} })).resolves.toEqual({ ok: false, status: 400, error });
  });

  it("on 401 redirects to sign in and back by default", async () => {
    fetchMock.mockReturnValue(respond(401, { ok: false, error: { code: "unauthorized", message: "Sign in" } }));
    const result = await webApi("/me", { method: "PATCH", json: {} });
    expect(assign).toHaveBeenCalledWith("/join?door=return&next=%2Fsettings%2Fprofile");
    expect(result.ok).toBe(false);
  });

  it("on 401 with onUnauthorized:'return' does not redirect", async () => {
    fetchMock.mockReturnValue(respond(401, { ok: false, error: { code: "unauthorized", message: "Sign in" } }));
    const result = await webApi("/me", { onUnauthorized: "return" });
    expect(assign).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("maps a network failure to status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(webApi("/me")).resolves.toMatchObject({ ok: false, status: 0, error: { code: "network" } });
  });

  it("maps a non-JSON error page to a readable error", async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response("<html>502</html>", { status: 502 })));
    await expect(webApi("/me")).resolves.toMatchObject({ ok: false, status: 502, error: { code: "server_error" } });
  });
});
