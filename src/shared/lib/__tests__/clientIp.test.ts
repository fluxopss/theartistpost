// @vitest-environment node
import { describe, expect, it } from "vitest";
import { clientIp, clientIpFromHeaders } from "@/shared/lib/clientIp";

const req = (headers: Record<string, string>) =>
  new Request("http://localhost/api/v1/subscribe", { headers });

describe("clientIp (behind Traefik)", () => {
  it("uses the hop Traefik appended (last x-forwarded-for value)", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  it("ignores a spoofed first x-forwarded-for value", () => {
    // A client sends its own header; Traefik appends the real address last.
    expect(
      clientIp(req({ "x-forwarded-for": "1.2.3.4, 198.51.100.20" })),
    ).toBe("198.51.100.20");
    expect(
      clientIp(req({ "x-forwarded-for": "evil, 5.6.7.8 ,  198.51.100.21 " })),
    ).toBe("198.51.100.21");
  });

  it("rotating the spoofed value does not change the key", () => {
    const a = clientIp(req({ "x-forwarded-for": "10.0.0.1, 198.51.100.7" }));
    const b = clientIp(req({ "x-forwarded-for": "10.0.0.2, 198.51.100.7" }));
    expect(a).toBe(b);
  });

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(req({ "x-real-ip": " 198.51.100.4 " }))).toBe(
      "198.51.100.4",
    );
    expect(clientIp(req({ "x-forwarded-for": " , " }))).toBe("unknown");
    expect(clientIp(req({}))).toBe("unknown");
  });

  it("works on a bare Headers object (server actions)", () => {
    expect(
      clientIpFromHeaders(new Headers({ "x-forwarded-for": "9.9.9.9, 198.51.100.1" })),
    ).toBe("198.51.100.1");
  });
});
