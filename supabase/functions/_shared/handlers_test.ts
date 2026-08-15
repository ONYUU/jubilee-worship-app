import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { dispatchNotifications } from "../dispatch-notifications/index.ts";
import { processPushReceipts } from "../process-push-receipts/index.ts";
import { registerInstallation } from "../register-installation/index.ts";
import { testPush } from "../test-push/index.ts";
import { unregisterInstallation } from "../unregister-installation/index.ts";
import { updateNotificationSettings } from "../update-notification-settings/index.ts";
import type { RpcClient } from "./types.ts";

type RpcCall = { name: string; params?: Record<string, unknown> };

class MockRpcClient implements RpcClient {
  readonly calls: RpcCall[] = [];

  constructor(
    private readonly respond: (
      name: string,
      params?: Record<string, unknown>,
    ) => { data: unknown; error: { code?: string; message?: string } | null },
  ) {}

  rpc(name: string, params?: Record<string, unknown>) {
    this.calls.push({ name, params });
    return Promise.resolve(this.respond(name, params));
  }
}

class MockOwnerClient extends MockRpcClient {
  constructor(
    role: "owner" | "editor" | null,
    respond: (
      name: string,
      params?: Record<string, unknown>,
    ) => { data: unknown; error: { code?: string; message?: string } | null },
  ) {
    super(respond);
    this.role = role;
  }

  private readonly role: "owner" | "editor" | null;

  from(_table: string) {
    const query = {
      select: (_columns: string) => query,
      eq: (_column: string, _value: unknown) => query,
      maybeSingle: () =>
        Promise.resolve({
          data: this.role ? { role: this.role, is_active: true } : null,
          error: null,
        }),
    };
    return query;
  }
}

