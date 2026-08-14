import type { RpcError } from "./http.ts";

export type RpcResult<T> = PromiseLike<{ data: T; error: RpcError | null }>;

export interface RpcClient {
  rpc(name: string, params?: Record<string, unknown>): RpcResult<unknown>;
}

export type ClaimedDelivery = {
  outbox_id: number;
  campaign_id: string;
  delivery_id: number | null;
  push_endpoint_id: string | null;
  expo_push_token: string | null;
  title: string;
  body: string;
  deep_link: string | null;
};

export type PendingReceipt = {
  delivery_id: number;
  expo_ticket_id: string;
};
