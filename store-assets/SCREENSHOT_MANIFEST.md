# Production screenshot capture manifest

Final screenshots are deliberately not generated from Preview or Development
builds. Capture them only after Production content and push registration are
verified on the target device.

| Order | Scene | iOS 6.9-inch filename | Android phone filename | Required state |
| ---: | --- | --- | --- | --- |
| 1 | Home | `01-home.png` | `01-home.png` | Future worship event and approved home photo |
| 2 | Worship details | `02-worship-detail.png` | `02-worship-detail.png` | Description, Bible passage, place, calendar and directions |
| 3 | Song list | `03-songlist.png` | `03-songlist.png` | Published songs, artist and key |
| 4 | Media | `04-media.png` | `04-media.png` | Approved video thumbnail and gallery |
| 5 | Guide | `05-guide.png` | `05-guide.png` | Current address, transport and external links |
| 6 | Notification settings | `06-notifications.png` | `06-notifications.png` | Registration and removal verified on the platform |

## Target checks

- iOS: one consistent 6.9-inch portrait set at a valid native size such as
  `1320x2868`, without alpha.
- Android: `1080x1920` portrait, 24-bit PNG without alpha.
- Production app name only; no `Dev`, `Preview`, Expo, debug, touch, or system
  permission overlays.
- No personal notification content, carrier-identifying text, or stale D-day
  values.
- The first three images must clearly show the actual app UI and core functions.
