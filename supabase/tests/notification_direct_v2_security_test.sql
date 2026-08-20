begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(75);

create function pg_temp.store_ready_privacy_body()
returns text
language sql
as $$
  select E'쥬빌리 워십 sundoojubileeworship@gmail.com 설치 식별자 푸시 토큰 알림 선택 보유 비활성화\n'
    || E'알림 제공에만 사용합니다. 종교적 관심을 추론할 수 있어 별도 동의를 받고 동의 버전과 동의 시각을 기록합니다. 이름·이메일·광고 식별자와 결합하지 않고 광고·추적·이용자 프로파일링에 사용하지 않습니다.\n'
    || E'SUPABASE PTE. LTD. 대한민국 서울(ap-northeast-2) Supabase Data API 분산 요청 제한 검증값은 재사용할 수 없도록 해시합니다. 신규 등록은 하루 100회, 전체 하루 500회로 제한하며 일일 카운터는 최대 25시간 5분 보유됩니다. 650 Industries, Inc. Expo Apple·Google 처리 미국 Google Workspace 만 14세\n'
    || E'비활성 정보 보유 기간: 30일\n발송 기록 보유 기간: 90일\n정기 삭제 주기: 매일 1회\n수탁자: 시험 처리자\n이전 국가: 시험 국가\n이전 항목: 알림 정보\n이전 시점 및 방법: 동의 후 HTTPS 전송\n국외 처리 보유 기간: 30일\n이전 거부 방법 및 효과: 알림 해제 시 알림 중단\n'
    || E'개인정보 처리자의 법적 성명 또는 명칭: 시험 운영자\n개인정보 보호책임자 또는 고충처리 담당부서: 개인정보팀\n전화번호 등 연락처: 032-000-0000\n국외 처리 법적 근거(법률 검토 후 확정): 개인정보보호법 시험 근거\n지원 문의 보유·삭제 기준: 해결 후 90일\n지원 이메일 제공자의 법적 역할·처리 근거: 독립 처리 근거\n지원 이메일 국외 처리 국가: 시험 국가\n알림의 만 14세 이상 제한 또는 법정대리인 동의 절차: 법정대리인 서면 절차\n실제 시행일: 2026-09-01\n오너 최종 사실확인: 2026-09-01 서면 승인\n법률 전문가 검토 상태: 2026-09-01 의견서 수령';
$$;