function jsonRequest(value: unknown): Request {
  return new Request("http://local.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
}

Deno.test("registration returns the raw secret once and sends only its hash to Postgres", async () => {
  const client = new MockRpcClient(() => ({
    data: crypto.randomUUID(),
    error: null,
  }));
  const response = await registerInstallation(
    jsonRequest({
      platform: "ios",
      appVersion: "0.1.0",
      expoPushToken: "ExpoPushToken[local_test_token]",
      subscriptions: {
        worshipReminder: true,
        scheduleChanges: true,
        setlistUpdates: false,
      },
    }),
    client,
  );

  assertEquals(response.status, 201);
  const result = await response.json() as {
    installationId: string;
    installationSecret: string;
  };
  assertMatch(result.installationId, /^[0-9a-f-]{36}$/);
  assert(result.installationSecret.length >= 40);
  assertEquals(client.calls.length, 1);
  const params = client.calls[0].params ?? {};
  assertMatch(String(params.target_secret_hash), /^[0-9a-f]{64}$/);
  assert(params.target_secret_hash !== result.installationSecret);
  assert(!("target_installation_secret" in params));
});

Deno.test("registration rejects an invalid push token before an RPC call", async () => {
  const client = new MockRpcClient(() => ({ data: null, error: null }));
  const response = await registerInstallation(
    jsonRequest({
      platform: "android",
      appVersion: "0.1.0",
      expoPushToken: "not-a-push-token",
      subscriptions: {
        worshipReminder: false,
        scheduleChanges: false,
        setlistUpdates: false,
      },
    }),
    client,
  );
  assertEquals(response.status, 400);
  assertEquals(client.calls.length, 0);
});

Deno.test("settings update hashes a body secret before the service RPC", async () => {
  const client = new MockRpcClient(() => ({ data: null, error: null }));
  const rawSecret = "settings-secret-that-must-not-reach-postgres";
  const response = await updateNotificationSettings(
    jsonRequest({
      installationId: crypto.randomUUID(),
      installationSecret: rawSecret,
      appVersion: "0.1.1",
      subscriptions: {
        worshipReminder: false,
        scheduleChanges: true,
        setlistUpdates: true,
      },
    }),
    client,
  );
  assertEquals(response.status, 204);
  const params = client.calls[0].params ?? {};
  assertMatch(String(params.target_secret_hash), /^[0-9a-f]{64}$/);
  assert(params.target_secret_hash !== rawSecret);
  assert(!Object.values(params).includes(rawSecret));
});

Deno.test("unregister hashes a body secret before the service RPC", async () => {
  const client = new MockRpcClient(() => ({ data: null, error: null }));
  const rawSecret = "unregister-secret-that-must-not-reach-postgres";
  const response = await unregisterInstallation(
    jsonRequest({
      installationId: crypto.randomUUID(),
      installationSecret: rawSecret,
    }),
    client,
  );
  assertEquals(response.status, 204);
  const params = client.calls[0].params ?? {};
  assertMatch(String(params.target_secret_hash), /^[0-9a-f]{64}$/);
  assert(params.target_secret_hash !== rawSecret);
  assert(!Object.values(params).includes(rawSecret));
});

Deno.test("test push requires an authenticated owner and queues through owner RPCs", async () => {
  const endpointId = crypto.randomUUID();
  const campaignId = crypto.randomUUID();
  const ownerClient = new MockOwnerClient("owner", (name) => ({
    data: name === "create_notification_campaign" ? campaignId : null,
    error: null,
  }));
  const adminClient = new MockRpcClient((name) => ({
    data: name === "service_resolve_push_endpoint" ? endpointId : null,
    error: null,
  }));

  const response = await testPush(
    jsonRequest({
      installationId: crypto.randomUUID(),
      installationSecret: "test-push-secret-that-is-never-sent-to-postgres",
      title: "시험 알림",
      body: "오너 기기에만 보내는 시험 알림입니다.",
      deepLink: "jubileeworship://notifications",
    }),
    crypto.randomUUID(),
    ownerClient,
    adminClient,
  );

  assertEquals(response.status, 202);
  assertEquals(
    ownerClient.calls.map((call) => call.name),
    [
      "create_notification_campaign",
      "approve_notification_campaign",
      "queue_notification_campaign",
    ],
  );
  const endpointCall = adminClient.calls[0];
  assertEquals(endpointCall.name, "service_resolve_push_endpoint");
  assertMatch(
    String(endpointCall.params?.target_secret_hash),
    /^[0-9a-f]{64}$/,
  );
});

Deno.test("test push rejects an editor before resolving a private endpoint", async () => {
  const editorClient = new MockOwnerClient("editor", () => ({
    data: null,
    error: null,
  }));
  const adminClient = new MockRpcClient(() => ({ data: null, error: null }));

  const response = await testPush(
    jsonRequest({
      installationId: crypto.randomUUID(),
      installationSecret: "editor-secret-that-must-not-be-resolved",
      title: "시험 알림",
      body: "오너만 발송할 수 있습니다.",
    }),
    crypto.randomUUID(),
    editorClient,
    adminClient,
  );

  assertEquals(response.status, 403);
  assertEquals(editorClient.calls.length, 0);
  assertEquals(adminClient.calls.length, 0);
});

Deno.test("dispatch dry-run records a synthetic ticket without an external request", async () => {
  const campaignId = crypto.randomUUID();
  const client = new MockRpcClient((name) => {
    if (name === "service_claim_notification_outbox") {
      return {
        data: [{
          outbox_id: 1,
          campaign_id: campaignId,
          delivery_id: 7,
          push_endpoint_id: crypto.randomUUID(),
          expo_push_token: "ExpoPushToken[local_test_token]",
          title: "시험 알림",
          body: "외부로 발송하지 않습니다.",
          deep_link: "jubileeworship://worship/local",
        }],
        error: null,
      };
    }
    return { data: null, error: null };
  });

  const response = await dispatchNotifications(
    jsonRequest({ dryRun: true, campaignLimit: 1 }),
    client,
    false,
  );
  assertEquals(response.status, 200);
  const result = await response.json() as {
    providerAcceptedCount: number;
    dryRun: boolean;
  };
  assertEquals(result.dryRun, true);
  assertEquals(result.providerAcceptedCount, 1);
  const ticketCall = client.calls.find((call) =>
    call.name === "service_record_push_ticket"
  );
  assertMatch(String(ticketCall?.params?.target_ticket_id), /^dry-run-7-/);
  assert(
    client.calls.some((call) =>
      call.name === "service_finish_notification_campaign"
    ),
  );
});

Deno.test("receipt dry-run closes pending synthetic tickets locally", async () => {
  const client = new MockRpcClient((name) => {
    if (name === "service_list_pending_push_receipts") {
      return {
        data: [{ delivery_id: 9, expo_ticket_id: "dry-run-ticket-9" }],
        error: null,
      };
    }
    return { data: null, error: null };
  });

  const response = await processPushReceipts(
    jsonRequest({ dryRun: true, limit: 10 }),
    client,
    false,
  );
  assertEquals(response.status, 200);
  const result = await response.json() as {
    deliveredCount: number;
    dryRun: boolean;
  };
  assertEquals(result.dryRun, true);
  assertEquals(result.deliveredCount, 1);
  const receiptCall = client.calls.find((call) =>
    call.name === "service_apply_push_receipt"
  );
  assertEquals(receiptCall?.params?.target_receipt_id, "dry-run-receipt-9");
});

Deno.test("external send stays disabled unless the deployment switch is explicit", async () => {
  const client = new MockRpcClient(() => ({ data: [], error: null }));
  const response = await dispatchNotifications(
    jsonRequest({ dryRun: false, campaignLimit: 1 }),
    client,
    false,
  );
  assertEquals(response.status, 403);
  assertEquals(client.calls.length, 0);
});
