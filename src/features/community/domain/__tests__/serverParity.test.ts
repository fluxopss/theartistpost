import { describe, expect, it } from "vitest";
import { COMMUNITY_BODY_MAX as SERVER_BODY_MAX, COMMUNITY_KINDS as SERVER_KINDS } from "@/server/api/community";
import { REACTIONS as SERVER_REACTIONS } from "@/server/api/reactions";
import { REPORT_REASONS as SERVER_REASONS } from "@/server/api/safety";
import { COMMUNITY_BODY_MAX, COMMUNITY_KINDS } from "../compose";
import { REACTIONS } from "../reactions";
import { REPORT_REASONS } from "../reasons";

describe("the website shows exactly what the API accepts", () => {
  it("post kinds", () => {
    expect(COMMUNITY_KINDS.map((k) => k.id)).toEqual([...SERVER_KINDS]);
    expect(COMMUNITY_BODY_MAX).toBe(SERVER_BODY_MAX);
  });
  it("reactions", () => {
    expect([...REACTIONS]).toEqual([...SERVER_REACTIONS]);
  });
  it("report reasons", () => {
    expect(REPORT_REASONS.map((r) => r.id)).toEqual([...SERVER_REASONS]);
  });
});
