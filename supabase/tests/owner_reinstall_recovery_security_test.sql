begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(52);

create function pg_temp.store_ready_privacy_body()
returns text
language sql
as $$
  select E'쥬빌리 워십 설치 식별자 푸시 토큰 알림 선택 보유 비활성화\n'
    || E'개인정보 및 앱 이용 문의: sundoojubileeworship@gmail.com\n'
    || E'알림 제공에만 사용합니다. 종교적 관심을 추론할 수 있어 별도 동의를 받고 동의 버전과 동의 시각을 기록합니다. 「개인정보 보호법」 제15조제1항제1호 및 제23조제1항제1호(민감정보 별도 동의)를 근거로 합니다. 이름·이메일·광고 식별자와 결합하지 않고 광고·추적·이용자 프로파일링에 사용하지 않습니다. 수신 알림은 기기에 최대 50건·90일 저장하고 서버로 다시 전송하지 않습니다. 자동화된 결정을 하지 않고 광고 SDK를 사용하지 않습니다.\n'
    || E'SUPABASE PTE. LTD. 대한민국 서울(ap-northeast-2) Supabase Data API 분산 요청 제한 검증값은 재사용할 수 없도록 해시합니다. 신규 등록은 하루 100회, 전체 하루 500회로 제한하며 일일 카운터는 최대 25시간 5분 보유됩니다. 650 Industries, Inc. Expo Apple·Google 처리 미국 만 14세\n'
    || E'공개 콘텐츠·보안 로그의 실제 처리 항목과 보유기간: IP·요청 경로 로그 30일\n공개 콘텐츠·보안 로그 처리의 법적 근거: 개인정보보호법 시험 근거\n비활성 정보 보유 기간: 30일\n발송 기록 보유 기간: 90일\n정기 삭제 주기: 매일 1회\n기기 내 저장 자료의 삭제 방법과 운영체제 백업·재설치 설정: 앱 데이터 삭제와 재설치 검증 기록\nSupabase 수신자 연락처: privacy@example.invalid\nExpo 수신자 연락처: privacy@example.invalid\nApple·Google 수신자 연락처 또는 정책 확인 경로: https://example.invalid/privacy\n수탁자: 시험 처리자\n이전 국가: 시험 국가\n이전 항목: 알림 정보\n이전 시점 및 방법: 동의 후 HTTPS 전송\n국외 처리 보유 기간: 30일\n이전 거부 방법 및 효과: 알림 해제 시 알림 중단\n'
    || E'개인정보 처리자의 법적 성명 또는 명칭: 시험 운영자\n개인정보 보호책임자 또는 고충처리 담당부서: 개인정보팀\n전화번호 등 연락처: 032-000-0000\n국외 처리 법적 근거(법률 검토 후 확정): 개인정보보호법 시험 근거\n권리행사 접수·본인 또는 정당한 대리인 확인·처리·회신 방법: 지원 메일 접수 후 설치 증명값 확인\n지원 문의 처리의 법적 근거: 개인정보보호법 시험 근거\n지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) sundoojubileeworship@gmail.com\n지원 이메일 공급자의 법적 역할·처리 근거: 수탁 처리 및 문의 응대 근거\n지원 이메일 공급자의 처리 국가: 시험 국가\n지원 문의 보유·삭제 기준: 해결 후 90일\n지원 문의 보유·삭제 운영 증빙: 매월 1일 삭제 대상 점검 기록\n알림의 만 14세 이상 제한 또는 법정대리인 동의 절차: 법정대리인 서면 절차\n실제 시행일: 2026-09-01\n오너 최종 사실확인: 2026-09-01 서면 승인\n법률 전문가 검토 상태: 2026-09-01 의견서 수령';
$$;

