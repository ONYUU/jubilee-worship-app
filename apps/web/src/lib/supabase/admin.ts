import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";

export type AdminAuthUserSummary = {
  id: string;
  email: string | null;
  invitedAt: string | null;
  confirmationSentAt: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  bannedUntil: string | null;
};

export function createSupabaseAdminClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() ?? "";

  if (!config || !secretKey) {
    return null;
  }

  return createClient(config.url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

export function getAdminInviteRedirectUrl(): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";

  try {
    const parsed = new URL(siteUrl);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) {
      return null;
    }
    return new URL("/auth/confirm", parsed.origin).toString();
  } catch {
    return null;
  }
}

export async function listAdminAuthUserSummaries(
  client: SupabaseClient
): Promise<{ data: AdminAuthUserSummary[] | null; error: boolean }> {
  const users: AdminAuthUserSummary[] = [];
  const perPage = 1_000;

  for (let page = 1; page <= 100; page += 1) {
    const result = await client.auth.admin.listUsers({ page, perPage });
    if (result.error) return { data: null, error: true };

    users.push(
      ...result.data.users.map((user) => ({
        id: user.id,
        email: user.email ?? null,
        invitedAt: user.invited_at ?? null,
        confirmationSentAt: user.confirmation_sent_at ?? null,
        emailConfirmedAt: user.email_confirmed_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        bannedUntil: user.banned_until ?? null
      }))
    );

    if (result.data.users.length < perPage) {
      return { data: users, error: false };
    }
  }

  return { data: null, error: true };
}
