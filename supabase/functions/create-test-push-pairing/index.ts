import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  errorResponse,
  HttpError,
  jsonResponse,
  readJsonObject,
  requiredSha256Hex,
  requiredTestAppVariant,
  requiredUuid,
  throwForRpcError,
} from "../_shared/http.ts";
import {
  createTestPushPairingCode,
  pairingCodeDigest,
  requiredTestPushPairingCode,
  requiredTestPushPairingPepper,
} from "../_shared/pairing.ts";
import { enforceRegistrationRateLimit } from "../_shared/rate-limit.ts";
import type { RpcClient } from "../_shared/types.ts";

export async function createTestPushPairing(
  request: Request,
  adminClient: RpcClient,
  pairingPepper: string,
): Promise<Response> {
  try {
    await enforceRegistrationRateLimit(
      request,
      5,
      60_000,
      "test-push-pairing",
    );
    const pepper = requiredTestPushPairingPepper(pairingPepper);
    const input = await readJsonObject(request);
    const installationId = requiredUuid(input.installationId, "installationId");
    const pairingProof = requiredSha256Hex(
      input.pairingProof,
      "pairingProof",
    );
    const appVariant = requiredTestAppVariant(input.appVariant);
    const pairingCode = createTestPushPairingCode();
    const normalizedCode = requiredTestPushPairingCode(pairingCode);
    const codeDigest = await pairingCodeDigest(normalizedCode, pepper);

    const { data: expiresAt, error } = await adminClient.rpc(
      "service_create_test_push_pairing_v2",
      {
        target_installation_id: installationId,
        target_pairing_proof: pairingProof,
        target_app_variant: appVariant,
        target_code_digest: codeDigest,
      },
    );
    if (error?.code === "55000") {
      throw new HttpError(
        429,
        "pairing_rate_limited",
        "연결 코드는 잠시 후 다시 만들 수 있습니다.",
      );
    }
    if (error?.code === "23505") {
      throw new HttpError(
        409,
        "pairing_code_collision",
        "연결 코드를 다시 만들어 주세요.",
      );
    }
    throwForRpcError(error, "pairing_create_failed");
    if (
      typeof expiresAt !== "string" ||
      !Number.isFinite(Date.parse(expiresAt))
    ) {
      throw new HttpError(
        500,
        "pairing_create_failed",
        "연결 코드 만료 시각을 확인하지 못했습니다.",
      );
    }

    return jsonResponse({ pairingCode, expiresAt, appVariant }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export default {
  fetch: withSupabase(
    { auth: ["publishable"] },
    async (request, context) =>
      createTestPushPairing(
        request,
        context.supabaseAdmin,
        Deno.env.get("TEST_PUSH_PAIRING_PEPPER") ?? "",
      ),
  ),
};