-- 1-6: private store, explicit RPC surface, and role boundaries.
select has_table(
  'private', 'notification_reinstall_recovery_challenges',
  'recovery challenges use private storage'
);
select ok(
  (select relrowsecurity from pg_class
   where oid = 'private.notification_reinstall_recovery_challenges'::regclass),
  'the private challenge table has RLS enabled'
);
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name = 'notification_reinstall_recovery_challenges'
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ),
  0::bigint,
  'application roles have no direct challenge privileges'
);
select is(
  (
    select count(*)
    from information_schema.table_constraints as constraint_info
    join information_schema.key_column_usage as key_info
      on key_info.constraint_schema = constraint_info.constraint_schema
      and key_info.constraint_name = constraint_info.constraint_name
    where constraint_info.table_schema = 'private'
      and constraint_info.table_name = 'notification_reinstall_recovery_challenges'
      and constraint_info.constraint_type = 'FOREIGN KEY'
      and key_info.column_name = 'decided_by'
  ),
  0::bigint,
  'the bounded owner UUID audit snapshot cannot be nulled or blocked by auth deletion'
);
select is(
  (
    select count(*)
    from unnest(array[
      to_regprocedure('public.notification_request_reinstall_recovery_v1(uuid,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,text)'),
      to_regprocedure('public.notification_cancel_reinstall_recovery_v1(uuid,text,text)'),
      to_regprocedure('public.notification_finalize_reinstall_recovery_v1(uuid,text,text,text,text,text,text,boolean,boolean,boolean,boolean)'),
      to_regprocedure('public.list_owner_reinstall_recovery_challenges()'),
      to_regprocedure('public.approve_owner_reinstall_recovery(uuid,text)'),
      to_regprocedure('public.reject_owner_reinstall_recovery(uuid)'),
      to_regprocedure('public.service_cleanup_reinstall_recovery_challenges(timestamptz)')
    ]) as function_oid
    where function_oid is not null
  ),
  7::bigint,
  'all seven recovery RPCs exist'
);
select ok(
  has_function_privilege(
    'anon',
    'public.notification_request_reinstall_recovery_v1(uuid,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,text)',
    'EXECUTE'
  )
  and has_function_privilege(
    'anon', 'public.notification_cancel_reinstall_recovery_v1(uuid,text,text)',
    'EXECUTE'
  )
  and has_function_privilege(
    'anon',
    'public.notification_finalize_reinstall_recovery_v1(uuid,text,text,text,text,text,text,boolean,boolean,boolean,boolean)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.notification_finalize_reinstall_recovery_v1(uuid,text,text,text,text,text,text,boolean,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'only anon can enter client recovery RPCs'
);
select ok(
  has_function_privilege(
    'authenticated', 'public.approve_owner_reinstall_recovery(uuid,text)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.approve_owner_reinstall_recovery(uuid,text)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.service_cleanup_reinstall_recovery_challenges(timestamptz)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.service_cleanup_reinstall_recovery_challenges(timestamptz)',
    'EXECUTE'
  ),
  'admin and cleanup RPCs retain their narrow role boundaries'
);

insert into auth.users (id, email)
values
  ('71000000-0000-4000-8000-000000000001', 'recovery-owner@example.invalid'),
  ('71000000-0000-4000-8000-000000000002', 'recovery-editor@example.invalid'),
  ('71000000-0000-4000-8000-000000000003', 'recovery-policy@example.invalid');
insert into public.admin_users (user_id, role, is_active)
values
  ('71000000-0000-4000-8000-000000000001', 'owner', true),
  ('71000000-0000-4000-8000-000000000002', 'editor', true);
insert into public.legal_documents (
  document_type, version, title, body, effective_on
) values (
  'privacy_policy', 'recovery-store-ready', '개인정보처리방침',
  pg_temp.store_ready_privacy_body(), current_date
);
update public.legal_documents
set status = 'published',
    published_at = statement_timestamp(),
    published_by = '71000000-0000-4000-8000-000000000003'
where version = 'recovery-store-ready';
select public.service_set_notification_registration_enabled(true);

-- Five wrong owner codes exhaust the one-time approval verifier and scrub it.
delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.78',
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-wrong-code-limit]'
  )::text,
  true
);
select public.notification_register_v2(
  '72000000-0000-4000-8000-000000000014',
  repeat('6', 64), repeat('7', 64),
  'ios', '0.7.0+12', 'preview',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, true, false, false
);
select public.notification_request_reinstall_recovery_v1(
  '72000000-0000-4000-8000-000000000015',
  private.sha256_hex(repeat('8', 64)), repeat('9', 64),
  'ios', '0.7.1+13', 'preview',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, true, false, false, repeat('a', 64)
);
create temporary table wrong_code_recovery on commit drop as
select id from private.notification_reinstall_recovery_challenges
where target_installation_id = '72000000-0000-4000-8000-000000000015'
  and status = 'pending';
