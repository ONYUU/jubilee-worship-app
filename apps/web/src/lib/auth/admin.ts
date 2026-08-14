import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminAccess, AdminContext, AdminRole } from "./types";

export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  noStore();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "configuration_required" };
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const subject = claimsData?.claims.sub;

  if (claimsError || typeof subject !== "string" || !subject) {
    return { status: "unauthenticated" };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("admin_users")
    .select("user_id, role, is_active")
    .eq("user_id", subject)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return { status: "forbidden" };
  }

  return {
    status: "authorized",
    supabase,
    admin: {
      userId: subject,
      email: typeof claimsData.claims.email === "string" ? claimsData.claims.email : null,
      role: membership.role as AdminRole
    }
  };
});

export async function requireActiveAdmin(): Promise<AdminContext> {
  const access = await getAdminAccess();

  if (access.status === "configuration_required") {
    redirect("/admin/login?reason=configuration");
  }

  if (access.status === "unauthenticated") {
    redirect("/admin/login?reason=session");
  }

  if (access.status === "forbidden") {
    redirect("/admin/login?reason=access");
  }

  return { supabase: access.supabase, admin: access.admin };
}

export async function requireOwner(): Promise<AdminContext> {
  const context = await requireActiveAdmin();

  if (context.admin.role !== "owner") {
    redirect("/admin?reason=owner");
  }

  return context;
}
