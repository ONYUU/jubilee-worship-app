import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  createInstallationSecret,
  errorResponse,
  jsonResponse,
  readJsonObject,
  requiredExpoPushToken,
  requiredPlatform,
  requiredString,
  requiredSubscriptions,
  sha256Hex,
  throwForRpcError,
} from "../_shared/http.ts";
import { enforceRegistrationRateLimit } from "../_shared/rate-limit.ts";
import type { RpcClient } from "../_shared/types.ts";

export async function registerInstallation(
  request: Request,
  adminClient: RpcClient,
): Promise<Response> {
  try {
    await enforceRegistrationRateLimit(request);
    const input = await readJsonObject(request);
    const platform = requiredPlatform(input.platform);
    const appVersion = requiredString(input.appVersion, "appVersion", 64);
    const expoPushToken = requiredExpoPushToken(input.expoPushToken);
    const subscriptions = requiredSubscriptions(input.subscriptions);
    const installationId = crypto.randomUUID();
    const installationSecret = createInstallationSecret();

    const { error } = await adminClient.rpc(
      "service_register_app_installation",
      {
        target_installation_id: installationId,
        target_secret_hash: await sha256Hex(installationSecret),
        target_platform: platform,
        target_app_version: appVersion,
        target_expo_push_token: expoPushToken,
        target_token_hash: await sha256Hex(expoPushToken),
        target_worship_reminder: subscriptions.worshipReminder,
        target_schedule_changes: subscriptions.scheduleChanges,
        target_setlist_updates: subscriptions.setlistUpdates,
      },
    );
    throwForRpcError(error, "registration_failed");

    return jsonResponse({ installationId, installationSecret }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export default {
  fetch: withSupabase(
    { auth: ["publishable"] },
    async (request, context) =>
      registerInstallation(request, context.supabaseAdmin),
  ),
};