-- Only the narrow typed-result v2 wrappers are public, and current consent
-- stores a server timestamp for the explicit 14+ affirmation.
select ok(
  has_function_privilege(
    'anon',
    'public.notification_register_v2(uuid,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'anon can execute the direct v2 registration wrapper'
);
select ok(
  has_function_privilege(
    'anon',
    'public.notification_update_v2(uuid,text,text,text,text,text,text,boolean,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'anon can execute the direct v2 update wrapper'
);
select ok(
  has_function_privilege(
    'anon',
    'public.notification_unregister_v2(uuid,text)',
    'EXECUTE'
  ),
  'anon can execute the direct v2 withdrawal wrapper'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.service_register_app_installation(uuid,text,text,text,text,text,boolean,text,text,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'the obsolete Edge registration RPC remains revoked'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.service_set_notification_registration_enabled(boolean)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.service_set_notification_registration_enabled(boolean)',
    'EXECUTE'
  ),
  'only the service role can operate the registration kill switch'
);
select ok(
  not has_table_privilege(
    'anon',
    'private.notification_client_rate_limit_secret',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'anon',
    'private.notification_client_rate_limits',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'anon',
    'private.notification_registration_control',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'anon has no direct access to notification abuse-control tables'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'private.notification_client_rate_limit_secret',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'authenticated',
    'private.notification_client_rate_limits',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'authenticated',
    'private.notification_registration_control',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'authenticated has no direct access to notification abuse-control tables'
);
select ok(
  not has_table_privilege(
    'service_role',
    'private.notification_client_rate_limit_secret',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'service_role',
    'private.notification_client_rate_limits',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'service_role',
    'private.notification_registration_control',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'service role uses narrow RPCs instead of direct abuse-control table access'
);
select ok(
  not has_table_privilege(
    'anon',
    'private.sensitive_interest_consent_events',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'authenticated',
    'private.sensitive_interest_consent_events',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'service_role',
    'private.sensitive_interest_consent_events',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'consent events remain append-only behind the narrow security-definer RPCs'
);
select has_column(
  'private', 'app_installations',
  'sensitive_interest_age_14_or_over_confirmed_at',
  'installations store the server-generated 14+ affirmation timestamp'
);
select has_column(
  'private', 'sensitive_interest_consent_events',
  'age_14_or_over_confirmed',
  'consent audit events record whether the 14+ affirmation occurred'
);

-- Registration starts closed and cannot be opened until a complete current
-- privacy policy is actually public. The register RPC repeats the policy gate
-- so a direct control-table write cannot bypass it.
select is(
  (select registration_enabled from private.notification_registration_control where singleton),
  false,
  'notification registration is disabled by default after migration'
);
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.20',
    'x-jubilee-expo-push-token', 'ExponentPushToken[policy-gate]'
  )::text,
  true
);
select is(
  public.notification_register_v2(
    'f8000000-0000-4000-8000-000000000008',
    private.sha256_hex(repeat('8', 64)),
    private.sha256_hex(repeat('9', 64)),
    'android', '0.1.0+1', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  ) ->> 'code',
  'REGISTRATION_DISABLED',
  'registration remains closed before a store-ready privacy policy exists'
);
select is(
  (select count(*) from private.notification_client_rate_limits),
  0::bigint,
  'a policy-gate denial creates no abuse-control rows'
);
select throws_ok(
  $$select public.service_set_notification_registration_enabled(true)$$,
  '23514',
  'A store-ready published privacy policy is required',
  'the service control cannot enable registration before policy publication'
);

update private.notification_registration_control
set registration_enabled = true
where singleton = true;
select is(
  public.notification_register_v2(
    'f8000000-0000-4000-8000-000000000008',
    private.sha256_hex(repeat('8', 64)),
    private.sha256_hex(repeat('9', 64)),
    'android', '0.1.0+1', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  ) ->> 'code',
  'REGISTRATION_DISABLED',
  'the client RPC rejects a direct control-table bypass without policy'
);
update private.notification_registration_control
set registration_enabled = false
where singleton = true;

insert into auth.users (id, email)
values ('f8000000-0000-4000-8000-000000000009', 'direct-v2-policy@example.com');
insert into public.legal_documents (
  document_type, version, title, body, effective_on
) values (
  'privacy_policy', 'direct-v2-store-ready', '개인정보처리방침',
  pg_temp.store_ready_privacy_body(), current_date
);
update public.legal_documents
set status = 'published',
    published_at = statement_timestamp(),
    published_by = 'f8000000-0000-4000-8000-000000000009'
where version = 'direct-v2-store-ready';
select lives_ok(
  $$select public.service_set_notification_registration_enabled(true)$$,
  'the service control enables registration after a store-ready policy is public'
);
select is(
  (select registration_enabled from private.notification_registration_control where singleton),
  true,
  'registration is open only after the explicit service action'
);

delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.23',
    'user-agent', 'direct-v2-pgtap',
    'x-jubilee-expo-push-token', 'ExponentPushToken[directv2-a]'
  )::text,
  true
);

select is(
  public.notification_register_v2(
    'a0000000-0000-4000-8000-000000000000',
    private.sha256_hex(repeat('a', 64)),
    private.sha256_hex(repeat('b', 64)),
    'android', '0.1.0+1', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    false,
    true, false, false
  ) ->> 'code',
  '23514',
  'registration fails closed when the explicit 14+ affirmation is false'
);
select is(
  (
    select count(*)
    from private.app_installations
    where id = 'a0000000-0000-4000-8000-000000000000'
  ),
  0::bigint,
  'a rejected 14+ affirmation stores no installation or age timestamp'
);
delete from private.notification_client_rate_limits;

-- 5-6: an expected failure is typed, and its source counter commits.
select is(
  public.notification_register_v2(
    'a1000000-0000-4000-8000-000000000001',
    private.sha256_hex(repeat('1', 64)),
    private.sha256_hex(repeat('2', 64)),
    'android', '0.1.0+1', 'production',
    'sensitive-interest-notifications-v2', repeat('0', 64), 'ko-KR',
    true,
    true, false, false
  ) ->> 'code',
  '23514',
  'a stale disclosure digest returns a typed consent error'
);
select is(
  (
    select request_count
    from private.notification_client_rate_limits
    where scope = 'notification_register'
  ),
  1,
  'a typed registration failure still consumes the source rate limit'
);

delete from private.notification_client_rate_limits;

-- Invalid-looking provider tokens still consume every registration guard.
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.24',
    'x-jubilee-expo-push-token', 'ExponentPushToken[fake token]'
  )::text,
  true
);
select is(
  public.notification_register_v2(
    'f4000000-0000-4000-8000-000000000004',
    private.sha256_hex(repeat('4', 64)),
    private.sha256_hex(repeat('5', 64)),
    'android', '0.1.0+1', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  ) ->> 'code',
  '22023',
  'a fake-format Expo token returns a typed validation error'
);
do $$
begin
  for attempt in 2..5 loop
    perform public.notification_register_v2(
      'f4000000-0000-4000-8000-000000000004',
      private.sha256_hex(repeat('4', 64)),
      private.sha256_hex(repeat('5', 64)),
      'android', '0.1.0+1', 'production',
      private.current_sensitive_interest_consent_version(),
      private.current_sensitive_interest_disclosure_sha256(),
      private.current_sensitive_interest_consent_locale(),
      true,
      true, false, false
    );
  end loop;
