#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
output_dir="${1:-${repo_root}/outputs/store-assets}"

icon_source="${repo_root}/apps/mobile/assets/images/jubilee/app-icon-official.png"
photo_source="${repo_root}/apps/mobile/assets/images/jubilee/home-stage-20260820.webp"
font_bold="/Library/Fonts/NanumGothic-Bold.ttf"
icon_source_sha256="4c77b8fbaed126eb8c2b6f8fa1e186f8a6d2e3ef95fe538775fe638dd1d1f346"
photo_source_sha256="2ee79acb599f8536d2c97ef2143bfc930f8133cf2e6bb777926b908a6e1b5a27"
font_bold_sha256="f96298f9fb18e364d2370f4c3ce948ac67a2b61af992d7234bc15c42b033c674"

for required_file in "${icon_source}" "${photo_source}" "${font_bold}"; do
  if [[ ! -f "${required_file}" ]]; then
    echo "Missing required file: ${required_file}" >&2
    exit 1
  fi
done

verify_sha256() {
  local file="$1"
  local expected="$2"
  local label="$3"
  local actual
  actual="$(shasum -a 256 "${file}" | awk '{print $1}')"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "Unexpected ${label} digest: ${actual}" >&2
    echo "Expected: ${expected}" >&2
    exit 1
  fi
}

verify_sha256 "${icon_source}" "${icon_source_sha256}" "app icon source"
verify_sha256 "${photo_source}" "${photo_source_sha256}" "worship photo source"
verify_sha256 "${font_bold}" "${font_bold_sha256}" "NanumGothic-Bold.ttf"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick 7 is required." >&2
  exit 1
fi

mkdir -p \
  "${output_dir}/screenshots/ios-6.9in" \
  "${output_dir}/screenshots/android-phone"

# Google Play listing icon: keep the official artwork and background unchanged,
# resample it once from the locked 1024 px source, and encode as 32-bit RGBA PNG.
magick "${icon_source}" \
  -filter Lanczos \
  -resize 512x512! \
  -colorspace sRGB \
  -alpha on \
  -strip \
  -define png:color-type=6 \
  "PNG32:${output_dir}/google-play-icon-512.png"

# Google Play feature graphic: deterministic crop and overlay only. No person,
# object, or background is generated, removed, replaced, or retouched.
magick "${photo_source}" \
  -filter Lanczos \
  -resize 1024x576! \
  -crop 1024x500+0+64 \
  +repage \
  \( -size 1024x500 'gradient:#0D1C2ADE-#0D1C2A00' \) \
  -compose over \
  -composite \
  -gravity north \
  -font "${font_bold}" \
  -pointsize 58 \
  -fill '#0D1C2ACC' \
  -stroke none \
  -annotate +2+54 '쥬빌리워십' \
  -fill '#FFF5AE' \
  -annotate +0+52 '쥬빌리워십' \
  -pointsize 24 \
  -fill '#0D1C2AD9' \
  -annotate +1+126 '예배를 준비하는 한 화면' \
  -fill '#FFFFFF' \
  -annotate +0+125 '예배를 준비하는 한 화면' \
  -colorspace sRGB \
  -alpha off \
  -type TrueColor \
  -strip \
  -define png:color-type=2 \
  "PNG24:${output_dir}/google-play-feature-graphic-1024x500.png"

echo "Created store assets in ${output_dir}"
