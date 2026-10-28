import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd, serializeJsonLd } from "@/lib/seo/json-ld";

describe("JsonLd escaping", () => {
  const payload = { name: "Acme</script><script>alert(1)</script>" };

  it("never lets a value close the script tag", () => {
    const html = renderToStaticMarkup(<JsonLd data={payload} />);
    expect(html).not.toContain("</script><script>");
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });

  it("still parses back to the same data", () => {
    expect(JSON.parse(serializeJsonLd(payload))).toEqual(payload);
  });

  it("escapes HTML comment and line-separator tricks", () => {
    const s = serializeJsonLd({ a: "<!-- x", b: String.fromCharCode(0x2028, 0x2029) });
    expect(s).not.toContain("<");
    expect(s.includes(String.fromCharCode(0x2028))).toBe(false);
    expect(s.includes(String.fromCharCode(0x2029))).toBe(false);
  });
});
