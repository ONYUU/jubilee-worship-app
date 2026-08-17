import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  errorResponse,
  HttpError,
  jsonResponse,
  readJsonObject,
  throwForRpcError,
} from "../_shared/http.ts";
import { type OwnerRpcClient, requireActiveOwner } from "../_shared/owner.ts";
import {
  pairingCodeDigest,
  requiredTestPushPairingCode,
  requiredTestPushPairingPepper,
} from "../_shared/pairing.ts";

export async function approveTestPushPairing(
  request: Request,
  userId: string | null,
  userClient: OwnerRpcClient,
  pairingPepper: string,
): Promise<Response> {
  try {
    await requireActiveOwner(userId, userClient);
    const pepper = requiredTestPushPairingPepper(pairingPepper);
    const input = await readJsonObject(request);
    const pairingCode = requiredTestPushPairingCode(input.pairingCode);
    const codeDigest = await pairingCodeDigest(pairingCode, pepper);

    const { data, error } = await userClient.rpc(
      "approve_owner_test_push_target",
      {
        target_code_digest: codeDigest,
      },
    );
    if (!error && data !== true) {
      throw new HttpError(
        409,
        "pairing_code_unavailable",
        "연결 코드가 만료됐거나 이미 사용됐습니다.",
      );
    }
    throwForRpcError(error, "pairing_approval_failed");

    return jsonResponse({ status: "approved" });
  } catch (error) {
    return errorResponse(error);
  }
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (request, context) =>
      approveTestPushPairing(
        request,
        context.userClaims?.id ?? null,
        context.supabase as unknown as OwnerRpcClient,
        Deno.env.get("TEST_PUSH_PAIRING_PEPPER") ?? "",
      ),
  ),
};