grant select on wrong_code_recovery to authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;
select is(
  (
    select count(*)
    from generate_series(1, 5)
    where public.approve_owner_reinstall_recovery(
      (select id from wrong_code_recovery), repeat('b', 64)
    ) is false
  ),
  5::bigint,
  'five wrong owner codes are rejected'
);
reset role;
select ok(
  (
    select status = 'expired'
      and failed_approval_attempts = 5
      and recovery_code_digest is null
      and target_secret_store_hash is null
      and source_token_hash is null
    from private.notification_reinstall_recovery_challenges
    where id = (select id from wrong_code_recovery)
  ),
  'the fifth wrong code terminally scrubs reusable recovery verifiers'
);

-- Primary relink: owner authorizes, device atomically finalizes current prefs.
delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.71',
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-preview-a]'
  )::text,
  true
);
select is(
  public.notification_register_v2(
    '72000000-0000-4000-8000-000000000001',
    repeat('1', 64), repeat('2', 64),
    'android', '0.1.0+1', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true, true, false, false
  ) ->> 'status',
  'ok',
  'the old preview source is registered'
);
select is(
  public.notification_register_v2(
    '72000000-0000-4000-8000-000000000002',
    private.sha256_hex(repeat('a', 64)), repeat('4', 64),
    'android', '0.1.1+2', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true, true, true, false
  ) ->> 'code',
  '23505',
  'token possession cannot directly take over the old installation'
);
select is(
  public.notification_request_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000002',
    private.sha256_hex(repeat('a', 64)), repeat('4', 64),
    'android', '0.1.1+2', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true, true, true, false, repeat('c', 64)
  ) ->> 'status',
  'pending_owner_approval',
  'the device creates a short-lived owner request'
);
select ok(
  (
    select source_token_hash = private.sha256_hex('ExpoPushToken[recovery-preview-a]')
      and target_secret_store_hash = private.sha256_hex(repeat('a', 64))
      and target_pairing_store_hash = repeat('4', 64)
      and unlink_binding_digest ~ '^[0-9a-f]{64}$'
      and recovery_code_digest = repeat('c', 64)
      and source_token_hash <> 'ExpoPushToken[recovery-preview-a]'
    from private.notification_reinstall_recovery_challenges
    where target_installation_id = '72000000-0000-4000-8000-000000000002'
      and status = 'pending'
  ),
  'pending storage has bounded verifiers and never a raw token'
);
create temporary table primary_recovery on commit drop as
select id
from private.notification_reinstall_recovery_challenges
where target_installation_id = '72000000-0000-4000-8000-000000000002'
  and status = 'pending';
