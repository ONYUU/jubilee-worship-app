import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./lib/supabase/config";

/**
 * Refreshes Supabase auth cookies for the administrator surface.
 *
 * Authorization is deliberately repeated in the protected layout and every
 * Server Action. This proxy only keeps the session cookies current and marks
 * administrator responses as private, so it is never the security boundary.
 */
export async function proxy(request: NextRequest) {
  const config = getSupabasePublicConfig();
  let response = NextResponse.next({ request });

  response.headers.set("Cache-Control", "private, no-store, max-age=0");

  if (!config) {
    return response;
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        response.headers.set("Cache-Control", "private, no-store, max-age=0");

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  // Do not insert logic between client creation and this call: Supabase uses
  // it to validate or refresh the cookie-backed session.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/admin/:path*"]
};