end;
$$;
select results_eq(
  $$
    select scope, request_count
    from private.notification_client_rate_limits
    where scope in (
      'notification_register',
      'notification_register_daily',
      'notification_register_subject'
    )
    order by scope
  $$,
  $$
    values
      ('notification_register'::text, 5),
      ('notification_register_daily'::text, 5),
      ('notification_register_subject'::text, 5)
  $$,
  'five fake-format tokens consume minute, daily, and installation counters'
);
select ok(
  (
    select count(*) = 2
      and bool_and(expires_at = window_started_at + interval '25 hours')
    from private.notification_client_rate_limits
    where scope in (
      'notification_register_daily',
      'notification_register_daily_global'
    )
  ),
  'daily source and global HMAC rows expire 25 hours after their window starts'
);
select throws_ok(
  $$
    select public.notification_register_v2(
      'f4000000-0000-4000-8000-000000000004',
      private.sha256_hex(repeat('4', 64)),
      private.sha256_hex(repeat('5', 64)),
      'android', '0.1.0+1', 'production',
      private.current_sensitive_interest_consent_version(),
      private.current_sensitive_interest_disclosure_sha256(),
      private.current_sensitive_interest_consent_locale(),
      true,
      true, false, false
    )
  $$,
  '55000',
  'Installation request rate exceeded',
  'the sixth fake-format token is blocked by the installation cap'
);

-- Seed then pin the daily source/global rows at their documented ceilings.
delete from private.notification_client_rate_limits;
do $$
begin
  perform public.notification_register_v2(
    'f5000000-0000-4000-8000-000000000005',
    private.sha256_hex(repeat('5', 64)),
    private.sha256_hex(repeat('6', 64)),
    'android', '0.1.0+1', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  );
end;
$$;
update private.notification_client_rate_limits
set request_count = 100
where scope = 'notification_register_daily';
select throws_ok(
  $$
    select public.notification_register_v2(
      'f5000000-0000-4000-8000-000000000005',
      private.sha256_hex(repeat('5', 64)),
      private.sha256_hex(repeat('6', 64)),
      'android', '0.1.0+1', 'production',
      private.current_sensitive_interest_consent_version(),
      private.current_sensitive_interest_disclosure_sha256(),
      private.current_sensitive_interest_consent_locale(),
      true,
      true, false, false
    )
  $$,
  '55000',
  'Notification client request rate exceeded',
  'the 101st registration attempt from one source is blocked'
);

delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.25',
    'x-jubilee-expo-push-token', 'ExponentPushToken[fake token]'
  )::text,
  true
);
do $$
begin
  perform public.notification_register_v2(
    'f6000000-0000-4000-8000-000000000006',
    private.sha256_hex(repeat('6', 64)),
    private.sha256_hex(repeat('7', 64)),
    'android', '0.1.0+1', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  );