grant select on primary_recovery to authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;
select throws_ok(
  $$select * from public.list_owner_reinstall_recovery_challenges()$$,
  '42501', 'Active owner access required',
  'an editor cannot list recovery targets'
);
select throws_ok(
  $$select public.approve_owner_reinstall_recovery(
    (select id from primary_recovery), repeat('c', 64)
  )$$,
  '42501', 'Active owner access required',
  'an editor cannot authorize recovery'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;
select ok(
  (
    select source_display_label not like '%ExpoPushToken%'
      and target_display_label not like '%ExpoPushToken%'
      and source_display_label not like '%앱 %'
      and target_display_label not like '%앱 %'
      and source_display_label ~ '이전 기기 …[0-9A-F]{12}$'
      and target_display_label ~ '새 설치 …[0-9A-F]{12}$'
    from public.list_owner_reinstall_recovery_challenges()
  ),
  'the owner sees masked comparison labels only'
);
select is(
  public.approve_owner_reinstall_recovery(
    (select id from primary_recovery), repeat('c', 64)
  ),
  true,
  'the owner authorizes the exact code'
);
reset role;
select ok(
  (
    select status = 'authorized'
      and source_token_hash is not null
      and target_secret_store_hash = private.sha256_hex(repeat('a', 64))
      and target_pairing_store_hash = repeat('4', 64)
      and target_consent_version is null
      and target_worship_reminder is null
      and recovery_code_digest is null
    from private.notification_reinstall_recovery_challenges
    where id = (select id from primary_recovery)
  )
  and exists (
    select 1
    from private.app_installations as installation
    join private.push_endpoints as endpoint on endpoint.installation_id = installation.id
    where installation.id = '72000000-0000-4000-8000-000000000001'
      and installation.disabled_at is null
      and endpoint.expo_push_token = 'ExpoPushToken[recovery-preview-a]'
      and endpoint.is_active is true
  )
  and not exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000002'
  ),
  'authorization scrubs stale prefs, preserves token reservation, and creates no target'
);
select is(
  public.notification_register_v2(
    '72000000-0000-4000-8000-000000000099',
    repeat('8', 64), repeat('9', 64),
    'android', 'attacker', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true, true, false, false
  ) ->> 'code',
  '23505',
  'normal registration cannot race ahead of authorized finalize'
);
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.71',
    'x-jubilee-installation-proof', repeat('b', 64),
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-preview-a]'
  )::text,
  true
);
select is(
  public.notification_finalize_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000002',
    'android', '0.1.1+2', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true, true, false, false
  ) ->> 'code',
  'RECOVERY_NOT_AUTHORIZED',
  'a wrong target proof cannot finalize'
);
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.71',
    'x-jubilee-installation-proof', repeat('a', 64),
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-preview-a]'
  )::text,
  true
);
select is(
  public.notification_finalize_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000002',
    'android', '0.1.1+2', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true, true, false, false
  ) ->> 'status',
  'ok',
  'the device atomically finalizes with current partial preferences'
);
select ok(
  (
    select installation.secret_hash = private.sha256_hex(repeat('a', 64))
      and installation.test_pairing_secret_hash = repeat('4', 64)
      and subscription.worship_reminder is true
      and subscription.schedule_changes is false
      and subscription.setlist_updates is false
      and endpoint.expo_push_token = 'ExpoPushToken[recovery-preview-a]'
      and endpoint.is_active is true
    from private.app_installations as installation
    join private.notification_subscriptions as subscription
      on subscription.installation_id = installation.id
    join private.push_endpoints as endpoint
      on endpoint.installation_id = installation.id
    where installation.id = '72000000-0000-4000-8000-000000000002'
  ),
  'finalize uses current device prefs rather than the stale request snapshot'
);
select ok(
  (
    select disabled_at is not null
      and disable_reason = 'owner_reinstall_recovery'
      and secret_hash <> repeat('1', 64)
      and sensitive_interest_consent_version is null
    from private.app_installations
    where id = '72000000-0000-4000-8000-000000000001'
  )
  and exists (
    select 1 from private.push_endpoints
    where installation_id = '72000000-0000-4000-8000-000000000001'
      and expo_push_token is null
      and token_hash is null
      and is_active is false
  ),
  'atomic finalize rotates and scrubs the old source'
);
select ok(
  (
    select status = 'approved'
      and source_token_hash is null
      and target_secret_store_hash is null
      and target_pairing_store_hash is null
      and recovery_code_digest is null
      and unlink_binding_digest ~ '^[0-9a-f]{64}$'
      and decided_by = '71000000-0000-4000-8000-000000000001'
    from private.notification_reinstall_recovery_challenges
    where id = (select id from primary_recovery)
  ),
  'approved audit scrubs reusable verifiers and keeps unlink-only metadata'
);
select is(
  public.notification_finalize_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000002',
    'android', '0.1.1+2', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true, true, false, false
  ) ->> 'status',
  'ok',
  'finalize is idempotent after a local commit-marker crash'
);

