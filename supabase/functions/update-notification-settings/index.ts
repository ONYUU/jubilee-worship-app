import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  errorResponse,
  readJsonObject,
  requiredExpoPushToken,
  requiredString,
  requiredSubscriptions,
  requiredUuid,
  sha256Hex,
  throwForRpcError,
} from "../_shared/http.ts";
import type { RpcClient } from "../_shared/types.ts";

export async function updateNotificationSettings(
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
    const appVersion = requiredString(input.appVersion, "appVersion", 64);
    const subscriptions = requiredSubscriptions(input.subscriptions);
    const expoPushToken =
      input.expoPushToken === undefined || input.expoPushToken === null
        ? null
        : requiredExpoPushToken(input.expoPushToken);

    const { error } = await adminClient.rpc("service_update_app_installation", {
      target_installation_id: installationId,
      target_secret_hash: await sha256Hex(installationSecret),
      target_app_version: appVersion,
      target_expo_push_token: expoPushToken,
      target_token_hash: expoPushToken ? await sha256Hex(expoPushToken) : null,
      target_worship_reminder: subscriptions.worshipReminder,
      target_schedule_changes: subscriptions.scheduleChanges,
      target_setlist_updates: subscriptions.setlistUpdates,
    });
    throwForRpcError(error, "settings_update_failed");

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
      updateNotificationSettings(request, context.supabaseAdmin),
  ),
};
