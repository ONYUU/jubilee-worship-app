import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

type ImageRemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port: string;
  pathname: string;
};

function getExplicitLocalSupabaseConfig(): {
  httpOrigin: string;
  websocketOrigin: string;
  imagePattern: ImageRemotePattern;
} | null {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    return {
      httpOrigin: url.origin,
      websocketOrigin: `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`,
      imagePattern: {
        protocol: url.protocol === "https:" ? "https" : "http",
        hostname: url.hostname,
        port: url.port,
        pathname: "/storage/v1/object/public/public-media/**"
      }
    };
  } catch {
    return null;
  }
}

const localSupabase = getExplicitLocalSupabaseConfig();
const imageSources = [
  "'self'",
  "data:",
  "blob:",
  "https://*.supabase.co",
  "https://i.ytimg.com",
  ...(localSupabase ? [localSupabase.httpOrigin] : [])
];
const connectSources = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  ...(localSupabase ? [localSupabase.httpOrigin, localSupabase.websocketOrigin] : [])
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src ${imageSources.join(" ")}`,
      "font-src 'self' data:",
      `connect-src ${connectSources.join(" ")}`,
      "frame-src https://www.youtube-nocookie.com"
    ].join("; ")
  }
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Next.js 16 blocks private IP image optimization by default. Permit it
    // only when the operator explicitly points this build at local Supabase.
    dangerouslyAllowLocalIP: Boolean(localSupabase),
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/public-media/**"
      },
      ...(localSupabase ? [localSupabase.imagePattern] : [])
    ]
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  }
};

export default nextConfig;