select public.service_set_notification_registration_enabled(false);
select is(
  public.notification_cancel_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000002', 'android', 'preview'
  ) ->> 'status',
  'withdrawn',
  'cancel works after finalize even while registration is disabled'
);
select ok(
  exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000002'
      and disabled_at is not null
      and sensitive_interest_consent_version is null
  )
  and exists (
    select 1 from private.push_endpoints
    where installation_id = '72000000-0000-4000-8000-000000000002'
      and expo_push_token is null
      and token_hash is null
      and is_active is false
  )
  and exists (
    select 1 from private.notification_subscriptions
    where installation_id = '72000000-0000-4000-8000-000000000002'
      and worship_reminder is false
      and schedule_changes is false
      and setlist_updates is false
  ),
  'cancel scrubs recovered target token, consent, and subscriptions'
);
select is(
  public.notification_cancel_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000002', 'android', 'preview'
  ) ->> 'status',
  'withdrawn',
  'a repeated matching unlink is idempotent'
);
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.79',
    'x-jubilee-installation-proof', repeat('f', 64),
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-unknown]'
  )::text,
  true
);
select is(
  public.notification_cancel_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000099', 'android', 'preview'
  ) ->> 'code',
  'RECOVERY_UNLINK_NOT_AVAILABLE',
  'unknown unlink is never acknowledged as successful'
);
select is(
  public.notification_cancel_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000099', 'android', 'production'
  ) ->> 'code',
  '28000',
  'production cancellation is blocked'
);

-- Pending cancellation revokes source, challenge, and queued test work.
select public.service_set_notification_registration_enabled(true);
delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.72',
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-preview-b]'
  )::text,
  true
);
select public.notification_register_v2(
  '72000000-0000-4000-8000-000000000003',
  repeat('5', 64), repeat('6', 64),
  'ios', '0.2.0+3', 'preview',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, true, false, false
);
create temporary table pending_cancel_source on commit drop as
select id from private.push_endpoints
where installation_id = '72000000-0000-4000-8000-000000000003';
insert into private.owner_test_push_targets (
  push_endpoint_id, app_variant_snapshot, approved_by, approved_at
)
select id, 'preview', '71000000-0000-4000-8000-000000000001', statement_timestamp()
from pending_cancel_source;
insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, test_push_endpoint_id,
  status, dedupe_key, approved_at, approved_by, queued_at
)
select
  '73000000-0000-4000-8000-000000000001', 'test',
  '복구 철회 시험', '대기 작업', 'test_endpoint', id,
  'queued', 'recovery-cancel-test', statement_timestamp(),
  '71000000-0000-4000-8000-000000000001', statement_timestamp()
from pending_cancel_source;
insert into private.notification_outbox (
  campaign_id, dedupe_key, status
) values (
  '73000000-0000-4000-8000-000000000001',
  'recovery-cancel-test', 'pending'
);
select public.notification_request_reinstall_recovery_v1(
  '72000000-0000-4000-8000-000000000004',
  private.sha256_hex(repeat('c', 64)), repeat('7', 64),
  'ios', '0.2.1+4', 'preview',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, true, false, true, repeat('8', 64)
);
create temporary table pending_cancel_challenge on commit drop as
select id from private.notification_reinstall_recovery_challenges
where target_installation_id = '72000000-0000-4000-8000-000000000004'
  and status = 'pending';
