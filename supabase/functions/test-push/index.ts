import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  errorResponse,
  HttpError,
  jsonResponse,
  optionalDeepLink,
  readJsonObject,
  requiredString,
  requiredUuid,
  sha256Hex,
  throwForRpcError,
} from "../_shared/http.ts";
import type { RpcClient } from "../_shared/types.ts";

interface MembershipQuery {
  select(columns: string): MembershipQuery;
  eq(column: string, value: unknown): MembershipQuery;
  maybeSingle(): PromiseLike<{
    data: { role: string; is_active: boolean } | null;
    error: { code?: string; message?: string } | null;
  }>;
}

interface UserClient extends RpcClient {
  from(table: string): MembershipQuery;
}

export async function testPush(
  request: Request,
  userId: string | null,
  userClient: UserClient,
  adminClient: RpcClient,
): Promise<Response> {
  try {
    const input = await readJsonObject(request);
    const installationId = requiredUuid(
      input.installationId,
      "installationId",
    );
    const installationSecret = requiredString(
      input.installationSecret,
      "installationSecret",
      128,
    );
    const title = requiredString(input.title, "title", 120);
    const body = requiredString(input.body, "body", 500);
    const deepLink = optionalDeepLink(input.deepLink);

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

    const { data: endpointId, error: endpointError } = await adminClient.rpc(
      "service_resolve_push_endpoint",
      {
        target_installation_id: installationId,
        target_secret_hash: await sha256Hex(installationSecret),
      },
    );
    throwForRpcError(endpointError, "endpoint_lookup_failed");
    if (typeof endpointId !== "string") {
      throw new HttpError(
        401,
        "invalid_installation",
        "활성 시험 기기를 확인할 수 없습니다.",
      );
    }

    const dedupeKey = `test:${crypto.randomUUID()}`;
    const { data: campaignId, error: createError } = await userClient.rpc(
      "create_notification_campaign",
      {
        target_kind: "test",
        target_title: title,
        target_body: body,
        target_deep_link: deepLink,
        target_audience_kind: "test_endpoint",
        target_event_id: null,
        target_test_push_endpoint_id: endpointId,
        target_dedupe_key: dedupeKey,
      },
    );
    throwForRpcError(createError, "campaign_create_failed");
    if (typeof campaignId !== "string") {
      throw new HttpError(
        500,
        "campaign_create_failed",
        "시험 캠페인을 만들지 못했습니다.",
      );
    }

    const { error: approveError } = await userClient.rpc(
      "approve_notification_campaign",
      { target_campaign_id: campaignId },
    );
    throwForRpcError(approveError, "campaign_approval_failed");

    const { error: queueError } = await userClient.rpc(
      "queue_notification_campaign",
      { target_campaign_id: campaignId },
    );
    throwForRpcError(queueError, "campaign_queue_failed");

    return jsonResponse(
      { campaignId, status: "queued", externalSend: false },
      202,
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export default {
  fetch: withSupabase({ auth: "user" }, async (request, context) =>
    testPush(
      request,
      context.userClaims?.id ?? null,
      context.supabase as unknown as UserClient,
      context.supabaseAdmin as unknown as RpcClient,
    )),
};
