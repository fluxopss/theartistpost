import { joinHref } from "@/shared/lib/safeNext";

/**
 * The website's client for the same /api/v1 routes the app uses. The browser
 * sends the httpOnly `tap_session` cookie; nothing is kept in localStorage.
 */
export type WebApiError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
  retryAfterSec?: number;
};

export type WebApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: WebApiError };

export type WebApiInit = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
  form?: FormData;
  /** "redirect" (default) sends a signed-out person to sign in and back. */
  onUnauthorized?: "redirect" | "return";
};

export async function webApi<T>(path: `/${string}`, init: WebApiInit = {}): Promise<WebApiResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (init.form) {
    body = init.form;
  } else if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers,
      body,
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: { code: "network", message: "Can't reach The Artist Post right now. Check your connection and try again." },
    };
  }

  const payload = (await response.json().catch(() => null)) as
    | { ok: true; data: T }
    | { ok: false; error: WebApiError }
    | null;

  if (response.status === 401 && (init.onUnauthorized ?? "redirect") === "redirect") {
    window.location.assign(joinHref(`${window.location.pathname}${window.location.search}`));
  }

  if (response.ok && payload && payload.ok) return { ok: true, data: payload.data };

  const error =
    payload && !payload.ok && payload.error
      ? payload.error
      : { code: "server_error", message: "Something went wrong on our side. Try again in a moment." };
  return { ok: false, status: response.status, error };
}
