import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  errorResponse,
  HttpError,
  jsonResponse,
  optionalDeepLink,
  readJsonObject,
  requiredString,
  requiredTestAppVariant,
  requiredUuid,
  throwForRpcError,
} from "../_shared/http.ts";
import { type OwnerRpcClient, requireActiveOwner } from "../_shared/owner.ts";

export async function testPush(
  request: Request,
  userId: string | null,
  userClient: OwnerRpcClient,
): Promise<Response> {
  try {
    await requireActiveOwner(userId, userClient);

    const input = await readJsonObject(request);
    const requestId = requiredUuid(input.requestId, "requestId");
    const pushEndpointId = requiredUuid(
      input.pushEndpointId,
      "pushEndpointId",
    );
    const appVariant = requiredTestAppVariant(input.appVariant);
    const title = requiredString(input.title, "title", 120);
    const body = requiredString(input.body, "body", 500);
    const deepLink = optionalDeepLink(input.deepLink);

    const { data: campaignId, error: queueError } = await userClient.rpc(
      "queue_owner_test_push",
      {
        target_request_id: requestId,
        target_push_endpoint_id: pushEndpointId,
        target_app_variant: appVariant,
        target_title: title,
        target_body: body,
        target_deep_link: deepLink,
      },
    );
    if (queueError?.code === "P0002") {
      throw new HttpError(
        409,
        "test_target_unavailable",
        "선택한 시험 기기를 더 이상 사용할 수 없습니다.",
      );
    }
    if (queueError?.code === "23505") {
      throw new HttpError(
        409,
        "test_request_conflict",
        "같은 시험 요청 식별값에 다른 내용이 이미 등록됐습니다.",
      );
    }
    throwForRpcError(queueError, "test_push_queue_failed");
    if (typeof campaignId !== "string") {
      throw new HttpError(
        500,
        "test_push_queue_failed",
        "시험 캠페인을 만들지 못했습니다.",
      );
    }

    return jsonResponse({ campaignId }, 202);
  } catch (error) {
    return errorResponse(error);
  }
}

export default {
  fetch: withSupabase({ auth: "user" }, async (request, context) =>
    testPush(
      request,
      context.userClaims?.id ?? null,
      context.supabase as unknown as OwnerRpcClient,
    )),
};