end;
$$;
update private.notification_client_rate_limits
set request_count = 500
where scope = 'notification_register_daily_global';
select throws_ok(
  $$
    select public.notification_register_v2(
      'f6000000-0000-4000-8000-000000000006',
      private.sha256_hex(repeat('6', 64)),
      private.sha256_hex(repeat('7', 64)),
      'android', '0.1.0+1', 'production',
      private.current_sensitive_interest_consent_version(),
      private.current_sensitive_interest_disclosure_sha256(),
      private.current_sensitive_interest_consent_locale(),
      true,
      true, false, false
    )
  $$,
  '55000',
  'Global notification client rate exceeded',
  'the 501st service-wide registration attempt is blocked'
);

-- The private control stops registration before counters or writes are made.
delete from private.notification_client_rate_limits;
select public.service_set_notification_registration_enabled(false);
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.26',
    'x-jubilee-expo-push-token', 'ExponentPushToken[kill-switch]'
  )::text,
  true
);
select is(
  public.notification_register_v2(
    'f7000000-0000-4000-8000-000000000007',
    private.sha256_hex(repeat('7', 64)),
    private.sha256_hex(repeat('8', 64)),
    'android', '0.1.0+1', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  ) ->> 'code',
  'REGISTRATION_DISABLED',
  'the kill switch returns a stable typed denial'
);
select is(
  (select count(*) from private.notification_client_rate_limits),
  0::bigint,
  'a kill-switch denial does not consume rate-limit rows'
);
select is(
  (select count(*) from private.app_installations where id = 'f7000000-0000-4000-8000-000000000007'),
  0::bigint,
  'a kill-switch denial creates no installation'
);
select public.service_set_notification_registration_enabled(true);
select is(
  public.notification_register_v2(
    'f7000000-0000-4000-8000-000000000007',
    private.sha256_hex(repeat('7', 64)),
    private.sha256_hex(repeat('8', 64)),
    'android', '0.1.0+1', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  ) ->> 'status',
  'ok',
  'registration resumes only after the service RPC re-enables it'
);

create temp table blocked_update_snapshot on commit drop as
select
  installation.app_version,
  installation.sensitive_interest_consent_version,
  installation.sensitive_interest_consented_at,
  installation.sensitive_interest_disclosure_sha256,
  installation.sensitive_interest_consent_locale,
  installation.sensitive_interest_age_14_or_over_confirmed_at,
  endpoint.expo_push_token,
  endpoint.token_hash,
  endpoint.is_active,
  subscription.worship_reminder,
  subscription.schedule_changes,
  subscription.setlist_updates
from private.app_installations as installation
join private.push_endpoints as endpoint
  on endpoint.installation_id = installation.id
join private.notification_subscriptions as subscription
  on subscription.installation_id = installation.id
where installation.id = 'f7000000-0000-4000-8000-000000000007';

select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.26',
    'x-jubilee-installation-proof', repeat('7', 64),
    'x-jubilee-expo-push-token', 'ExponentPushToken[blocked-update]'
  )::text,
  true
);
select public.service_set_notification_registration_enabled(false);
select is(
  public.notification_update_v2(
    'f7000000-0000-4000-8000-000000000007',
    private.sha256_hex(repeat('8', 64)),
    '0.1.0+2', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    false, true, true
  ) ->> 'code',
  'REGISTRATION_DISABLED',
  'the kill switch blocks updates to an existing installation'
);
select results_eq(
  $$
    select
      installation.app_version,
      installation.sensitive_interest_consent_version,
      installation.sensitive_interest_consented_at,
      installation.sensitive_interest_disclosure_sha256,
      installation.sensitive_interest_consent_locale,
      installation.sensitive_interest_age_14_or_over_confirmed_at,
      endpoint.expo_push_token,
      endpoint.token_hash,
      endpoint.is_active,
      subscription.worship_reminder,
      subscription.schedule_changes,
      subscription.setlist_updates
    from private.app_installations as installation
    join private.push_endpoints as endpoint
      on endpoint.installation_id = installation.id
    join private.notification_subscriptions as subscription
      on subscription.installation_id = installation.id
    where installation.id = 'f7000000-0000-4000-8000-000000000007'
  $$,
  $$select * from blocked_update_snapshot$$,
  'a kill-switch denial leaves token, subscriptions, and consent unchanged'
);

