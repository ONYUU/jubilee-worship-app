import type { ImageSource } from "expo-image";

const bundledMedia: Record<string, ImageSource> = {
  "/images/hero/hero-home-stage-20260820-desktop-1280x720.webp": require(
    "../../../assets/images/jubilee/home-stage-20260820.webp"
  ),
  "/images/hero/hero-home-group-07-mobile-1080x1350.webp": require("../../../assets/images/jubilee/home-community.webp"),
  "/images/hero/worship-community-960x610.webp": require("../../../assets/images/jubilee/worship-community.webp"),
  "/images/media/youtube-featured-E5mD29x_-dM-1280x720.webp": require("../../../assets/images/jubilee/gallery-worship-03.webp"),
  "/images/hero/visit-welcome-960x610.webp": require("../../../assets/images/jubilee/guide-community-02.webp"),
  "/images/gallery/sundoo-jubilee-01.webp": require("../../../assets/images/jubilee/gallery-worship-01.webp"),
  "/images/gallery/sundoo-jubilee-03.webp": require("../../../assets/images/jubilee/gallery-worship-03.webp"),
  "/images/gallery/sundoo-jubilee-06.webp": require("../../../assets/images/jubilee/gallery-community-06.webp"),
  "/images/gallery/sundoo-jubilee-07.webp": require("../../../assets/images/jubilee/gallery-community-07.webp")
};

function joinUrl(origin: string, path: string): string {
  return new URL(path.replace(/^\//, ""), `${origin.replace(/\/$/, "")}/`).toString();
}

export function resolveMediaSource(path: string | null): ImageSource | null {
  if (!path) return null;
  if (bundledMedia[path]) return bundledMedia[path];

  if (path.startsWith("storage://public-media/")) {
    const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!projectUrl) return null;
    const objectKey = path
      .slice("storage://public-media/".length)
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    return {
      uri: joinUrl(projectUrl, `storage/v1/object/public/public-media/${objectKey}`)
    };
  }

  if (path.startsWith("https://")) return { uri: path };
  if (path.startsWith("/")) {
    const webOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN;
    return webOrigin ? { uri: joinUrl(webOrigin, path) } : null;
  }
  return null;
}
