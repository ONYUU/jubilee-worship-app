import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inviteConfirmationSchema = z.object({
  token_hash: z.string().min(1).max(2_048),
  type: z.literal("invite")
});

function privateRedirect(request: NextRequest, pathname: string, reason?: string) {
  const destination = request.nextUrl.clone();
  destination.pathname = pathname;
  destination.search = "";
  destination.hash = "";
  if (reason) destination.searchParams.set("reason", reason);

  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function GET(request: NextRequest) {
  const parsed = inviteConfirmationSchema.safeParse({
    token_hash: request.nextUrl.searchParams.get("token_hash"),
    type: request.nextUrl.searchParams.get("type")
  });
  if (!parsed.success) {
    return privateRedirect(request, "/admin/login", "invite_invalid");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return privateRedirect(request, "/admin/login", "configuration");
  }

  const { data, error } = await supabase.auth.verifyOtp(parsed.data);
  if (error || !data.user) {
    return privateRedirect(request, "/admin/login", "invite_expired");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("admin_users")
    .select("user_id,role,is_active")
    .eq("user_id", data.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (membershipError || !membership) {
    await supabase.auth.signOut();
    return privateRedirect(request, "/admin/login", "access");
  }

  return privateRedirect(request, "/admin/set-password");
}