select public.service_set_notification_registration_enabled(true);
update public.legal_documents
set status = 'withdrawn',
    withdrawn_at = statement_timestamp(),
    withdrawn_by = published_by
where version = 'direct-v2-store-ready'
  and status = 'published';
select is(
  public.notification_update_v2(
    'f7000000-0000-4000-8000-000000000007',
    private.sha256_hex(repeat('8', 64)),
    '0.1.0+2', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    false, true, true
  ) ->> 'code',
  'REGISTRATION_DISABLED',
  'an unavailable store-ready policy blocks updates to an existing installation'
);
select results_eq(
  $$
    select
      installation.app_version,
      installation.sensitive_interest_consent_version,
      installation.sensitive_interest_consented_at,
      installation.sensitive_interest_disclosure_sha256,
      installation.sensitive_interest_consent_locale,
      installation.sensitive_interest_age_14_or_over_confirmed_at,
      endpoint.expo_push_token,
      endpoint.token_hash,
      endpoint.is_active,
      subscription.worship_reminder,
      subscription.schedule_changes,
      subscription.setlist_updates
    from private.app_installations as installation
    join private.push_endpoints as endpoint
      on endpoint.installation_id = installation.id
    join private.notification_subscriptions as subscription
      on subscription.installation_id = installation.id
    where installation.id = 'f7000000-0000-4000-8000-000000000007'
  $$,
  $$select * from blocked_update_snapshot$$,
  'a policy-gate denial leaves token, subscriptions, and consent unchanged'
);

select public.service_set_notification_registration_enabled(false);
select is(
  public.notification_unregister_v2(
    'f7000000-0000-4000-8000-000000000007', 'production'
  ) ->> 'status',
  'ok',
  'withdrawal remains available while registration and policy gates are closed'
);
update public.legal_documents
set status = 'published',
    withdrawn_at = null,
    withdrawn_by = null
where version = 'direct-v2-store-ready'
  and status = 'withdrawn';
select public.service_set_notification_registration_enabled(true);

delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.23',
    'user-agent', 'direct-v2-pgtap',
    'x-jubilee-expo-push-token', 'ExponentPushToken[directv2-a]'
  )::text,
  true
);

-- 7-15: H2 registration is insert-only and a token is never takeover proof.
select is(
  public.notification_register_v2(
    'a1000000-0000-4000-8000-000000000001',
    private.sha256_hex(repeat('1', 64)),
    private.sha256_hex(repeat('2', 64)),
    'android', '0.1.0+1', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  ) ->> 'status',
  'ok',
  'a current separate consent can register through v2'
);
select is(
  (select secret_hash from private.app_installations where id = 'a1000000-0000-4000-8000-000000000001'),
  private.sha256_hex(repeat('1', 64)),
  'the database stores H2 rather than the device proof V'
);
select ok(
  (
    select sensitive_interest_age_14_or_over_confirmed_at is not null
      and sensitive_interest_age_14_or_over_confirmed_at <= statement_timestamp()
    from private.app_installations
    where id = 'a1000000-0000-4000-8000-000000000001'
  ),
  'the server records the 14+ affirmation timestamp instead of a birth date'
);
select isnt(
  (select secret_hash from private.app_installations where id = 'a1000000-0000-4000-8000-000000000001'),
  repeat('1', 64),
  'the replayable device proof is not stored as the verifier'
);
select is(
  (select test_pairing_secret_hash from private.app_installations where id = 'a1000000-0000-4000-8000-000000000001'),
  private.sha256_hex(repeat('2', 64)),
  'pairing stores a separate domain capability verifier'
);
select results_eq(
  $$
    select event_type, disclosure_sha256, consent_locale,
      age_14_or_over_confirmed
    from private.sensitive_interest_consent_events
    where installation_id = 'a1000000-0000-4000-8000-000000000001'
  $$,
  $$
    values (
      'granted'::text,
      private.current_sensitive_interest_disclosure_sha256(),
      private.current_sensitive_interest_consent_locale(),
      true
    )
  $$,
  'the grant audit pins disclosure digest and language'
);
select is(
  public.notification_register_v2(
    'a1000000-0000-4000-8000-000000000001',
    private.sha256_hex(repeat('1', 64)),
    private.sha256_hex(repeat('2', 64)),
    'android', '0.1.0+1', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  ) ->> 'status',
  'ok',
  'an exact network retry is idempotent'
);
select is(
  public.notification_register_v2(
    'a1000000-0000-4000-8000-000000000001',
    private.sha256_hex(repeat('1', 64)),
    private.sha256_hex(repeat('2', 64)),
    'android', '0.1.0+1', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    false, true, false
  ) ->> 'code',
  '23505',
  'the store verifier cannot mutate an existing installation'
);
select is(
  public.notification_register_v2(
    'b2000000-0000-4000-8000-000000000002',
    private.sha256_hex(repeat('3', 64)),
    private.sha256_hex(repeat('4', 64)),
    'android', '0.1.0+1', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  ) ->> 'code',
  '23505',
  'a fresh installation cannot take over the same provider token'
);
select is(
  (select count(*) from private.app_installations where id = 'a1000000-0000-4000-8000-000000000001'),
  1::bigint,
  'the original installation survives a duplicate-token attempt'
);
select is(
  (
    select count(*)
    from private.sensitive_interest_consent_events
    where installation_id = 'a1000000-0000-4000-8000-000000000001'
      and event_type = 'granted'
  ),
  1::bigint,
  'duplicate-token denial does not erase the original consent audit'
);

