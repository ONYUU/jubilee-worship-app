import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicContent } = vi.hoisted(() => ({ getPublicContent: vi.fn() }));

vi.mock("@/lib/data/repository", () => ({ getPublicContent }));

import { GET } from "./route";

describe("calendar route abuse boundary", () => {
  beforeEach(() => getPublicContent.mockReset());

  it("rejects malformed and oversized slugs before querying Supabase", async () => {
    const response = await GET(
      new Request("https://example.invalid/api/calendar/bad"),
      { params: Promise.resolve({ slug: `../${"a".repeat(300)}` }) }
    );

    expect(response.status).toBe(404);
    expect(getPublicContent).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("s-maxage=300");
  });

  it("adds shared-cache protection to successful public calendar downloads", async () => {
    getPublicContent.mockResolvedValue({
      events: [{
        slug: "jubilee-worship",
        published: true,
        status: "scheduled",
        startsAt: "2026-09-04T10:00:00+09:00",
        endsAt: null,
        title: "쥬빌리워십",
        description: "예배",
        venueName: "선두교회",
        address: "대한민국",
        sourceUrl: "https://jubilee-worship.vercel.app/worship"
      }]
    });

    const response = await GET(
      new Request("https://example.invalid/api/calendar/jubilee-worship"),
      { params: Promise.resolve({ slug: "jubilee-worship" }) }
    );

    expect(response.status).toBe(200);
    expect(getPublicContent).toHaveBeenCalledOnce();
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300, s-maxage=300, stale-while-revalidate=86400"
    );
  });
});
