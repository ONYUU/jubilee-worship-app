import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  errorResponse,
  HttpError,
  jsonResponse,
  readJsonObject,
  throwForRpcError,
} from "../_shared/http.ts";
import { chunks, expoErrorCode, sendExpoMessages } from "../_shared/expo.ts";
import type { ClaimedDelivery, RpcClient } from "../_shared/types.ts";

function readCampaignLimit(value: unknown): number {
  const result = value === undefined ? 1 : value;
  if (
    !Number.isInteger(result) || (result as number) < 1 ||
    (result as number) > 10
  ) {
    throw new HttpError(
      400,
      "invalid_input",
      "campaignLimit은 1~10 정수여야 합니다.",
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

async function recordTicket(
  adminClient: RpcClient,
  deliveryId: number,
  status: "ok" | "error",
  ticketId: string | null,
  errorCode: string | null,
): Promise<void> {
  const { error } = await adminClient.rpc("service_record_push_ticket", {
    target_delivery_id: deliveryId,
    target_ticket_status: status,
    target_ticket_id: ticketId,
    target_error_code: errorCode,
  });
  throwForRpcError(error, "ticket_record_failed");
}

async function finishCampaign(
  adminClient: RpcClient,
  campaignId: string,
  success: boolean,
  errorCode: string | null,
): Promise<void> {
  const { error } = await adminClient.rpc(
    "service_finish_notification_campaign",
    {
      target_campaign_id: campaignId,
      target_success: success,
      target_error_code: errorCode,
    },
  );
  throwForRpcError(error, "campaign_finish_failed");
}

export async function dispatchNotifications(
  request: Request,
  adminClient: RpcClient,
  externalSendEnabled: boolean,
  expoAccessToken?: string,
): Promise<Response> {
  try {
    const input = await readJsonObject(request);
    const campaignLimit = readCampaignLimit(input.campaignLimit);
    const dryRun = readDryRun(input.dryRun);
    if (!dryRun && !externalSendEnabled) {
      throw new HttpError(
        403,
        "external_send_disabled",
        "외부 push 발송은 명시적으로 활성화되지 않았습니다.",
      );
    }

    const { data, error } = await adminClient.rpc(
      "service_claim_notification_outbox",
      {
        target_worker_id: `edge:${crypto.randomUUID()}`,
        target_campaign_limit: campaignLimit,
      },
    );
    throwForRpcError(error, "outbox_claim_failed");
    const claimed = Array.isArray(data) ? data as ClaimedDelivery[] : [];

    const campaigns = new Map<string, ClaimedDelivery[]>();
    for (const row of claimed) {
      const rows = campaigns.get(row.campaign_id) ?? [];
      rows.push(row);
      campaigns.set(row.campaign_id, rows);
    }

    let deliveryCount = 0;
    let providerAcceptedCount = 0;
    let failedCount = 0;

    for (const [campaignId, rows] of campaigns) {
      const deliveries = rows.filter(
        (
          row,
        ): row is ClaimedDelivery & {
          delivery_id: number;
          expo_push_token: string;
        } =>
          typeof row.delivery_id === "number" &&
          typeof row.expo_push_token === "string",
      );
      deliveryCount += deliveries.length;

      try {
        if (dryRun) {
          for (const delivery of deliveries) {
            await recordTicket(
              adminClient,
              delivery.delivery_id,
              "ok",
              `dry-run-${delivery.delivery_id}-${crypto.randomUUID()}`,
              null,
            );
            providerAcceptedCount += 1;
          }
        } else {
          for (const batch of chunks(deliveries, 100)) {
            const tickets = await sendExpoMessages(
              batch.map((delivery) => ({
                to: delivery.expo_push_token,
                title: delivery.title,
                body: delivery.body,
                ...(delivery.deep_link
                  ? { data: { url: delivery.deep_link } }
                  : {}),
              })),
              expoAccessToken,
            );

            for (let index = 0; index < batch.length; index += 1) {
              const delivery = batch[index];
              const ticket = tickets[index];
              if (ticket.status === "ok" && typeof ticket.id === "string") {
                await recordTicket(
                  adminClient,
                  delivery.delivery_id,
                  "ok",
                  ticket.id,
                  null,
                );
                providerAcceptedCount += 1;
              } else {
                await recordTicket(
                  adminClient,
                  delivery.delivery_id,
                  "error",
                  null,
                  expoErrorCode(ticket),
                );
                failedCount += 1;
              }
            }
          }
        }
        await finishCampaign(adminClient, campaignId, true, null);
      } catch {
        for (const delivery of deliveries) {
          try {
            await recordTicket(
              adminClient,
              delivery.delivery_id,
              "error",
              null,
              "ProviderUnavailable",
            );
            failedCount += 1;
          } catch {
            // A delivery already recorded before the batch failure is intentionally left intact.
          }
        }
        await finishCampaign(
          adminClient,
          campaignId,
          false,
          "ProviderUnavailable",
        );
      }
    }

    return jsonResponse({
      dryRun,
      campaignCount: campaigns.size,
      deliveryCount,
      providerAcceptedCount,
      failedCount,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export default {
  fetch: withSupabase(
    { auth: ["secret"] },
    async (request, context) =>
      dispatchNotifications(
        request,
        context.supabaseAdmin,
        Deno.env.get("PUSH_EXTERNAL_SEND_ENABLED") === "true",
        Deno.env.get("EXPO_ACCESS_TOKEN"),
      ),
  ),
};
