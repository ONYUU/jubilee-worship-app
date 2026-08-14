import { describe, expect, it } from "vitest";
import {
  APPROVED_YOUTUBE_CHANNEL_IDS,
  APPROVED_YOUTUBE_VIDEO_IDS,
  SITE
} from "./constants";
import {
  isApprovedYouTubeChannelId,
  isApprovedYouTubeUrl,
  parseYouTubeVideoId
} from "./youtube";

const APPROVED_ID = APPROVED_YOUTUBE_VIDEO_IDS[0];

describe("parseYouTubeVideoId", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${APPROVED_ID}`, APPROVED_ID],
    [`https://youtube.com/watch?v=${APPROVED_ID}&t=20`, APPROVED_ID],
    [`https://m.youtube.com/watch?v=${APPROVED_ID}`, APPROVED_ID],
    [`https://music.youtube.com/watch?v=${APPROVED_ID}`, APPROVED_ID],
    [`https://youtu.be/${APPROVED_ID}`, APPROVED_ID],
    [`https://www.youtube.com/live/${APPROVED_ID}?feature=share`, APPROVED_ID],
    [`https://www.youtube.com/shorts/${APPROVED_ID}`, APPROVED_ID],
    [`https://www.youtube.com/embed/${APPROVED_ID}`, APPROVED_ID],
    [`https://www.youtube-nocookie.com/embed/${APPROVED_ID}`, APPROVED_ID]
  ])("extracts a supported URL form: %s", (url, expected) => {
    expect(parseYouTubeVideoId(url)).toBe(expected);
  });

  it.each([
    "",
    "not a URL",
    `https://example.com/watch?v=${APPROVED_ID}`,
    `https://youtube.com.evil.test/watch?v=${APPROVED_ID}`,
    `https://user:password@youtube.com/watch?v=${APPROVED_ID}`,
    "https://www.youtube.com/watch",
    `https://www.youtube.com/watch?v=${APPROVED_ID}&v=O2mNdkl5q54`,
    "https://www.youtube.com/playlist?list=PL123",
    `https://youtu.be/path/${APPROVED_ID}`,
    "https://youtu.be/too-short",
    `ftp://youtu.be/${APPROVED_ID}`,
    `https://www.youtube-nocookie.com/watch?v=${APPROVED_ID}`
  ])("rejects unsupported or ambiguous input: %s", (url) => {
    expect(parseYouTubeVideoId(url)).toBeNull();
  });
});

describe("YouTube allowlists", () => {
  it("pins the verified current channel identity", () => {
    expect(SITE.youtube_channel_url).toBe(
      "https://www.youtube.com/@JUBILEEWORSHIP-25"
    );
    expect(SITE.youtube_channel_id).toBe("UCxmosyyztNo7HBUOdN_gy9w");
    expect(APPROVED_YOUTUBE_CHANNEL_IDS).toContain(SITE.youtube_channel_id);
    expect(isApprovedYouTubeChannelId(SITE.youtube_channel_id)).toBe(true);
    expect(isApprovedYouTubeChannelId("UC0000000000000000000000")).toBe(false);
  });

  it("approves only explicitly reviewed video IDs", () => {
    expect(
      isApprovedYouTubeUrl(`https://youtu.be/${APPROVED_YOUTUBE_VIDEO_IDS[1]}`)
    ).toBe(true);
    expect(isApprovedYouTubeUrl("https://youtu.be/AAAAAAAAAAA")).toBe(false);
  });

  it("supports an explicit caller-supplied allowlist", () => {
    expect(
      isApprovedYouTubeUrl("https://youtu.be/AAAAAAAAAAA", ["AAAAAAAAAAA"])
    ).toBe(true);
  });
});
