begin;

-- A provider-neutral support disclosure replaces the previous hard-coded
-- Google Workspace and Gmail checks. Each required label must occur exactly
-- once and carry a concrete, non-placeholder value, as enforced by
-- private.legal_document_has_confirmed_value(text, text).
create or replace function private.legal_document_has_sensitive_notification_disclosure(
  target_body text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select position('종교적 관심' in target_body) > 0
    and position('이름·이메일' in target_body) > 0
    and position('광고 식별자' in target_body) > 0
    and position('결합하지 않고' in target_body) > 0
    and position('알림 제공' in target_body) > 0
    and position('에만 사용' in target_body) > 0
    and position('별도 동의' in target_body) > 0
    and position('동의 버전' in target_body) > 0
    and position('동의 시각' in target_body) > 0
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
    and position('만 14세' in target_body) > 0
    and private.legal_document_has_confirmed_value(
      target_body, '개인정보 처리자의 법적 성명 또는 명칭:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '개인정보 보호책임자 또는 고충처리 담당부서:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '전화번호 등 연락처:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '국외 처리 법적 근거(법률 검토 후 확정):'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 이메일 공급자 및 확정 주소:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 이메일 공급자의 법적 역할·처리 근거:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 이메일 공급자의 처리 국가:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 문의 보유·삭제 기준:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 문의 보유·삭제 운영 증빙:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '알림의 만 14세 이상 제한 또는 법정대리인 동의 절차:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '실제 시행일:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '오너 최종 사실확인:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '법률 전문가 검토 상태:'
    )
    and position(
      '광고·추적·이용자 프로파일링에 사용하지 않습니다'
      in target_body
    ) > 0;
$$;

revoke all on function
  private.legal_document_has_sensitive_notification_disclosure(text)
from public, anon, authenticated, service_role;

-- Direct owner publication must use the same provider-neutral disclosure.
-- The app identity remains fixed, but no specific support provider or address
-- is accepted unless it appears in the labeled, confirmed disclosure above.
create or replace function public.publish_legal_document(target_document_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_type text;
  target_body text;
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select legal.document_type, legal.body
  into target_type, target_body
  from public.legal_documents as legal
  where legal.id = target_document_id
    and legal.status = 'draft'
    and legal.effective_on <= current_date
  for update;

  if target_type is null then
    raise exception using
      errcode = '23514',
      message = 'A current or past-effective draft legal document is required';
  end if;

  if position('[[오너 확인 필요]]' in target_body) > 0
    or position('쥬빌리 워십' in target_body) = 0
    or (
      target_type = 'privacy_policy'
      and (
        position('설치 식별자' in target_body) = 0
        or position('푸시 토큰' in target_body) = 0
        or position('알림 선택' in target_body) = 0
        or position('보유' in target_body) = 0
        or position('비활성화' in target_body) = 0
        or not private.legal_document_has_sensitive_notification_disclosure(target_body)
        or not private.legal_document_has_confirmed_value(
          target_body, '비활성 정보 보유 기간:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '발송 기록 보유 기간:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '정기 삭제 주기:'
        )
        or not private.legal_document_has_confirmed_value(target_body, '수탁자:')
        or not private.legal_document_has_confirmed_value(target_body, '이전 국가:')
        or not private.legal_document_has_confirmed_value(target_body, '이전 항목:')
        or not private.legal_document_has_confirmed_value(
          target_body, '이전 시점 및 방법:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '국외 처리 보유 기간:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '이전 거부 방법 및 효과:'
        )
      )
    )
    or (
      target_type = 'terms_of_service'
      and (
        not private.legal_document_has_confirmed_value(target_body, '준거법:')
        or not private.legal_document_has_confirmed_value(target_body, '관할:')
        or not private.legal_document_has_confirmed_value(target_body, '면책 범위:')
        or not private.legal_document_has_confirmed_value(
          target_body, '미성년자 이용 안내:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '서비스 제공자의 법적 성명 또는 명칭:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '주소 및 전화번호:'
        )
      )
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Legal document identity and disclosure review is incomplete';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731911, pg_catalog.hashtext(target_type));

  update public.legal_documents
  set status = 'withdrawn',
      withdrawn_at = statement_timestamp(),
      withdrawn_by = actor
  where document_type = target_type
    and status = 'published';

  update public.legal_documents
  set status = 'published',
      published_at = statement_timestamp(),
      published_by = actor
  where id = target_document_id;
end;
$$;

revoke all on function public.publish_legal_document(bigint)
from public, anon, authenticated, service_role;
grant execute on function public.publish_legal_document(bigint)
to authenticated, service_role;

-- Registration enablement and every client registration/update path call this
-- predicate, so an older policy without the new support labels fails closed.
create or replace function private.current_store_ready_privacy_policy_exists()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.legal_documents as legal
    where legal.document_type = 'privacy_policy'
      and legal.status = 'published'
      and legal.effective_on <= current_date
      and position('[[오너 확인 필요]]' in legal.body) = 0
      and position('쥬빌리 워십' in legal.body) > 0
      and position('설치 식별자' in legal.body) > 0
      and position('푸시 토큰' in legal.body) > 0
      and position('알림 선택' in legal.body) > 0
      and position('보유' in legal.body) > 0
      and position('비활성화' in legal.body) > 0
      and private.legal_document_has_sensitive_notification_disclosure(legal.body)
      and private.legal_document_has_confirmed_value(
        legal.body, '비활성 정보 보유 기간:'
      )
      and private.legal_document_has_confirmed_value(
        legal.body, '발송 기록 보유 기간:'
      )
      and private.legal_document_has_confirmed_value(
        legal.body, '정기 삭제 주기:'
      )
      and private.legal_document_has_confirmed_value(legal.body, '수탁자:')
      and private.legal_document_has_confirmed_value(legal.body, '이전 국가:')
      and private.legal_document_has_confirmed_value(legal.body, '이전 항목:')
      and private.legal_document_has_confirmed_value(
        legal.body, '이전 시점 및 방법:'
      )
      and private.legal_document_has_confirmed_value(
        legal.body, '국외 처리 보유 기간:'
      )
      and private.legal_document_has_confirmed_value(
        legal.body, '이전 거부 방법 및 효과:'
      )
  );
$$;

revoke all on function private.current_store_ready_privacy_policy_exists()
from public, anon, authenticated, service_role;

commit;
