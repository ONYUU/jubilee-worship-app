#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
output_dir="${1:-${repo_root}/outputs/store-assets}"

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
icon_bytes="$(stat -f '%z' "${icon}")"

feature_geometry="$(magick identify -format '%wx%h' "${feature}")"
feature_depth="$(magick identify -format '%z' "${feature}")"
feature_channels="$(magick identify -format '%[channels]' "${feature}")"
feature_opaque="$(magick identify -format '%[opaque]' "${feature}")"
icon_sha256="$(shasum -a 256 "${icon}" | awk '{print $1}')"
feature_sha256="$(shasum -a 256 "${feature}" | awk '{print $1}')"

fail() {
  echo "FAIL $1" >&2
  exit 1
}

[[ "${icon_geometry}" == "512x512" ]] || fail "Play icon geometry=${icon_geometry}"
[[ "${icon_depth}" == "8" ]] || fail "Play icon depth=${icon_depth}"
[[ "${icon_channels}" == *a* ]] || fail "Play icon is not 32-bit RGBA: ${icon_channels}"
(( icon_bytes <= 1048576 )) || fail "Play icon exceeds 1,024 KB: ${icon_bytes} bytes"
[[ "${icon_sha256}" == "${expected_icon_sha256}" ]] || fail "Play icon digest=${icon_sha256}"

[[ "${feature_geometry}" == "1024x500" ]] || fail "Feature geometry=${feature_geometry}"
[[ "${feature_depth}" == "8" ]] || fail "Feature depth=${feature_depth}"
[[ "${feature_channels}" != *a* ]] || fail "Feature graphic has an alpha channel: ${feature_channels}"
[[ "${feature_opaque}" == "True" ]] || fail "Feature graphic is not opaque: ${feature_opaque}"
[[ "${feature_sha256}" == "${expected_feature_sha256}" ]] || fail "Feature digest=${feature_sha256}"

echo "PASS google-play-icon-512.png geometry=${icon_geometry} depth=${icon_depth} channels=${icon_channels} bytes=${icon_bytes}"
echo "PASS google-play-feature-graphic-1024x500.png geometry=${feature_geometry} depth=${feature_depth} channels=${feature_channels} opaque=${feature_opaque} bytes=$(stat -f '%z' "${feature}")"
printf '%s  %s\n' "${icon_sha256}" "${icon}"
printf '%s  %s\n' "${feature_sha256}" "${feature}"