select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.23',
    'x-jubilee-expo-push-token', 'ExponentPushToken[directv2-preview]'
  )::text,
  true
);
select is(
  public.notification_register_v2(
    'c3000000-0000-4000-8000-000000000003',
    private.sha256_hex(repeat('7', 64)),
    private.sha256_hex(repeat('8', 64)),
    'android', '0.1.0+1', 'preview',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  ) ->> 'status',
  'ok',
  'a preview installation registers with a separate pairing verifier'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.service_create_test_push_pairing_v2(uuid,text,text,text)',
    'EXECUTE'
  ),
  'the scoped pairing RPC remains service-role only'
);
select throws_ok(
  $$
    select public.service_create_test_push_pairing_v2(
      'c3000000-0000-4000-8000-000000000003',
      repeat('7', 64),
      'preview',
      repeat('a', 64)
    )
  $$,
  '28000',
  'Invalid installation credentials',
  'the master update proof cannot be reused as a pairing capability'
);
select cmp_ok(
  public.service_create_test_push_pairing_v2(
    'c3000000-0000-4000-8000-000000000003',
    repeat('8', 64),
    'preview',
    repeat('a', 64)
  ),
  '>',
  statement_timestamp(),
  'the domain-separated pairing capability creates a short-lived challenge'
);
select is(
  (
    select count(*)
    from private.test_push_pairing_challenges as challenge
    join private.push_endpoints as endpoint on endpoint.id = challenge.push_endpoint_id
    where endpoint.installation_id = 'c3000000-0000-4000-8000-000000000003'
      and challenge.status = 'pending'
      and challenge.code_digest = repeat('a', 64)
  ),
  1::bigint,
  'pairing v2 persists only the supplied code digest for the preview endpoint'
);

delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.23',
    'x-jubilee-installation-proof', repeat('9', 64)
  )::text,
  true
);

-- 16-19: invalid authentication attempts persist and hit a subject cap.
select is(
  public.notification_update_v2(
    'a1000000-0000-4000-8000-000000000001',
    private.sha256_hex(repeat('2', 64)),
    '0.1.0+2', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, false, false
  ) ->> 'code',
  '28000',
  'a wrong proof returns a typed authentication error'
);
select is(
  (
    select request_count
    from private.notification_client_rate_limits
    where scope = 'notification_update_subject'
  ),
  1,
  'a wrong proof consumes the installation limit'
);
do $$
begin
  for attempt in 2..10 loop
    perform public.notification_update_v2(
      'a1000000-0000-4000-8000-000000000001',
      private.sha256_hex(repeat('2', 64)),
      '0.1.0+2', 'production',
      private.current_sensitive_interest_consent_version(),
      private.current_sensitive_interest_disclosure_sha256(),
      private.current_sensitive_interest_consent_locale(),
      true,
      true, false, false
    );
  end loop;