grant select on pending_cancel_challenge to authenticated;
update private.push_endpoints
set expo_push_token = 'ExpoPushToken[recovery-preview-b-rotated]',
    token_hash = private.sha256_hex('ExpoPushToken[recovery-preview-b-rotated]')
where id = (select id from pending_cancel_source);
select is(
  (
    select expo_push_token
    from private.push_endpoints
    where id = (select id from pending_cancel_source)
  ),
  'ExpoPushToken[recovery-preview-b-rotated]',
  'the old source can rotate its token while owner recovery is pending'
);
select public.service_set_notification_registration_enabled(false);
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.72',
    'x-jubilee-installation-proof', repeat('c', 64),
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-preview-b]'
  )::text,
  true
);
select is(
  public.notification_cancel_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000004', 'ios', 'preview'
  ) ->> 'status',
  'withdrawn',
  'pending cancellation bypasses the registration gate'
);
select ok(
  (
    select status = 'withdrawn'
      and source_token_hash is null
      and target_secret_store_hash is null
      and recovery_code_digest is null
    from private.notification_reinstall_recovery_challenges
    where id = (select id from pending_cancel_challenge)
  )
  and exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000003'
      and disabled_at is not null
  )
  and not exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000004'
  )
  and not exists (
    select 1 from private.owner_test_push_targets
    where push_endpoint_id = (select id from pending_cancel_source)
  )
  and exists (
    select 1 from private.notification_outbox
    where campaign_id = '73000000-0000-4000-8000-000000000001'
      and status = 'cancelled'
  )
  and exists (
    select 1 from private.notification_campaigns
    where id = '73000000-0000-4000-8000-000000000001'
      and status = 'cancelled'
  ),
  'cancel-first scrubs source and revokes test target, outbox, and campaign'
);
set local role authenticated;
select is(
  public.approve_owner_reinstall_recovery(
    (select id from pending_cancel_challenge), repeat('8', 64)
  ),
  false,
  'owner approval loses after device cancellation'
);
reset role;

-- Owner authorization may win first, but an all-off device cancellation must
-- still revoke the source and must never create the target.
select public.service_set_notification_registration_enabled(true);
delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.77',
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-authorized-cancel]'
  )::text,
  true
);
select public.notification_register_v2(
  '72000000-0000-4000-8000-000000000012',
  repeat('2', 64), repeat('3', 64),
  'android', '0.6.0+10', 'preview',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, true, true, false
);
select public.notification_request_reinstall_recovery_v1(
  '72000000-0000-4000-8000-000000000013',
  private.sha256_hex(repeat('1', 64)), repeat('4', 64),
  'android', '0.6.1+11', 'preview',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, true, false, true, repeat('5', 64)
);
create temporary table authorized_cancel_recovery on commit drop as
select id from private.notification_reinstall_recovery_challenges
where target_installation_id = '72000000-0000-4000-8000-000000000013'
  and status = 'pending';
grant select on authorized_cancel_recovery to authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;
select is(
  public.approve_owner_reinstall_recovery(
    (select id from authorized_cancel_recovery), repeat('5', 64)
  ),
  true,
  'owner authorization can win before an all-off cancellation'
);
reset role;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.77',
    'x-jubilee-installation-proof', repeat('1', 64),
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-authorized-cancel]'
  )::text,
  true
);
select public.service_set_notification_registration_enabled(false);
select is(
  public.notification_finalize_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000013',
    'android', '0.6.1+11', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true, true, false, true
  ) ->> 'code',
  'REGISTRATION_DISABLED',
  'a kill-switch change after owner authorization blocks device finalize'
);
select ok(
  exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000012'
      and disabled_at is null
  )
  and not exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000013'
  )
  and exists (
    select 1 from private.notification_reinstall_recovery_challenges
    where id = (select id from authorized_cancel_recovery)
      and status = 'authorized'
  ),
  'blocked finalize preserves the source reservation and creates no target'
);
select is(
  public.notification_cancel_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000013', 'android', 'preview'
  ) ->> 'status',
  'withdrawn',
  'all-off cancellation wins after owner authorization but before finalize'
);
select ok(
  exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000012'
      and disabled_at is not null
      and sensitive_interest_consent_version is null
  )
  and not exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000013'
  )
  and exists (
    select 1 from private.notification_reinstall_recovery_challenges
    where id = (select id from authorized_cancel_recovery)
      and status = 'withdrawn'
  ),
  'authorized cancellation scrubs source and creates no target'
);
select is(
  public.notification_finalize_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000013',
    'android', '0.6.1+11', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true, true, false, true
  ) ->> 'code',
  'RECOVERY_NOT_AUTHORIZED',
  'finalize cannot reactivate after an authorized cancellation'
);

