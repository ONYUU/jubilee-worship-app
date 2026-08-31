begin;

-- Keep empty-equivalent handling in exact parity with the TypeScript legal
-- validator. The legacy implementation only rejected exact values and could
-- therefore accept variants such as "N/A:" or "해당   없음." through a direct RPC.
create or replace function private.legal_document_has_confirmed_value(
  target_body text,
  target_label text
)
returns boolean
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
  select count(*) = 1
    and bool_and(
      char_length(value) >= 2
      and value ~ '[A-Za-z0-9가-힣]'
      and value !~* '^(N/?A|해당[[:space:]]*없음)[:.!]?$'
      and value !~* (
        '(\\[\\[|\\]\\]|미정|추후|'
        || '(확인|검토|확정|입력|기입|작성)[[:space:]]*'
        || '(필요|예정|중|대기))'
      )
      and value !~* (
        '^[[:space:]]*((내용|최종)[[:space:]]*)*'
        || '((확인|검토|확정|완료|입력|기입|작성)'
        || '(됨|함)?[[:space:]]*)+[:.!]?[[:space:]]*$'
      )
    )
  from matching_values;
$$;

revoke all on function private.legal_document_has_confirmed_value(text, text)
from public, anon, authenticated, service_role;

-- Exact parity with packages/domain/src/legal.ts. In addition to candidate
-- support text, fail closed while any future-tense contract or legal-review
-- statement from the draft template remains in the body.
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

revoke all on function
  private.legal_document_has_required_app_privacy_disclosures(text)
from public, anon, authenticated, service_role;

-- A legal draft may name any verified mail provider, but the final inquiry
-- address must be the same locked address served by site_settings(id = 1).
-- Changing that address therefore requires a reviewed data migration in
-- addition to the matching application constant and store metadata updates.
create or replace function private.legal_document_has_valid_privacy_contacts(
  target_body text
)
returns boolean
language plpgsql
stable
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
  locked_contact_email text := (
    select site.contact_email
    from public.site_settings as site
    where site.id = 1
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
      and contact_email = locked_contact_email
      and position(contact_email in support_provider_address) > 0
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
stable
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
  locked_contact_email text := (
    select site.contact_email
    from public.site_settings as site
    where site.id = 1
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
      and contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and contact_email = locked_contact_email,
    false
  );
end;
$$;

revoke all on function private.legal_document_has_valid_terms_provider_details(text)
from public, anon, authenticated, service_role;

alter function private.legal_document_has_completed_privacy_operational_details(text)
stable;
alter function private.legal_document_has_completed_terms_operational_details(text)
stable;
alter function private.legal_document_has_sensitive_notification_disclosure(text)
stable;

commit;
