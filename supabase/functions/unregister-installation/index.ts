import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { errorResponse, HttpError } from "../_shared/http.ts";
import type { RpcClient } from "../_shared/types.ts";

export async function unregisterInstallation(
  request: Request,
  _adminClient: RpcClient,
): Promise<Response> {
  void request;
  return errorResponse(
    new HttpError(
      410,
      "direct_data_api_required",
      "이 알림 해제 경로는 종료되었습니다. 최신 앱을 사용해 주세요.",
    ),
  );
}

export default {
  fetch: withSupabase(
    { auth: ["publishable"] },
    async (request, context) =>
      unregisterInstallation(request, context.supabaseAdmin),
  ),
};
