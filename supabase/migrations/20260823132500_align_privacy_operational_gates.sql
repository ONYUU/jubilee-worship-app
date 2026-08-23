begin;

-- Exact parity with packages/domain/src/legal.ts
-- REQUIRED_APP_PRIVACY_DISCLOSURES, plus the same rejected legacy and
-- unresolved support-channel transition claims.
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
    ) = 0;
$$;

revoke all on function
  private.legal_document_has_required_app_privacy_disclosures(text)
from public, anon, authenticated, service_role;

create or replace function private.legal_document_single_labeled_value(
  target_body text,
  target_label text
)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  with normalized_lines as (
    select regexp_replace(
      btrim(source.line),
      '^[-*][[:space:]]+',
      ''
    ) as line
    from regexp_split_to_table(target_body, E'\\r?\\n') as source(line)
  ),
  matching_values as (
    select btrim(substr(line, char_length(target_label) + 1)) as value
    from normalized_lines
    where left(line, char_length(target_label)) = target_label
  )
  select case when count(*) = 1 then min(value) else null end
  from matching_values;
$$;

revoke all on function private.legal_document_single_labeled_value(text, text)
from public, anon, authenticated, service_role;

create or replace function private.legal_document_has_valid_privacy_contacts(
  target_body text
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  contact_email text := private.legal_document_single_labeled_value(
    target_body, '개인정보 및 앱 이용 문의:'
  );
  support_provider_address text := private.legal_document_single_labeled_value(
    target_body, '지원 이메일 공급자 및 확정 주소:'
  );
  legal_identity text := private.legal_document_single_labeled_value(
    target_body, '개인정보 처리자의 법적 성명 또는 명칭:'
  );
  phone_contact text := private.legal_document_single_labeled_value(
    target_body, '전화번호 등 연락처:'
  );
  supabase_contact text := private.legal_document_single_labeled_value(
    target_body, 'Supabase 수신자 연락처:'
  );
  expo_contact text := private.legal_document_single_labeled_value(
    target_body, 'Expo 수신자 연락처:'
  );
  platform_contact text := private.legal_document_single_labeled_value(
    target_body, 'Apple·Google 수신자 연락처 또는 정책 확인 경로:'
  );
  email_pattern constant text :=
    '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';
  contact_channel_pattern constant text :=
    '(https://[^[:space:]]+|[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+)';
  phone_pattern constant text :=
    '[+]?[0-9]{1,3}[-.[:space:]]?0?[0-9]{1,3}[-.[:space:]]?[0-9]{3,4}[-.[:space:]]?[0-9]{4}';
begin
  return coalesce(
    contact_email ~* email_pattern
      and position(lower(contact_email) in lower(support_provider_address)) > 0
      and phone_contact ~ phone_pattern
      and legal_identity ~ '[A-Za-z가-힣]'
      and legal_identity !~* '(담당자|서면|승인|검토|확인|기록|의견서|완료)'
      and position('@' in legal_identity) = 0
      and position('https://' in lower(legal_identity)) = 0
      and legal_identity !~ phone_pattern
      and supabase_contact ~* contact_channel_pattern
      and expo_contact ~* contact_channel_pattern
      and platform_contact ~* contact_channel_pattern,
    false
  );
end;
$$;

revoke all on function private.legal_document_has_valid_privacy_contacts(text)
from public, anon, authenticated, service_role;

create or replace function private.legal_document_has_valid_terms_provider_details(
  target_body text
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  legal_identity text := private.legal_document_single_labeled_value(
    target_body, '서비스 제공자의 법적 성명 또는 명칭:'
  );
  address_and_phone text := private.legal_document_single_labeled_value(
    target_body, '주소 및 전화번호:'
  );
  contact_email text := private.legal_document_single_labeled_value(
    target_body, '서비스 문의:'
  );
  phone_pattern constant text :=
    '[+]?[0-9]{1,3}[-.[:space:]]?0?[0-9]{1,3}[-.[:space:]]?[0-9]{3,4}[-.[:space:]]?[0-9]{4}';
  address_pattern constant text :=
    '(특별자치도|특별자치시|광역시|특별시|[가-힣]+(도|시|군|구|읍|면|동|로|길)|(^|[^A-Za-z])(street|st[.]?|road|rd[.]?|avenue|ave[.]?|boulevard|blvd[.]?|lane|ln[.]?|drive|dr[.]?)([^A-Za-z]|$))';
begin
  return coalesce(
    legal_identity ~ '[A-Za-z가-힣]'
      and legal_identity !~* '(담당자|서면|승인|검토|확인|기록|의견서|완료)'
      and position('@' in legal_identity) = 0
      and position('https://' in lower(legal_identity)) = 0
      and legal_identity !~ phone_pattern
      and address_and_phone ~ phone_pattern
      and address_and_phone ~* address_pattern
      and contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$',
    false
  );
end;
$$;

revoke all on function private.legal_document_has_valid_terms_provider_details(text)
from public, anon, authenticated, service_role;

-- Keep the database publication/registration boundary in exact parity with
-- packages/domain/src/legal.ts PRIVACY_OPERATIONAL_LABELS. A single helper is
-- used by both direct owner publication and the runtime store-ready predicate.
create or replace function private.legal_document_has_completed_privacy_operational_details(
  target_body text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select private.legal_document_has_confirmed_value(
      target_body, '공개 콘텐츠·보안 로그의 실제 처리 항목과 보유기간:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '공개 콘텐츠·보안 로그 처리의 법적 근거:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '비활성 정보 보유 기간:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '발송 기록 보유 기간:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '정기 삭제 주기:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '기기 내 저장 자료의 삭제 방법과 운영체제 백업·재설치 설정:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, 'Supabase 수신자 연락처:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, 'Expo 수신자 연락처:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, 'Apple·Google 수신자 연락처 또는 정책 확인 경로:'
    )
    and private.legal_document_has_confirmed_value(target_body, '수탁자:')
    and private.legal_document_has_confirmed_value(target_body, '이전 국가:')
    and private.legal_document_has_confirmed_value(target_body, '이전 항목:')
    and private.legal_document_has_confirmed_value(
      target_body, '이전 시점 및 방법:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '국외 처리 보유 기간:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '이전 거부 방법 및 효과:'
    )
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
      target_body, '권리행사 접수·본인 또는 정당한 대리인 확인·처리·회신 방법:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 문의 처리의 법적 근거:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 이메일 공급자 및 확정 주소:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 문의 보유·삭제 기준:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 문의 보유·삭제 운영 증빙:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 이메일 공급자의 법적 역할·처리 근거:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '지원 이메일 공급자의 처리 국가:'
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
    and private.legal_document_has_valid_privacy_contacts(target_body);
$$;

revoke all on function
  private.legal_document_has_completed_privacy_operational_details(text)
from public, anon, authenticated, service_role;

create or replace function private.legal_document_has_completed_terms_operational_details(
  target_body text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select private.legal_document_has_confirmed_value(
      target_body, '서비스 제공자의 법적 성명 또는 명칭:'
    )
    and private.legal_document_has_confirmed_value(
      target_body, '주소 및 전화번호:'
    )
    and private.legal_document_has_confirmed_value(target_body, '준거법:')
    and private.legal_document_has_confirmed_value(target_body, '관할:')
    and private.legal_document_has_confirmed_value(target_body, '면책 범위:')
    and private.legal_document_has_confirmed_value(
      target_body, '미성년자 이용 안내:'
    )
    and private.legal_document_has_valid_terms_provider_details(target_body);
$$;

revoke all on function
  private.legal_document_has_completed_terms_operational_details(text)
from public, anon, authenticated, service_role;

-- Legacy callers retain the historical helper name, but its contents now
-- exactly compose the same required-disclosure and operational checks used by
-- TypeScript instead of carrying a hidden, stronger phrase list.
create or replace function private.legal_document_has_sensitive_notification_disclosure(
  target_body text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select private.legal_document_has_required_app_privacy_disclosures(target_body)
    and private.legal_document_has_completed_privacy_operational_details(target_body);
$$;

revoke all on function
  private.legal_document_has_sensitive_notification_disclosure(text)
from public, anon, authenticated, service_role;

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
        not private.legal_document_has_required_app_privacy_disclosures(
          target_body
        )
        or not private.legal_document_has_sensitive_notification_disclosure(target_body)
        or not private.legal_document_has_completed_privacy_operational_details(
          target_body
        )
      )
    )
    or (
      target_type = 'terms_of_service'
      and not private.legal_document_has_completed_terms_operational_details(
        target_body
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
      and private.legal_document_has_required_app_privacy_disclosures(
        legal.body
      )
      and private.legal_document_has_sensitive_notification_disclosure(legal.body)
      and private.legal_document_has_completed_privacy_operational_details(
        legal.body
      )
  );
$$;

revoke all on function private.current_store_ready_privacy_policy_exists()
from public, anon, authenticated, service_role;

commit;
