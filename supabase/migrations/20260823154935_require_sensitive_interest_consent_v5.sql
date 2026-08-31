-- Replace the v4 sensitive-interest notification disclosure with an exact v5
-- contract that also discloses provider token lifecycle and Supabase campaign
-- and per-installation delivery records.
-- Generated with `supabase migration new require_sensitive_interest_consent_v5`.

begin;

-- Re-lock registration until the v5 app, direct Data API contract, and current
-- store-ready privacy policy have been canaried together. Existing v4 consent
-- remains in the append-only audit history, but it cannot authorize delivery.
update private.notification_registration_control
set registration_enabled = false,
    updated_at = statement_timestamp()
where singleton = true;

update private.notification_subscriptions
set worship_reminder = false,
    schedule_changes = false,
    setlist_updates = false
where worship_reminder or schedule_changes or setlist_updates;

update private.push_endpoints
set expo_push_token = null,
    token_hash = null,
    is_active = false,
    disabled_at = coalesce(disabled_at, statement_timestamp()),
    disable_reason = case
      when is_active then 'consent_required'
      else coalesce(disable_reason, 'consent_required')
    end
where is_active
   or expo_push_token is not null
   or token_hash is not null;

update private.app_installations
set disabled_at = coalesce(disabled_at, statement_timestamp()),
    disable_reason = case
      when disabled_at is null then 'consent_required'
      else disable_reason
    end,
    sensitive_interest_consent_version = null,
    sensitive_interest_consented_at = null,
    sensitive_interest_disclosure_sha256 = null,
    sensitive_interest_consent_locale = null,
    sensitive_interest_age_14_or_over_confirmed_at = null
where sensitive_interest_consent_version is not null
   or sensitive_interest_consented_at is not null
   or sensitive_interest_disclosure_sha256 is not null
   or sensitive_interest_consent_locale is not null
   or sensitive_interest_age_14_or_over_confirmed_at is not null;

-- Recovery requests capture the consent contract at request time. Pending v4
-- requests must not become v5 registrations after this migration.
update private.notification_reinstall_recovery_challenges
set status = 'superseded',
    source_token_hash = null,
    target_secret_store_hash = null,
    target_pairing_store_hash = null,
    target_consent_version = null,
    target_disclosure_sha256 = null,
    target_consent_locale = null,
    target_age_14_or_over_confirmed = null,
    target_worship_reminder = null,
    target_schedule_changes = null,
    target_setlist_updates = null,
    recovery_code_digest = null,
    decided_at = statement_timestamp(),
    decided_by = null
where status in ('pending', 'authorized');

create or replace function private.current_sensitive_interest_consent_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'sensitive-interest-notifications-v5'::text;
$$;

create or replace function private.current_sensitive_interest_disclosure_sha256()
returns text
language sql
immutable
set search_path = ''
as $$
  select '575ecb39ce1c1670e169e5fdae28587b09477a765a80c6dcfdb5df2f170a5f0e'::text;
$$;

