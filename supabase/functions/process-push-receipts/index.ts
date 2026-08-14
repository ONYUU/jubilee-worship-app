import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  errorResponse,
  HttpError,
  jsonResponse,
  readJsonObject,
  throwForRpcError,
} from "../_shared/http.ts";
import { chunks, expoErrorCode, getExpoReceipts } from "../_shared/expo.ts";
import type { PendingReceipt, RpcClient } from "../_shared/types.ts";

function readLimit(value: unknown): number {
  const result = value === undefined ? 100 : value;
  if (
    !Number.isInteger(result) || (result as number) < 1 ||
    (result as number) > 1_000
  ) {
    throw new HttpError(
      400,
      "invalid_input",
      "limit은 1~1000 정수여야 합니다.",
    );
  }
  return result as number;
}

function readDryRun(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== "boolean") {
    throw new HttpError(400, "invalid_input", "dryRun은 boolean이어야 합니다.");
  }
  return value;
}

async function applyReceipt(
  adminClient: RpcClient,
  deliveryId: number,
  status: "ok" | "error",
  receiptId: string,
  errorCode: string | null,
): Promise<void> {
  const { error } = await adminClient.rpc("service_apply_push_receipt", {
    target_delivery_id: deliveryId,
    target_receipt_status: status,
    target_receipt_id: receiptId,
    target_error_code: errorCode,
  });
  throwForRpcError(error, "receipt_record_failed");
}

export async function processPushReceipts(
  request: Request,
  adminClient: RpcClient,
  externalSendEnabled: boolean,
  expoAccessToken?: string,
): Promise<Response> {
  try {
    const input = await readJsonObject(request);
    const limit = readLimit(input.limit);
    const dryRun = readDryRun(input.dryRun);
    if (!dryRun && !externalSendEnabled) {
      throw new HttpError(
        403,
        "external_send_disabled",
        "외부 receipt 조회는 명시적으로 활성화되지 않았습니다.",
      );
    }

    const { data, error } = await adminClient.rpc(
      "service_list_pending_push_receipts",
      {
        target_limit: limit,
      },
    );
    throwForRpcError(error, "receipt_list_failed");
    const pending = Array.isArray(data) ? data as PendingReceipt[] : [];

    let deliveredCount = 0;
    let failedCount = 0;
    let missingCount = 0;

    if (dryRun) {
      for (const receipt of pending) {
        await applyReceipt(
          adminClient,
          receipt.delivery_id,
          "ok",
          `dry-run-receipt-${receipt.delivery_id}`,
          null,
        );
        deliveredCount += 1;
      }
    } else {
      for (const batch of chunks(pending, 1_000)) {
        const receiptMap = await getExpoReceipts(
          batch.map((receipt) => receipt.expo_ticket_id),
          expoAccessToken,
        );

        for (const pendingReceipt of batch) {
          const receipt = receiptMap[pendingReceipt.expo_ticket_id];
          if (!receipt) {
            missingCount += 1;
            continue;
          }

          if (receipt.status === "ok") {
            await applyReceipt(
              adminClient,
              pendingReceipt.delivery_id,
              "ok",
              pendingReceipt.expo_ticket_id,
              null,
            );
            deliveredCount += 1;
          } else {
            await applyReceipt(
              adminClient,
              pendingReceipt.delivery_id,
              "error",
              pendingReceipt.expo_ticket_id,
              expoErrorCode(receipt),
            );
            failedCount += 1;
          }
        }
      }
    }

    return jsonResponse({
      dryRun,
      checkedCount: pending.length,
      deliveredCount,
      failedCount,
      missingCount,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export default {
  fetch: withSupabase(
    { auth: ["secret"] },
    async (request, context) =>
      processPushReceipts(
        request,
        context.supabaseAdmin,
        Deno.env.get("PUSH_EXTERNAL_SEND_ENABLED") === "true",
        Deno.env.get("EXPO_ACCESS_TOKEN"),
      ),
  ),
};