-- Provisional-response-loss fallback: exact non-production token can only
-- unsubscribe; it cannot create or grant a target.
select public.service_set_notification_registration_enabled(true);
delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.73',
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-development-c]'
  )::text,
  true
);
select public.notification_register_v2(
  '72000000-0000-4000-8000-000000000005',
  repeat('9', 64), repeat('8', 64),
  'android', '0.3.0+5', 'development',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, true, false, false
);
select public.service_set_notification_registration_enabled(false);
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.73',
    'x-jubilee-installation-proof', repeat('d', 64),
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-development-c]'
  )::text,
  true
);
select is(
  public.notification_cancel_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000006', 'android', 'development'
  ) ->> 'status',
  'withdrawn',
  'exact non-production token fallback covers a lost request response'
);
select ok(
  exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000005'
      and disabled_at is not null
      and sensitive_interest_consent_version is null
  )
  and not exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000006'
  ),
  'fallback is unsubscribe-only and never creates target consent'
);

-- Production source is never reachable through the preview fallback.
select public.service_set_notification_registration_enabled(true);
delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.74',
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-production]'
  )::text,
  true
);
select public.notification_register_v2(
  '72000000-0000-4000-8000-000000000007',
  repeat('6', 64), repeat('5', 64),
  'android', '1.0.0+1', 'production',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, true, false, false
);
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.74',
    'x-jubilee-installation-proof', repeat('e', 64),
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-production]'
  )::text,
  true
);
select ok(
  public.notification_cancel_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000008', 'android', 'preview'
  ) ->> 'code' = 'RECOVERY_UNLINK_NOT_AVAILABLE'
  and exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000007'
      and disabled_at is null
  ),
  'production source remains untouched by non-production fallback'
);

-- Device absent after owner authorization, then terminal cancel and retention.
delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.75',
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-preview-d]'
  )::text,
  true
);
select public.notification_register_v2(
  '72000000-0000-4000-8000-000000000009',
  repeat('7', 64), repeat('6', 64),
  'ios', '0.4.0+7', 'preview',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, false, true, false
);
select public.notification_request_reinstall_recovery_v1(
  '72000000-0000-4000-8000-000000000010',
  private.sha256_hex(repeat('e', 64)), repeat('5', 64),
  'ios', '0.4.1+8', 'preview',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, false, true, false, repeat('4', 64)
);
create temporary table absent_device_recovery on commit drop as
select id from private.notification_reinstall_recovery_challenges
where target_installation_id = '72000000-0000-4000-8000-000000000010'
  and status = 'pending';