end;
$$;
select is(
  (
    select request_count
    from private.notification_client_rate_limits
    where scope = 'notification_update_subject'
  ),
  10,
  'ten wrong proofs persist in the one-minute subject window'
);
select throws_ok(
  $$
    select public.notification_update_v2(
      'a1000000-0000-4000-8000-000000000001',
      private.sha256_hex(repeat('2', 64)),
      '0.1.0+2', 'production',
      private.current_sensitive_interest_consent_version(),
      private.current_sensitive_interest_disclosure_sha256(),
      private.current_sensitive_interest_consent_locale(),
      true,
      true, false, false
    )
  $$,
  '55000',
  'Installation request rate exceeded',
  'the next wrong proof is blocked by the persisted subject limit'
);

delete from private.notification_client_rate_limits;
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.23',
    'x-jubilee-installation-proof', repeat('1', 64)
  )::text,
  true
);

-- 20-21: the valid V proof hashes to H2 and updates the current choice.
select is(
  public.notification_update_v2(
    'a1000000-0000-4000-8000-000000000001',
    private.sha256_hex(repeat('2', 64)),
    '0.1.0+2', 'production',
    private.current_sensitive_interest_consent_version(),
    private.current_sensitive_interest_disclosure_sha256(),
    private.current_sensitive_interest_consent_locale(),
    true,
    true, true, false
  ) ->> 'status',
  'ok',
  'the valid proof updates through v2'
);
select results_eq(
  $$
    select worship_reminder, schedule_changes, setlist_updates
    from private.notification_subscriptions
    where installation_id = 'a1000000-0000-4000-8000-000000000001'
  $$,
  $$values (true, true, false)$$,
  'the update persists only the requested choices'
);

insert into auth.users (id, email)
values ('cc000000-0000-4000-8000-000000000003', 'direct-v2-owner@example.com');
insert into public.events (
  slug, title, starts_at, ends_at, address, status, published, published_at
)
values (
  'direct-v2-expiration', 'Direct v2 expiration',
  '2099-09-04 20:00:00+09', '2099-09-04 22:00:00+09',
  '인천광역시 서구 거북로109번길 10', 'scheduled', true, statement_timestamp()
);
insert into private.notification_campaigns (
  id, kind, title, body, audience_kind, event_id, status, dedupe_key,
  approved_at, approved_by
)
select
  'dd000000-0000-4000-8000-000000000004', 'worship_reminder',
  '예배 1시간 전', '예배가 곧 시작됩니다.', 'worship_reminder', id,
  'approved', 'direct-v2-expiration', statement_timestamp(),
  'cc000000-0000-4000-8000-000000000003'
from public.events where slug = 'direct-v2-expiration';
insert into private.worship_reminder_schedules (
  campaign_id, event_id, reminder_slot, event_starts_at_snapshot, scheduled_for
)
select
  'dd000000-0000-4000-8000-000000000004', id, 'one_hour_before',
  starts_at, starts_at - interval '1 hour'
from public.events where slug = 'direct-v2-expiration';
insert into private.notification_deliveries (campaign_id, push_endpoint_id)
select
  'dd000000-0000-4000-8000-000000000004', endpoint.id
from private.push_endpoints as endpoint
where endpoint.installation_id = 'a1000000-0000-4000-8000-000000000001';

-- 22-23: the worker receives an absolute worship-start expiration.
select is(
  (
    select expires_at
    from public.service_revalidate_notification_deliveries(
      array[(select id from private.notification_deliveries where campaign_id = 'dd000000-0000-4000-8000-000000000004')]
    )
  ),
  '2099-09-04 20:00:00+09'::timestamptz,
  'revalidation returns the event start as the absolute provider expiration'
);
select is(
  (
    select expo_push_token
    from public.service_revalidate_notification_deliveries(
      array[(select id from private.notification_deliveries where campaign_id = 'dd000000-0000-4000-8000-000000000004')]
    )
  ),
  'ExponentPushToken[directv2-a]'::text,
  'revalidation returns the current endpoint before withdrawal'
);

