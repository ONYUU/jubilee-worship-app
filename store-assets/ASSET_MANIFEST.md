# Google Play visual asset manifest

- Generated and verified: 2026-08-23 KST
- Listing language: Korean
- Source handling: deterministic resampling, crop, gradient, and typography only
- Generative image editing: not used

## Source lock

| Source | SHA-256 | Use |
| --- | --- | --- |
| `apps/mobile/assets/images/jubilee/app-icon-official.png` | `4c77b8fbaed126eb8c2b6f8fa1e186f8a6d2e3ef95fe538775fe638dd1d1f346` | Official app icon source |
| `apps/mobile/assets/images/jubilee/home-stage-20260820.webp` | `2ee79acb599f8536d2c97ef2143bfc930f8133cf2e6bb777926b908a6e1b5a27` | Approved worship-stage photo derivative |
| `/Library/Fonts/NanumGothic-Bold.ttf` | `f96298f9fb18e364d2370f4c3ce948ac67a2b61af992d7234bc15c42b033c674` | Local font binary required for deterministic Korean text rendering |

## Upload candidates

| Output | SHA-256 | Pixel format | Size | Result |
| --- | --- | --- | ---: | --- |
| `outputs/store-assets/google-play-icon-512.png` | `cda312c4d77e4028ff0ef39ed40e2e3082ec47f8ab55d26e96bf62a7bb20a8c3` | 512x512, 8-bit sRGBA, alpha channel present and fully opaque | 134,503 bytes | PASS |
| `outputs/store-assets/google-play-feature-graphic-1024x500.png` | `ba4c0c6be77b4193d55a169208bee793f749c0d79cb8c5277dea105cf0f4f47d` | 1024x500, 8-bit sRGB, no alpha | 487,528 bytes | PASS |

The app icon stays below Google Play's 1,024 KB limit. The feature graphic is a
24-bit PNG with no alpha. Both outputs have stripped metadata.

## Copy and accessibility

- Feature title: `쥬빌리워십`
- Feature line: `예배를 준비하는 한 화면`
- Suggested Play Console alt text: `선두교회 본당 무대에서 찬양을 인도하는 쥬빌리워십 찬양팀`

## Visual review

- All nine visible team members remain present; no person or object was added,
  deleted, replaced, or retouched.
- The crop removes ceiling and audience-edge content while retaining the stage,
  main screen, team formation, instruments, and floor monitors.
- The title and supporting line are centered within the safe middle area and do
  not overlap faces.
- No store badge, price, ranking, award, download call-to-action, or misleading
  claim is present.