grant select on absent_device_recovery to authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;
select is(
  public.approve_owner_reinstall_recovery(
    (select id from absent_device_recovery), repeat('4', 64)
  ),
  true,
  'owner authorization succeeds for device-absence regression'
);
reset role;
select ok(
  exists (
    select 1 from private.app_installations as installation
    join private.push_endpoints as endpoint on endpoint.installation_id = installation.id
    where installation.id = '72000000-0000-4000-8000-000000000009'
      and installation.disabled_at is null
      and endpoint.expo_push_token = 'ExpoPushToken[recovery-preview-d]'
  )
  and not exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000010'
  ),
  'device absence leaves source reserved and creates no orphan target'
);
select * from public.service_cleanup_reinstall_recovery_challenges(
  statement_timestamp() + interval '20 minutes'
);
select ok(
  (
    select status = 'expired'
      and source_token_hash is null
      and target_secret_store_hash is null
      and target_pairing_store_hash is null
      and recovery_code_digest is null
      and unlink_binding_digest ~ '^[0-9a-f]{64}$'
    from private.notification_reinstall_recovery_challenges
    where id = (select id from absent_device_recovery)
  )
  and exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000009'
      and disabled_at is null
  ),
  'authorized expiry scrubs finalize verifiers without releasing source'
);
select public.service_set_notification_registration_enabled(false);
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.75',
    'x-jubilee-installation-proof', repeat('e', 64),
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-preview-d]'
  )::text,
  true
);
select is(
  public.notification_cancel_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000010', 'ios', 'preview'
  ) ->> 'status',
  'withdrawn',
  'terminal exact proof and token can still withdraw source'
);
select ok(
  exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000009'
      and disabled_at is not null
      and sensitive_interest_consent_version is null
  )
  and exists (
    select 1 from private.push_endpoints
    where installation_id = '72000000-0000-4000-8000-000000000009'
      and expo_push_token is null
      and token_hash is null
      and is_active is false
  ),
  'terminal cancellation scrubs the still-active source'
);
update private.notification_reinstall_recovery_challenges
set decided_at = statement_timestamp() - interval '29 days'
where id = (select id from absent_device_recovery);
select * from public.service_cleanup_reinstall_recovery_challenges(statement_timestamp());
select is(
  (
    select count(*) from private.notification_reinstall_recovery_challenges
    where id = (select id from absent_device_recovery)
  ),
  1::bigint,
  'terminal audit remains through 30 days'
);
update private.notification_reinstall_recovery_challenges
set decided_at = statement_timestamp() - interval '31 days'
where id = (select id from absent_device_recovery);
select * from public.service_cleanup_reinstall_recovery_challenges(statement_timestamp());
select is(
  (
    select count(*) from private.notification_reinstall_recovery_challenges
    where id = (select id from absent_device_recovery)
  ),
  0::bigint,
  'terminal audit is deleted after 30 days'
);

-- Long-gap exact target proof+token remains a normal withdrawal path even
-- without a challenge audit.
select public.service_set_notification_registration_enabled(true);
delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.76',
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-target-no-audit]'
  )::text,
  true
);
select public.notification_register_v2(
  '72000000-0000-4000-8000-000000000011',
  private.sha256_hex(repeat('f', 64)), repeat('3', 64),
  'android', '0.5.0+9', 'development',
  private.current_sensitive_interest_consent_version(),
  private.current_sensitive_interest_disclosure_sha256(),
  private.current_sensitive_interest_consent_locale(),
  true, true, false, false
);
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.76',
    'x-jubilee-installation-proof', repeat('f', 64),
    'x-jubilee-expo-push-token', 'ExpoPushToken[recovery-target-no-audit]'
  )::text,
  true
);
select is(
  public.notification_cancel_reinstall_recovery_v1(
    '72000000-0000-4000-8000-000000000011', 'android', 'development'
  ) ->> 'status',
  'withdrawn',
  'exact target proof and token withdraw after audit cleanup'
);
select ok(
  exists (
    select 1 from private.app_installations
    where id = '72000000-0000-4000-8000-000000000011'
      and disabled_at is not null
      and sensitive_interest_consent_version is null
  )
  and exists (
    select 1 from private.push_endpoints
    where installation_id = '72000000-0000-4000-8000-000000000011'
      and expo_push_token is null
      and token_hash is null
      and is_active is false
  ),
  'long-gap target withdrawal scrubs token and consent'
);

select * from finish();
rollback;