-- 24-25: a wrong withdrawal proof is typed and changes nothing.
select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.23',
    'x-jubilee-installation-proof', repeat('9', 64)
  )::text,
  true
);
select is(
  public.notification_unregister_v2(
    'a1000000-0000-4000-8000-000000000001', 'production'
  ) ->> 'code',
  '28000',
  'a wrong withdrawal proof is rejected'
);
select ok(
  (select is_active from private.push_endpoints where installation_id = 'a1000000-0000-4000-8000-000000000001'),
  'a wrong withdrawal proof leaves the endpoint active'
);

select set_config(
  'request.headers',
  jsonb_build_object(
    'cf-connecting-ip', '198.51.100.23',
    'x-jubilee-installation-proof', repeat('1', 64)
  )::text,
  true
);

-- 26-36: withdrawal scrubs delivery data, de-links proof, and stops new sends.
select is(
  public.notification_unregister_v2(
    'a1000000-0000-4000-8000-000000000001', 'production'
  ) ->> 'status',
  'ok',
  'a valid withdrawal succeeds'
);
select ok(
  (
    select expo_push_token is null and token_hash is null and not is_active
    from private.push_endpoints
    where installation_id = 'a1000000-0000-4000-8000-000000000001'
  ),
  'withdrawal immediately scrubs and disables the provider endpoint'
);
select ok(
  (
    select secret_hash <> private.sha256_hex(repeat('1', 64))
      and secret_hash ~ '^[0-9a-f]{64}$'
      and test_pairing_secret_hash is null
    from private.app_installations
    where id = 'a1000000-0000-4000-8000-000000000001'
  ),
  'withdrawal rotates the device verifier and clears pairing capability'
);
select ok(
  (
    select sensitive_interest_consent_version is null
      and sensitive_interest_consented_at is null
      and sensitive_interest_disclosure_sha256 is null
      and sensitive_interest_consent_locale is null
      and sensitive_interest_age_14_or_over_confirmed_at is null
    from private.app_installations
    where id = 'a1000000-0000-4000-8000-000000000001'
  ),
  'withdrawal clears the current sensitive-interest consent state'
);
select results_eq(
  $$
    select worship_reminder, schedule_changes, setlist_updates
    from private.notification_subscriptions
    where installation_id = 'a1000000-0000-4000-8000-000000000001'
  $$,
  $$values (false, false, false)$$,
  'withdrawal turns off every subscription'
);
select results_eq(
  $$
    select event_type, age_14_or_over_confirmed
    from private.sensitive_interest_consent_events
    where installation_id = 'a1000000-0000-4000-8000-000000000001'
    order by id
  $$,
  $$values ('granted'::text, true), ('withdrawn'::text, true)$$,
  'withdrawal appends an age-confirmed audit event without overwriting the grant'
);
select is(
  public.notification_unregister_v2(
    'a1000000-0000-4000-8000-000000000001', 'production'
  ) ->> 'code',
  '28000',
  'the old proof cannot be replayed after withdrawal'
);
select is(
  (
    select count(*)
    from public.service_revalidate_notification_deliveries(
      array[(select id from private.notification_deliveries where campaign_id = 'dd000000-0000-4000-8000-000000000004')]
    )
  ),
  0::bigint,
  'withdrawn consent yields no newly sendable delivery'
);
select results_eq(
  $$
    select status, error_code
    from private.notification_deliveries
    where campaign_id = 'dd000000-0000-4000-8000-000000000004'
  $$,
  $$values ('failed'::text, 'ConsentOrTargetRevoked'::text)$$,
  'revalidation permanently fails the queued withdrawn target'
);
select ok(
  not exists (
    select 1
    from private.notification_client_rate_limits
    where key_hash like '%198.51.100.23%'
       or key_hash like '%direct-v2-pgtap%'
  ),
  'rate-limit rows never store the raw source address or user agent'
);
select ok(
  (
    select bool_and(key_hash ~ '^[0-9a-f]{64}$')
    from private.notification_client_rate_limits
  ),
  'rate-limit keys are fixed-length HMAC verification values'
);
select ok(
  (select disabled_at is not null and disable_reason = 'user_unregistered'
   from private.app_installations
   where id = 'a1000000-0000-4000-8000-000000000001'),
  'the de-linked row enters the bounded disabled cleanup lifecycle'
);

select * from finish();
rollback;
