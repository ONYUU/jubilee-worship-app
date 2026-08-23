#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
output_dir="${repo_root}/outputs/store-assets"
base_only=false

for argument in "$@"; do
  case "${argument}" in
    --base-only)
      base_only=true
      ;;
    --*)
      echo "Unknown option: ${argument}" >&2
      exit 2
      ;;
    *)
      output_dir="${argument}"
      ;;
  esac
done

icon="${output_dir}/google-play-icon-512.png"
feature="${output_dir}/google-play-feature-graphic-1024x500.png"
expected_icon_sha256="cda312c4d77e4028ff0ef39ed40e2e3082ec47f8ab55d26e96bf62a7bb20a8c3"
expected_feature_sha256="ba4c0c6be77b4193d55a169208bee793f749c0d79cb8c5277dea105cf0f4f47d"

for required_file in "${icon}" "${feature}"; do
  if [[ ! -f "${required_file}" ]]; then
    echo "Missing generated asset: ${required_file}" >&2
    exit 1
  fi
done

icon_geometry="$(magick identify -format '%wx%h' "${icon}")"
icon_depth="$(magick identify -format '%z' "${icon}")"
icon_channels="$(magick identify -format '%[channels]' "${icon}")"
icon_type="$(magick identify -format '%[type]' "${icon}")"
icon_bytes="$(stat -f '%z' "${icon}")"

feature_geometry="$(magick identify -format '%wx%h' "${feature}")"
feature_depth="$(magick identify -format '%z' "${feature}")"
feature_channels="$(magick identify -format '%[channels]' "${feature}")"
feature_type="$(magick identify -format '%[type]' "${feature}")"
feature_opaque="$(magick identify -format '%[opaque]' "${feature}")"
icon_sha256="$(shasum -a 256 "${icon}" | awk '{print $1}')"
feature_sha256="$(shasum -a 256 "${feature}" | awk '{print $1}')"

fail() {
  echo "FAIL $1" >&2
  exit 1
}

[[ "${icon_geometry}" == "512x512" ]] || fail "Play icon geometry=${icon_geometry}"
[[ "${icon_depth}" == "8" ]] || fail "Play icon depth=${icon_depth}"
[[ "${icon_type}" == "TrueColorAlpha" ]] || fail "Play icon is not 32-bit RGBA: type=${icon_type} channels=${icon_channels}"
(( icon_bytes <= 1048576 )) || fail "Play icon exceeds 1,024 KB: ${icon_bytes} bytes"
[[ "${icon_sha256}" == "${expected_icon_sha256}" ]] || fail "Play icon digest=${icon_sha256}"

[[ "${feature_geometry}" == "1024x500" ]] || fail "Feature geometry=${feature_geometry}"
[[ "${feature_depth}" == "8" ]] || fail "Feature depth=${feature_depth}"
[[ "${feature_type}" == "TrueColor" ]] || fail "Feature graphic is not 24-bit RGB: type=${feature_type} channels=${feature_channels}"
[[ "${feature_channels}" != *a* ]] || fail "Feature graphic has an alpha channel: ${feature_channels}"
[[ "${feature_opaque}" == "True" ]] || fail "Feature graphic is not opaque: ${feature_opaque}"
[[ "${feature_sha256}" == "${expected_feature_sha256}" ]] || fail "Feature digest=${feature_sha256}"

echo "PASS google-play-icon-512.png geometry=${icon_geometry} depth=${icon_depth} type=${icon_type} channels=${icon_channels} bytes=${icon_bytes}"
echo "PASS google-play-feature-graphic-1024x500.png geometry=${feature_geometry} depth=${feature_depth} type=${feature_type} channels=${feature_channels} opaque=${feature_opaque} bytes=$(stat -f '%z' "${feature}")"
printf '%s  %s\n' "${icon_sha256}" "${icon}"
printf '%s  %s\n' "${feature_sha256}" "${feature}"

if [[ "${base_only}" == "true" ]]; then
  echo "PASS base assets only; final screenshot validation was explicitly skipped"
  exit 0
fi

expected_screenshots=(
  "01-home.png"
  "02-worship-detail.png"
  "03-songlist.png"
  "04-media.png"
  "05-guide.png"
  "06-notifications.png"
)

validate_screenshot_set() {
  local platform_label="$1"
  local screenshot_dir="$2"
  local expected_geometry="$3"
  local file_count

  [[ -d "${screenshot_dir}" ]] || fail "${platform_label} screenshot directory is missing: ${screenshot_dir}"

  file_count="$(find "${screenshot_dir}" -maxdepth 1 -type f | wc -l | tr -d '[:space:]')"
  [[ "${file_count}" == "${#expected_screenshots[@]}" ]] || fail "${platform_label} screenshot count=${file_count}; expected=${#expected_screenshots[@]}"

  for screenshot_name in "${expected_screenshots[@]}"; do
    local screenshot_path="${screenshot_dir}/${screenshot_name}"
    local screenshot_format
    local screenshot_geometry
    local screenshot_depth
    local screenshot_channels
    local screenshot_type
    local screenshot_opaque

    [[ -f "${screenshot_path}" ]] || fail "${platform_label} screenshot is missing: ${screenshot_name}"

    screenshot_format="$(magick identify -format '%m' "${screenshot_path}")"
    screenshot_geometry="$(magick identify -format '%wx%h' "${screenshot_path}")"
    screenshot_depth="$(magick identify -format '%z' "${screenshot_path}")"
    screenshot_channels="$(magick identify -format '%[channels]' "${screenshot_path}")"
    screenshot_type="$(magick identify -format '%[type]' "${screenshot_path}")"
    screenshot_opaque="$(magick identify -format '%[opaque]' "${screenshot_path}")"

    [[ "${screenshot_format}" == "PNG" ]] || fail "${platform_label} ${screenshot_name} format=${screenshot_format}"
    [[ "${screenshot_geometry}" == "${expected_geometry}" ]] || fail "${platform_label} ${screenshot_name} geometry=${screenshot_geometry}; expected=${expected_geometry}"
    [[ "${screenshot_depth}" == "8" ]] || fail "${platform_label} ${screenshot_name} depth=${screenshot_depth}"
    [[ "${screenshot_type}" == "TrueColor" ]] || fail "${platform_label} ${screenshot_name} is not 24-bit RGB: type=${screenshot_type} channels=${screenshot_channels}"
    [[ "${screenshot_channels}" != *a* ]] || fail "${platform_label} ${screenshot_name} has an alpha channel: ${screenshot_channels}"
    [[ "${screenshot_opaque}" == "True" ]] || fail "${platform_label} ${screenshot_name} is not opaque: ${screenshot_opaque}"

    echo "PASS ${platform_label} ${screenshot_name} geometry=${screenshot_geometry} depth=${screenshot_depth} type=${screenshot_type} channels=${screenshot_channels}"
  done
}

validate_screenshot_set \
  "iOS 6.9-inch" \
  "${output_dir}/screenshots/ios-6.9in" \
  "1320x2868"

validate_screenshot_set \
  "Android phone" \
  "${output_dir}/screenshots/android-phone" \
  "1080x1920"

echo "PASS final store assets and 12 production screenshots"
