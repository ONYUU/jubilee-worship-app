# Store visual assets

This directory contains the reproducible build and capture manifest for the
Jubilee Worship store-listing graphics. The two reviewed Play upload candidates
under `outputs/store-assets/` are kept in Git so the exact verified files are
preserved. Production screenshot folders remain local and excluded from Git.

## Build

```sh
bash store-assets/build-store-assets.sh
```

The build uses only these reviewed runtime sources:

- `apps/mobile/assets/images/jubilee/app-icon-official.png`
- `apps/mobile/assets/images/jubilee/home-stage-20260820.webp`

It also verifies the exact SHA-256 of the local
`/Library/Fonts/NanumGothic-Bold.ttf` binary before rendering so a different
font version cannot silently change the upload asset.

The feature graphic applies a fixed crop, a readability gradient, and Korean
type. It does not generate, remove, replace, or retouch people or objects.

## Generated files

- `outputs/store-assets/google-play-icon-512.png`
- `outputs/store-assets/google-play-feature-graphic-1024x500.png`
- `outputs/store-assets/screenshots/ios-6.9in/` — reserved for Production captures
- `outputs/store-assets/screenshots/android-phone/` — reserved for Production captures

Do not put Preview/Development-build captures in the two screenshot folders.
The default validation is intentionally fail-closed: it checks the two base
assets and all 12 Production screenshots. Run it before uploading any asset to
a store console.

```sh
bash store-assets/validate-store-assets.sh
```

During base-asset production only, explicitly skip the not-yet-captured
screenshots with:

```sh
bash store-assets/validate-store-assets.sh --base-only
```
