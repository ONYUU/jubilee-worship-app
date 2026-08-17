import { HttpError } from "./http.ts";
import type { RpcClient } from "./types.ts";

interface MembershipQuery {
  select(columns: string): MembershipQuery;
  eq(column: string, value: unknown): MembershipQuery;
  maybeSingle(): PromiseLike<{
    data: { role: string; is_active: boolean } | null;
    error: { code?: string; message?: string } | null;
  }>;
}

export interface OwnerRpcClient extends RpcClient {
  from(table: string): MembershipQuery;
}

export async function requireActiveOwner(
  userId: string | null,
  userClient: OwnerRpcClient,
): Promise<void> {
  if (!userId) {
    throw new HttpError(
      401,
      "authentication_required",
      "관리자 로그인이 필요합니다.",
    );
  }

  const { data: membership, error: membershipError } = await userClient
    .from("admin_users")
    .select("role,is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (membershipError || membership?.role !== "owner") {
    throw new HttpError(
      403,
      "owner_required",
      "활성 owner 권한이 필요합니다.",
    );
  }
}
