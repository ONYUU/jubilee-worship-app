import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { approveTestPushPairing } from "../approve-test-push-pairing/index.ts";
import { createTestPushPairing } from "../create-test-push-pairing/index.ts";
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
      appVariant: "preview",
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
  assertEquals(params.target_app_variant, "preview");
  assert(params.target_secret_hash !== result.installationSecret);
  assert(!("target_installation_secret" in params));
});

Deno.test("registration rejects an invalid push token before an RPC call", async () => {
  const client = new MockRpcClient(() => ({ data: null, error: null }));
  const response = await registerInstallation(
    jsonRequest({
      platform: "android",
      appVersion: "0.1.0",
      appVariant: "development",
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

Deno.test("registration rejects a missing or invalid app variant before an RPC call", async () => {
  for (const appVariant of [undefined, "staging"]) {
    const client = new MockRpcClient(() => ({ data: null, error: null }));
    const response = await registerInstallation(
      jsonRequest({
        platform: "ios",
        appVersion: "0.1.0",
        ...(appVariant === undefined ? {} : { appVariant }),
        expoPushToken: "ExpoPushToken[variant_validation_token]",
        subscriptions: {
          worshipReminder: true,
          scheduleChanges: false,
          setlistUpdates: false,
        },
      }),
      client,
    );
    assertEquals(response.status, 400);
    assertEquals(client.calls.length, 0);
  }
});

Deno.test("settings update hashes a body secret before the service RPC", async () => {
  const client = new MockRpcClient(() => ({ data: null, error: null }));
  const rawSecret = "settings-secret-that-must-not-reach-postgres";
  const response = await updateNotificationSettings(
    jsonRequest({
      installationId: crypto.randomUUID(),
      installationSecret: rawSecret,
      appVersion: "0.1.1",
      appVariant: "production",
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
  assertEquals(params.target_app_variant, "production");
  assert(params.target_secret_hash !== rawSecret);
  assert(!Object.values(params).includes(rawSecret));
});

Deno.test("settings update rejects an invalid app variant before an RPC call", async () => {
  const client = new MockRpcClient(() => ({ data: null, error: null }));
  const response = await updateNotificationSettings(
    jsonRequest({
      installationId: crypto.randomUUID(),
      installationSecret: "settings-secret-that-must-not-reach-postgres",
      appVersion: "0.1.1",
      appVariant: "staging",
      subscriptions: {
        worshipReminder: true,
        scheduleChanges: false,
        setlistUpdates: false,
      },
    }),
    client,
  );
  assertEquals(response.status, 400);
  assertEquals(client.calls.length, 0);
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

Deno.test("a non-production installation creates one HMAC-bound pairing code", async () => {
  const expiresAt = "2035-06-15T10:10:00.000Z";
  const client = new MockRpcClient((name) => ({
    data: name === "service_create_test_push_pairing" ? expiresAt : null,
    error: null,
  }));
  const installationId = crypto.randomUUID();
  const installationSecret = "device-secret-that-never-reaches-the-database";
  const response = await createTestPushPairing(
    jsonRequest({
      installationId,
      installationSecret,
      appVariant: "development",
    }),
    client,
    "pairing-pepper-that-stays-server-only-1234567890",
  );

  assertEquals(response.status, 201);
  const result = await response.json() as {
    pairingCode: string;
    expiresAt: string;
    appVariant: string;
  };
  assertMatch(
    result.pairingCode,
    /^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){2}$/,
  );
  assertEquals(result.expiresAt, expiresAt);
  assertEquals(result.appVariant, "development");
  assertEquals(client.calls.map((call) => call.name), [
    "service_create_test_push_pairing",
  ]);
  const params = client.calls[0].params ?? {};
  assertEquals(params.target_installation_id, installationId);
  assertMatch(String(params.target_secret_hash), /^[0-9a-f]{64}$/);
  assertMatch(String(params.target_code_digest), /^[0-9a-f]{64}$/);
  assert(params.target_secret_hash !== installationSecret);
  assert(params.target_code_digest !== result.pairingCode);
  assert(!Object.values(params).includes(installationSecret));
  assert(!Object.values(params).includes(result.pairingCode));
});

Deno.test("pairing creation rejects production before its service RPC", async () => {
  const client = new MockRpcClient(() => ({ data: null, error: null }));
  const response = await createTestPushPairing(
    jsonRequest({
      installationId: crypto.randomUUID(),
      installationSecret: "device-secret-that-never-reaches-the-database",
      appVariant: "production",
    }),
    client,
    "pairing-pepper-that-stays-server-only-1234567890",
  );
  assertEquals(response.status, 400);
  assertEquals(client.calls.length, 0);
});

Deno.test("pairing creation fails closed without its server pepper", async () => {
  const client = new MockRpcClient(() => ({ data: null, error: null }));
  const response = await createTestPushPairing(
    jsonRequest({
      installationId: crypto.randomUUID(),
      installationSecret: "device-secret-that-never-reaches-the-database",
      appVariant: "preview",
    }),
    client,
    "",
  );
  assertEquals(response.status, 503);
  assertEquals(client.calls.length, 0);
});

Deno.test("an authenticated owner approves a raw pairing code through one HMAC-only RPC", async () => {
  const client = new MockOwnerClient("owner", () => ({
    data: true,
    error: null,
  }));
  const rawCode = "0123-4567-89AB";
  const response = await approveTestPushPairing(
    jsonRequest({ pairingCode: rawCode }),
    crypto.randomUUID(),
    client,
    "pairing-pepper-that-stays-server-only-1234567890",
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { status: "approved" });
  assertEquals(client.calls.map((call) => call.name), [
    "approve_owner_test_push_target",
  ]);
  const params = client.calls[0].params ?? {};
  assertMatch(String(params.target_code_digest), /^[0-9a-f]{64}$/);
  assert(!Object.values(params).includes(rawCode));
  assert(!Object.keys(params).some((key) => /secret|pepper/i.test(key)));
});

Deno.test("pairing approval checks owner before parsing or calling its RPC", async () => {
  const client = new MockOwnerClient("editor", () => ({
    data: null,
    error: null,
  }));
  const response = await approveTestPushPairing(
    new Request("http://local.test", { method: "GET" }),
    crypto.randomUUID(),
    client,
    "pairing-pepper-that-stays-server-only-1234567890",
  );
  assertEquals(response.status, 403);
  assertEquals(client.calls.length, 0);
});

Deno.test("pairing approval maps expired and reused codes to one non-disclosing conflict", async () => {
  const client = new MockOwnerClient("owner", () => ({
    data: false,
    error: null,
  }));
  const response = await approveTestPushPairing(
    jsonRequest({ pairingCode: "0123-4567-89AB" }),
    crypto.randomUUID(),
    client,
    "pairing-pepper-that-stays-server-only-1234567890",
  );
  assertEquals(response.status, 409);
  assertEquals(await response.json(), {
    error: "pairing_code_unavailable",
    message: "연결 코드가 만료됐거나 이미 사용됐습니다.",
  });
});

Deno.test("test push requires an authenticated owner and queues one explicit non-production target", async () => {
  const requestId = crypto.randomUUID();
  const endpointId = crypto.randomUUID();
  const campaignId = crypto.randomUUID();
  const ownerClient = new MockOwnerClient("owner", (name) => ({
    data: name === "queue_owner_test_push" ? campaignId : null,
    error: null,
  }));

  const response = await testPush(
    jsonRequest({
      requestId,
      pushEndpointId: endpointId,
      appVariant: "development",
      title: "시험 알림",
      body: "오너 기기에만 보내는 시험 알림입니다.",
      deepLink: "jubileeworship://notifications",
    }),
    crypto.randomUUID(),
    ownerClient,
  );

  assertEquals(response.status, 202);
  assertEquals(await response.json(), {
    campaignId,
  });
  assertEquals(ownerClient.calls.map((call) => call.name), [
    "queue_owner_test_push",
  ]);
  assertEquals(ownerClient.calls[0].params, {
    target_request_id: requestId,
    target_push_endpoint_id: endpointId,
    target_app_variant: "development",
    target_title: "시험 알림",
    target_body: "오너 기기에만 보내는 시험 알림입니다.",
    target_deep_link: "jubileeworship://notifications",
  });
  assert(
    !Object.keys(ownerClient.calls[0].params ?? {}).some((key) =>
      key.toLowerCase().includes("secret") ||
      key.toLowerCase().includes("token")
    ),
  );
});

Deno.test("test push rejects an unauthenticated request before parsing or RPC access", async () => {
  const client = new MockOwnerClient("owner", () => ({
    data: null,
    error: null,
  }));

  const response = await testPush(
    new Request("http://local.test", { method: "GET" }),
    null,
    client,
  );

  assertEquals(response.status, 401);
  assertEquals(client.calls.length, 0);
});

Deno.test("test push rejects an editor before queueing a private endpoint", async () => {
  const editorClient = new MockOwnerClient("editor", () => ({
    data: null,
    error: null,
  }));

  const response = await testPush(
    jsonRequest({
      requestId: crypto.randomUUID(),
      pushEndpointId: crypto.randomUUID(),
      appVariant: "preview",
      title: "시험 알림",
      body: "오너만 발송할 수 있습니다.",
    }),
    crypto.randomUUID(),
    editorClient,
  );

  assertEquals(response.status, 403);
  assertEquals(editorClient.calls.length, 0);
});

Deno.test("test push rejects production before queueing an owner RPC", async () => {
  const ownerClient = new MockOwnerClient("owner", () => ({
    data: null,
    error: null,
  }));
  const response = await testPush(
    jsonRequest({
      requestId: crypto.randomUUID(),
      pushEndpointId: crypto.randomUUID(),
      appVariant: "production",
      title: "시험 알림",
      body: "운영 앱은 시험 대상에서 제외합니다.",
    }),
    crypto.randomUUID(),
    ownerClient,
  );

  assertEquals(response.status, 400);
  assertEquals(ownerClient.calls.length, 0);
});

Deno.test("test push maps an unavailable target to one refresh-safe conflict", async () => {
  const ownerClient = new MockOwnerClient("owner", () => ({
    data: null,
    error: { code: "P0002", message: "private target detail" },
  }));
  const response = await testPush(
    jsonRequest({
      requestId: crypto.randomUUID(),
      pushEndpointId: crypto.randomUUID(),
      appVariant: "preview",
      title: "시험 알림",
      body: "더 이상 활성 상태가 아닌 기기입니다.",
    }),
    crypto.randomUUID(),
    ownerClient,
  );

  assertEquals(response.status, 409);
  assertEquals(await response.json(), {
    error: "test_target_unavailable",
    message: "선택한 시험 기기를 더 이상 사용할 수 없습니다.",
  });
  assertEquals(ownerClient.calls.map((call) => call.name), [
    "queue_owner_test_push",
  ]);
});

Deno.test("test push rejects request UUID replay with a mismatched payload", async () => {
  const ownerClient = new MockOwnerClient("owner", () => ({
    data: null,
    error: { code: "23505", message: "private dedupe detail" },
  }));
  const response = await testPush(
    jsonRequest({
      requestId: crypto.randomUUID(),
      pushEndpointId: crypto.randomUUID(),
      appVariant: "development",
      title: "충돌 시험",
      body: "같은 요청 UUID의 다른 내용은 거부합니다.",
    }),
    crypto.randomUUID(),
    ownerClient,
  );

  assertEquals(response.status, 409);
  assertEquals(await response.json(), {
    error: "test_request_conflict",
    message: "같은 시험 요청 식별값에 다른 내용이 이미 등록됐습니다.",
  });
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
