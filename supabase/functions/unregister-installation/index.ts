import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  errorResponse,
  readJsonObject,
  requiredString,
  requiredUuid,
  sha256Hex,
  throwForRpcError,
} from "../_shared/http.ts";
import type { RpcClient } from "../_shared/types.ts";

export async function unregisterInstallation(
  request: Request,
  adminClient: RpcClient,
): Promise<Response> {
  try {
    const input = await readJsonObject(request);
    const installationId = requiredUuid(input.installationId, "installationId");
    const installationSecret = requiredString(
      input.installationSecret,
      "installationSecret",
      128,
    );

    const { error } = await adminClient.rpc(
      "service_unregister_app_installation",
      {
        target_installation_id: installationId,
        target_secret_hash: await sha256Hex(installationSecret),
      },
    );
    throwForRpcError(error, "unregister_failed");

    return new Response(null, {
      status: 204,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export default {
  fetch: withSupabase(
    { auth: ["publishable"] },
    async (request, context) =>
      unregisterInstallation(request, context.supabaseAdmin),
  ),
};