-- Exact parity with packages/domain/src/legal.ts. The v5 terms make policy
-- publication fail closed if provider token lifecycle or Supabase campaign and
-- per-installation delivery processing is removed from the reviewed document.
create or replace function private.legal_document_has_required_app_privacy_disclosures(
  target_body text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select position('설치 식별자' in target_body) > 0
    and position('푸시 토큰' in target_body) > 0
    and position('알림 선택' in target_body) > 0
    and position('종교적 관심' in target_body) > 0
    and position('이름·이메일' in target_body) > 0
    and position('광고 식별자' in target_body) > 0
    and position('결합하지 않고' in target_body) > 0
    and position('알림 제공' in target_body) > 0
    and position('에만 사용' in target_body) > 0
    and position(
      '광고·추적·이용자 프로파일링에 사용하지 않습니다'
      in target_body
    ) > 0
    and position('별도 동의' in target_body) > 0
    and position('동의 버전' in target_body) > 0
    and position('동의 시각' in target_body) > 0
    and position('보유' in target_body) > 0
    and position('비활성화' in target_body) > 0
    and position('SUPABASE PTE. LTD.' in target_body) > 0
    and position('650 Industries, Inc.' in target_body) > 0
    and position('Apple·Google 처리' in target_body) > 0
    and position('대한민국 서울(ap-northeast-2)' in target_body) > 0
    and position('미국' in target_body) > 0
    and position('Supabase Data API' in target_body) > 0
    and position('분산 요청 제한' in target_body) > 0
    and position('하루 100회' in target_body) > 0
    and position('하루 500회' in target_body) > 0
    and position('25시간 5분' in target_body) > 0
    and position('재사용할 수 없도록' in target_body) > 0
    and position('「개인정보 보호법」 제15조제1항제1호' in target_body) > 0
    and position('제23조제1항제1호(민감정보 별도 동의)' in target_body) > 0
    and position('최대 50건·90일' in target_body) > 0
    and position('서버로 다시 전송하지 않습니다' in target_body) > 0
    and position('자동화된 결정' in target_body) > 0
    and position('광고 SDK' in target_body) > 0
    and position('지원 이메일 공급자 및 확정 주소:' in target_body) > 0
    and position('지원 문의 보유·삭제 기준:' in target_body) > 0
    and position('지원 문의 보유·삭제 운영 증빙:' in target_body) > 0
    and position('지원 이메일 공급자의 법적 역할·처리 근거:' in target_body) > 0
    and position('만 14세' in target_body) > 0
    and position('운영체제 기기 푸시 토큰(APNs 또는 FCM)' in target_body) > 0
    and position('Expo 앱 설치 식별자' in target_body) > 0
    and position('Expo 푸시 토큰을 발급·갱신' in target_body) > 0
    and position('실제 알림 발송 때' in target_body) > 0
    and position('알림 제목·본문·딥링크' in target_body) > 0
    and position('티켓·영수증·오류' in target_body) > 0
    and position(
      'Apple 또는 Google은 운영체제 기기 푸시 토큰'
      in target_body
    ) > 0
    and position('대상 종류·관련 예배 일정' in target_body) > 0
    and position('발송 승인·대기 상태' in target_body) > 0
    and position('설치별 발송 시도' in target_body) > 0
    and position('Expo의 운영체제 토큰 자동 갱신을 끄고' in target_body) > 0
    and position('APNs 또는 FCM 기기 토큰 등록 해제' in target_body) > 0
    and position('보안저장소에 정리 대기 상태' in target_body) > 0
    and position(
      '계약·서비스 운영주체는 싱가포르 법인 SUPABASE PTE. LTD.'
      in target_body
    ) = 0
    and position('Gmail 기반 후보·임시 문의 주소' in target_body) = 0
    and position(
      '최종 지원 이메일 공급자와 주소로 확정되지 않았습니다'
      in target_body
    ) = 0
    and position(
      '확인하기 전에는 이 정책을 공개하지 않습니다'
      in target_body
    ) = 0
    and position(
      '공급자별 법적 역할, 계약 당사자, 재위탁 구조, 국외 이전 근거는 실제 계정에 적용되는 최신 계약과 설정을 기준으로 확정합니다'
      in target_body
    ) = 0
    and position(
      '실제 계정에 적용되는 최신 계약·위탁 구조를 공개 전에 확정합니다'
      in target_body
    ) = 0
    and position(
      '이 연령 확인 방식의 법률적 충분성과 스토어 연령 설정의 정합성은 공개 전에 법률 전문가가 최종 검토합니다'
      in target_body
    ) = 0
    and position(
      '검토가 끝나기 전에는 개인정보처리방침을 공개하거나 알림 등록을 활성화하지 않습니다'
      in target_body
    ) = 0;
$$;

revoke all on function private.current_sensitive_interest_consent_version()
from public, anon, authenticated, service_role;
revoke all on function private.current_sensitive_interest_disclosure_sha256()
from public, anon, authenticated, service_role;
revoke all on function
  private.legal_document_has_required_app_privacy_disclosures(text)
from public, anon, authenticated, service_role;

comment on function private.current_sensitive_interest_consent_version() is
  'Current exact sensitive-interest notification consent contract version.';
comment on function private.current_sensitive_interest_disclosure_sha256() is
  'SHA-256 of the current exact Korean sensitive-interest notification disclosure.';

commit;
