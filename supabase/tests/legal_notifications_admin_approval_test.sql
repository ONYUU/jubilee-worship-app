begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(140);

create function pg_temp.reviewed_privacy_body(target_note text)
returns text
language sql
as $$
  select E'쥬빌리 워십 설치 식별자 푸시 토큰 알림 선택 보유 비활성화\n'
    || target_note || E'\n'
    || E'개인정보 및 앱 이용 문의: sundoojubileeworship@gmail.com\n'
    || E'알림 제공에만 사용합니다. 종교적 관심을 추론할 수 있어 별도 동의를 받고 동의 버전과 동의 시각을 기록합니다. 「개인정보 보호법」 제15조제1항제1호 및 제23조제1항제1호(민감정보 별도 동의)를 근거로 합니다. 이름·이메일·광고 식별자와 결합하지 않고 광고·추적·이용자 프로파일링에 사용하지 않습니다. 수신 알림은 기기에 최대 50건·90일 저장하고 서버로 다시 전송하지 않습니다. 자동화된 결정을 하지 않고 광고 SDK를 사용하지 않습니다.\n'
    || E'운영체제 기기 푸시 토큰(APNs 또는 FCM)과 Expo 앱 설치 식별자를 사용해 Expo 푸시 토큰을 발급·갱신합니다. 실제 알림 발송 때 알림 제목·본문·딥링크, 대상 종류·관련 예배 일정, 발송 승인·대기 상태, 설치별 발송 시도, 티켓·영수증·오류를 처리합니다. Apple 또는 Google은 운영체제 기기 푸시 토큰과 알림 내용을 처리합니다. 철회할 때 Expo의 운영체제 토큰 자동 갱신을 끄고 APNs 또는 FCM 기기 토큰 등록 해제를 요청하며, 실패하면 보안저장소에 정리 대기 상태를 남깁니다.\n'
    || E'SUPABASE PTE. LTD. 대한민국 서울(ap-northeast-2) Supabase Data API 분산 요청 제한 검증값은 재사용할 수 없도록 해시합니다. 신규 등록은 출처별 하루 100회, 전체 하루 500회로 제한하고 일일 가명 카운터는 최대 약 25시간 5분 보유됩니다. 650 Industries, Inc. Expo Apple·Google 처리 미국 만 14세\n'
    || E'공개 콘텐츠·보안 로그의 실제 처리 항목과 보유기간: IP·요청 경로 로그 30일\n공개 콘텐츠·보안 로그 처리의 법적 근거: 개인정보보호법 시험 근거\n비활성 정보 보유 기간: 30일\n발송 기록 보유 기간: 90일\n정기 삭제 주기: 매일 1회\n기기 내 저장 자료의 삭제 방법과 운영체제 백업·재설치 설정: 앱 데이터 삭제와 재설치 검증 기록\nSupabase 수신자 연락처: privacy@example.invalid\nExpo 수신자 연락처: privacy@example.invalid\nApple·Google 수신자 연락처 또는 정책 확인 경로: https://example.invalid/privacy\n수탁자: 시험 처리자\n이전 국가: 시험 국가\n이전 항목: 설치 식별자 및 푸시 토큰\n이전 시점 및 방법: 서비스 이용 시 HTTPS 전송\n국외 처리 보유 기간: 30일\n이전 거부 방법 및 효과: 알림 해제 시 알림 기능 중단\n'
    || E'개인정보 처리자의 법적 성명 또는 명칭: 시험 운영자\n개인정보 보호책임자 또는 고충처리 담당부서: 개인정보팀\n전화번호 등 연락처: 032-000-0000\n국외 처리 법적 근거(법률 검토 후 확정): 개인정보보호법 시험 근거\n권리행사 접수·본인 또는 정당한 대리인 확인·처리·회신 방법: 지원 메일 접수 후 설치 증명값 확인\n지원 문의 처리의 법적 근거: 개인정보보호법 시험 근거\n지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) sundoojubileeworship@gmail.com\n지원 이메일 공급자의 법적 역할·처리 근거: 수탁 처리 및 문의 응대 근거\n지원 이메일 공급자의 처리 국가: 시험 국가\n지원 문의 보유·삭제 기준: 해결 후 90일\n지원 문의 보유·삭제 운영 증빙: 매월 1일 삭제 대상 점검 기록\n알림의 만 14세 이상 제한 또는 법정대리인 동의 절차: 최초 활성화 전에 ‘만 14세 이상입니다’ 확인과 민감정보 별도 동의를 모두 받아 서버 시각으로 기록합니다.\n실제 시행일: 2026-09-01\n오너 최종 사실확인: 2026-09-01 서면 승인\n법률 전문가 검토 상태: 2026-09-01 의견서 수령';
$$;

create function pg_temp.reviewed_terms_body()
returns text
language sql
as $$
  select E'쥬빌리 워십\n서비스 문의: sundoojubileeworship@gmail.com\n서비스 제공자의 법적 성명 또는 명칭: 시험 운영자\n주소 및 전화번호: 대한민국 인천광역시 부평구 예시로 123, 032-123-4567\n준거법: 대한민국 법령\n관할: 민사소송법상 관할 법원\n면책 범위: 관련 법령이 허용하는 범위\n미성년자 이용 안내: 알림은 만 14세 이상만 이용';
$$;

select ok(
  private.legal_document_has_confirmed_value(
    E'연령 절차: 최초 활성화 전에 ‘만 14세 이상입니다’ 확인과 별도 동의를 받아 서버 시각으로 기록합니다.',
    '연령 절차:'
  )
  and not private.legal_document_has_confirmed_value(
    E'연령 절차: 확인 필요',
    '연령 절차:'
  )
  and not private.legal_document_has_confirmed_value(
    E'연령 절차: 내용 확인 완료함',
    '연령 절차:'
  )
  and not private.legal_document_has_confirmed_value(
    E'연령 절차: N/A:',
    '연령 절차:'
  )
  and not private.legal_document_has_confirmed_value(
    E'연령 절차: 해당   없음.',
    '연령 절차:'
  ),
  'confirmed-value validation allows factual text but rejects placeholders and TypeScript-equivalent empty values'
);

select ok(
  private.legal_document_has_sensitive_notification_disclosure(
    pg_temp.reviewed_privacy_body('공급자 중립 게이트 검증')
  )
  and position(
    'Google Workspace' in pg_temp.reviewed_privacy_body('공급자 중립 게이트 검증')
  ) = 0
  and position(
    'sundoojubileeworship@gmail.com'
    in pg_get_functiondef(
      'private.legal_document_has_valid_privacy_contacts(text)'::regprocedure
    )
  ) = 0,
  'provider-neutral privacy disclosure passes while the validator contains no provider-specific address hard-code'
);

select ok(
  not private.legal_document_has_sensitive_notification_disclosure(
    replace(
      pg_temp.reviewed_privacy_body('공급자 중립 게이트 검증'),
      '지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) sundoojubileeworship@gmail.com',
      '지원 이메일 공급자 및 확정 주소: [[오너 확인 필요]]'
    )
  ),
  'support provider and confirmed address rejects an owner-review placeholder'
);

select ok(
  not private.legal_document_has_sensitive_notification_disclosure(
    replace(
      pg_temp.reviewed_privacy_body('공급자 중립 게이트 검증'),
      '지원 이메일 공급자의 법적 역할·처리 근거: 수탁 처리 및 문의 응대 근거',
      '지원 이메일 공급자의 법적 역할·처리 근거: 검토 예정'
    )
  ),
  'support provider legal role and basis rejects a review placeholder'
);

select ok(
  not private.legal_document_has_sensitive_notification_disclosure(
    replace(
      pg_temp.reviewed_privacy_body('공급자 중립 게이트 검증'),
      '지원 이메일 공급자의 처리 국가: 시험 국가',
      '지원 이메일 공급자의 처리 국가: 미정'
    )
  ),
  'support provider processing country rejects an unresolved value'
);

select ok(
  not private.legal_document_has_sensitive_notification_disclosure(
    replace(
      pg_temp.reviewed_privacy_body('공급자 중립 게이트 검증'),
      '지원 문의 보유·삭제 기준: 해결 후 90일',
      '지원 문의 보유·삭제 기준: 해당 없음'
    )
  ),
  'support retention and deletion rule rejects a not-applicable value'
);

select ok(
  not private.legal_document_has_sensitive_notification_disclosure(
    replace(
      pg_temp.reviewed_privacy_body('공급자 중립 게이트 검증'),
      '지원 문의 보유·삭제 운영 증빙: 매월 1일 삭제 대상 점검 기록',
      '지원 문의 보유·삭제 운영 증빙: 최종 확인 완료'
    )
  ),
  'support retention and deletion evidence rejects a process-only placeholder'
);

select ok(
  not private.legal_document_has_sensitive_notification_disclosure(
    pg_temp.reviewed_privacy_body('공급자 중립 게이트 검증')
      || E'\n지원 이메일 공급자 및 확정 주소: 중복공급자 duplicate@example.invalid'
  ),
  'support provider and confirmed address rejects duplicate exact labels'
);

select ok(
  position(
    'Google Workspace'
    in pg_get_functiondef('public.publish_legal_document(bigint)'::regprocedure)
  ) = 0
  and position(
    'sundoojubileeworship@gmail.com'
    in pg_get_functiondef('public.publish_legal_document(bigint)'::regprocedure)
  ) = 0
  and position(
    'Google Workspace'
    in pg_get_functiondef(
      'private.current_store_ready_privacy_policy_exists()'::regprocedure
    )
  ) = 0
  and position(
    'sundoojubileeworship@gmail.com'
    in pg_get_functiondef(
      'private.current_store_ready_privacy_policy_exists()'::regprocedure
    )
  ) = 0
  and position(
    'sundoojubileeworship@gmail.com'
    in pg_get_functiondef(
      'private.legal_document_has_valid_terms_provider_details(text)'::regprocedure
    )
  ) = 0,
  'direct publish and store-ready gate definitions contain no provider-specific support hard-code'
);

select ok(
  private.legal_document_has_completed_privacy_operational_details(
    pg_temp.reviewed_privacy_body('전체 운영 라벨 검증')
  ),
  'database operational helper accepts a policy containing every TypeScript privacy operational label'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      '공개 콘텐츠·보안 로그의 실제 처리 항목과 보유기간:',
      '공개 콘텐츠·보안 로그 처리의 법적 근거:',
      '비활성 정보 보유 기간:',
      '발송 기록 보유 기간:',
      '정기 삭제 주기:',
      '기기 내 저장 자료의 삭제 방법과 운영체제 백업·재설치 설정:',
      'Supabase 수신자 연락처:',
      'Expo 수신자 연락처:',
      'Apple·Google 수신자 연락처 또는 정책 확인 경로:',
      '수탁자:',
      '이전 국가:',
      '이전 항목:',
      '이전 시점 및 방법:',
      '국외 처리 보유 기간:',
      '이전 거부 방법 및 효과:',
      '개인정보 처리자의 법적 성명 또는 명칭:',
      '개인정보 보호책임자 또는 고충처리 담당부서:',
      '전화번호 등 연락처:',
      '국외 처리 법적 근거(법률 검토 후 확정):',
      '권리행사 접수·본인 또는 정당한 대리인 확인·처리·회신 방법:',
      '지원 문의 처리의 법적 근거:',
      '지원 이메일 공급자 및 확정 주소:',
      '지원 문의 보유·삭제 기준:',
      '지원 문의 보유·삭제 운영 증빙:',
      '지원 이메일 공급자의 법적 역할·처리 근거:',
      '지원 이메일 공급자의 처리 국가:',
      '알림의 만 14세 이상 제한 또는 법정대리인 동의 절차:',
      '실제 시행일:',
      '오너 최종 사실확인:',
      '법률 전문가 검토 상태:'
    ]::text[]) as required(label)
    where private.legal_document_has_completed_privacy_operational_details(
      replace(
        pg_temp.reviewed_privacy_body('전체 운영 라벨 검증'),
        required.label,
        '제거된 운영 라벨:'
      )
    )
  ),
  'database operational helper rejects removal of each TypeScript privacy operational label'
);

select ok(
  private.legal_document_has_required_app_privacy_disclosures(
    pg_temp.reviewed_privacy_body('전체 필수 고지 검증')
  ),
  'database disclosure helper accepts every TypeScript required privacy disclosure'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      '설치 식별자',
      '푸시 토큰',
      '알림 선택',
      '종교적 관심',
      '이름·이메일',
      '광고 식별자',
      '결합하지 않고',
      '알림 제공',
      '에만 사용',
      '광고·추적·이용자 프로파일링에 사용하지 않습니다',
      '별도 동의',
      '동의 버전',
      '동의 시각',
      '보유',
      '비활성화',
      'SUPABASE PTE. LTD.',
      '650 Industries, Inc.',
      'Apple·Google 처리',
      '대한민국 서울(ap-northeast-2)',
      '미국',
      'Supabase Data API',
      '분산 요청 제한',
      '하루 100회',
      '하루 500회',
      '25시간 5분',
      '재사용할 수 없도록',
      '「개인정보 보호법」 제15조제1항제1호',
      '제23조제1항제1호(민감정보 별도 동의)',
      '최대 50건·90일',
      '서버로 다시 전송하지 않습니다',
      '자동화된 결정',
      '광고 SDK',
      '지원 이메일 공급자 및 확정 주소:',
      '지원 문의 보유·삭제 기준:',
      '지원 문의 보유·삭제 운영 증빙:',
      '지원 이메일 공급자의 법적 역할·처리 근거:',
      '만 14세',
      '운영체제 기기 푸시 토큰(APNs 또는 FCM)',
      'Expo 앱 설치 식별자',
      'Expo 푸시 토큰을 발급·갱신',
      '실제 알림 발송 때',
      '알림 제목·본문·딥링크',
      '티켓·영수증·오류',
      'Apple 또는 Google은 운영체제 기기 푸시 토큰',
      '대상 종류·관련 예배 일정',
      '발송 승인·대기 상태',
      '설치별 발송 시도',
      'Expo의 운영체제 토큰 자동 갱신을 끄고',
      'APNs 또는 FCM 기기 토큰 등록 해제',
      '보안저장소에 정리 대기 상태'
    ]::text[]) as required(term)
    where private.legal_document_has_required_app_privacy_disclosures(
      replace(
        pg_temp.reviewed_privacy_body('전체 필수 고지 검증'),
        required.term,
        '제거된 필수 고지'
      )
    )
  ),
  'database disclosure helper rejects removal of each TypeScript required privacy disclosure'
);

select ok(
  not private.legal_document_has_required_app_privacy_disclosures(
    pg_temp.reviewed_privacy_body('검증되지 않은 과거 주장 차단')
      || E'\n계약·서비스 운영주체는 싱가포르 법인 SUPABASE PTE. LTD.'
  ),
  'database disclosure helper rejects the same unverified legacy claim as TypeScript'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      'Gmail 기반 후보·임시 문의 주소',
      '최종 지원 이메일 공급자와 주소로 확정되지 않았습니다',
      '확인하기 전에는 이 정책을 공개하지 않습니다',
      '공급자별 법적 역할, 계약 당사자, 재위탁 구조, 국외 이전 근거는 실제 계정에 적용되는 최신 계약과 설정을 기준으로 확정합니다',
      '실제 계정에 적용되는 최신 계약·위탁 구조를 공개 전에 확정합니다',
      '이 연령 확인 방식의 법률적 충분성과 스토어 연령 설정의 정합성은 공개 전에 법률 전문가가 최종 검토합니다',
      '검토가 끝나기 전에는 개인정보처리방침을 공개하거나 알림 등록을 활성화하지 않습니다'
    ]::text[]) as unresolved(claim)
    where private.legal_document_has_required_app_privacy_disclosures(
      pg_temp.reviewed_privacy_body('지원 채널 전환 문구 차단')
        || E'\n' || unresolved.claim
    )
  ),
  'database disclosure helper rejects every unresolved support-channel transition claim'
);

select ok(
  not private.legal_document_has_completed_privacy_operational_details(
    replace(
      pg_temp.reviewed_privacy_body('문의 이메일 일치 검증'),
      '개인정보 및 앱 이용 문의: sundoojubileeworship@gmail.com',
      '개인정보 및 앱 이용 문의: other@example.invalid'
    )
  )
  and not private.legal_document_has_completed_privacy_operational_details(
    replace(
      replace(
        pg_temp.reviewed_privacy_body('잠금 연락처 일치 검증'),
        '개인정보 및 앱 이용 문의: sundoojubileeworship@gmail.com',
        '개인정보 및 앱 이용 문의: other@example.invalid'
      ),
      '지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) sundoojubileeworship@gmail.com',
      '지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) other@example.invalid'
    )
  )
  and not private.legal_document_has_completed_privacy_operational_details(
    replace(
      replace(
        pg_temp.reviewed_privacy_body('대소문자 잠금 연락처 일치 검증'),
        '개인정보 및 앱 이용 문의: sundoojubileeworship@gmail.com',
        '개인정보 및 앱 이용 문의: SUNDOOJUBILEEWORSHIP@GMAIL.COM'
      ),
      '지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) sundoojubileeworship@gmail.com',
      '지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) SUNDOOJUBILEEWORSHIP@GMAIL.COM'
    )
  )
  and not private.legal_document_has_completed_privacy_operational_details(
    replace(
      pg_temp.reviewed_privacy_body('전화번호 형식 검증'),
      '전화번호 등 연락처: 032-000-0000',
      '전화번호 등 연락처: 2026-09-01 서면 승인 기록'
    )
  )
  and not private.legal_document_has_completed_privacy_operational_details(
    replace(
      pg_temp.reviewed_privacy_body('수신자 채널 형식 검증'),
      'Supabase 수신자 연락처: privacy@example.invalid',
      'Supabase 수신자 연락처: 공식 지원 포털'
    )
  )
  and not private.legal_document_has_completed_privacy_operational_details(
    replace(
      pg_temp.reviewed_privacy_body('법적 명칭 형식 검증'),
      '개인정보 처리자의 법적 성명 또는 명칭: 시험 운영자',
      '개인정보 처리자의 법적 성명 또는 명칭: 2026-09-01 담당자 서면 승인 기록'
    )
  )
  and not private.legal_document_has_completed_privacy_operational_details(
    replace(
      pg_temp.reviewed_privacy_body('법적 명칭 이메일 혼합 검증'),
      '개인정보 처리자의 법적 성명 또는 명칭: 시험 운영자',
      '개인정보 처리자의 법적 성명 또는 명칭: 주빌리 담당 org@example.com'
    )
  )
  and not private.legal_document_has_completed_privacy_operational_details(
    replace(
      pg_temp.reviewed_privacy_body('법적 명칭 URL 혼합 검증'),
      '개인정보 처리자의 법적 성명 또는 명칭: 시험 운영자',
      '개인정보 처리자의 법적 성명 또는 명칭: HTTPS://example.com 운영자'
    )
  ),
  'privacy operational gate rejects mismatched email and non-contact or non-identity field values'
);

select ok(
  private.legal_document_has_completed_terms_operational_details(
    pg_temp.reviewed_terms_body()
  )
  and not private.legal_document_has_completed_terms_operational_details(
    replace(
      pg_temp.reviewed_terms_body(),
      '대한민국 인천광역시 부평구 예시로 123, 032-123-4567',
      '2026-09-01 주소·전화 서면 승인 기록'
    )
  )
  and not private.legal_document_has_completed_terms_operational_details(
    replace(
      pg_temp.reviewed_terms_body(),
      '서비스 제공자의 법적 성명 또는 명칭: 시험 운영자',
      '서비스 제공자의 법적 성명 또는 명칭: 담당자 서면 승인 기록'
    )
  )
  and not private.legal_document_has_completed_terms_operational_details(
    replace(
      pg_temp.reviewed_terms_body(),
      '서비스 문의: sundoojubileeworship@gmail.com',
      '서비스 문의: other@example.invalid'
    )
  )
  and not private.legal_document_has_completed_terms_operational_details(
    replace(
      pg_temp.reviewed_terms_body(),
      '서비스 문의: sundoojubileeworship@gmail.com',
      '서비스 문의: SUNDOOJUBILEEWORSHIP@GMAIL.COM'
    )
  ),
  'terms operational gate requires a legal identity, service email, and address with phone number'
);

select ok(
  private.legal_document_has_completed_privacy_operational_details(
    replace(
      pg_temp.reviewed_privacy_body('불릿 공백 정규화 검증'),
      'Supabase 수신자 연락처: privacy@example.invalid',
      '- Supabase 수신자 연락처: privacy@example.invalid'
    )
  )
  and not private.legal_document_has_completed_privacy_operational_details(
    replace(
      pg_temp.reviewed_privacy_body('불릿 공백 정규화 검증'),
      'Supabase 수신자 연락처: privacy@example.invalid',
      '-Supabase 수신자 연락처: privacy@example.invalid'
    )
  ),
  'database and TypeScript label matchers both require whitespace after a bullet marker'
);

select ok(
  position(
    'legal_document_has_completed_privacy_operational_details'
    in pg_get_functiondef('public.publish_legal_document(bigint)'::regprocedure)
  ) > 0
  and position(
    'legal_document_has_required_app_privacy_disclosures'
    in pg_get_functiondef('public.publish_legal_document(bigint)'::regprocedure)
  ) > 0
  and position(
    'legal_document_has_completed_privacy_operational_details'
    in pg_get_functiondef(
      'private.current_store_ready_privacy_policy_exists()'::regprocedure
    )
  ) > 0
  and position(
    'legal_document_has_required_app_privacy_disclosures'
    in pg_get_functiondef(
      'private.current_store_ready_privacy_policy_exists()'::regprocedure
    )
  ) > 0
  and position(
    'legal_document_has_required_app_privacy_disclosures'
    in pg_get_functiondef(
      'private.legal_document_has_sensitive_notification_disclosure(text)'::regprocedure
    )
  ) > 0
  and position(
    'legal_document_has_completed_privacy_operational_details'
    in pg_get_functiondef(
      'private.legal_document_has_sensitive_notification_disclosure(text)'::regprocedure
    )
  ) > 0
  and position(
    '이름·이메일'
    in pg_get_functiondef(
      'private.legal_document_has_sensitive_notification_disclosure(text)'::regprocedure
    )
  ) = 0,
  'direct publish, runtime, and legacy sensitive predicates share the disclosure and operational helpers without hidden phrases'
);

-- 1
select ok(
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.legal_documents'::regclass
  ),
  'legal_documents has RLS enabled'
);

-- 2
select is(
  (
    select count(*)
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'private'
      and relation.relname in (
        'app_installations', 'notification_subscriptions', 'push_endpoints',
        'notification_campaigns', 'notification_outbox', 'notification_deliveries'
      )
      and relation.relrowsecurity
  ),
  6::bigint,
  'all six notification tables have RLS enabled'
);

-- 3
select ok(
  'security_invoker=true' = any (
    coalesce(
      (select reloptions from pg_class where oid = 'public.public_legal_documents'::regclass),
      array[]::text[]
    )
  ),
  'public_legal_documents is a security_invoker view'
);

-- 4
select ok(
  'security_barrier=true' = any (
    coalesce(
      (select reloptions from pg_class where oid = 'public.public_legal_documents'::regclass),
      array[]::text[]
    )
  ),
  'public_legal_documents is a security barrier'
);

-- 5
select ok(
  has_table_privilege('anon', 'public.public_legal_documents', 'SELECT'),
  'anon can read the legal DTO view'
);

-- 6
select ok(
  has_table_privilege('authenticated', 'public.public_legal_documents', 'SELECT'),
  'authenticated can read the legal DTO view'
);

-- 7
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'legal_documents'
      and grantee in ('anon', 'authenticated')
      and privilege_type = 'SELECT'
  ),
  0::bigint,
  'legal source table has no broad public SELECT grant'
);

-- 8
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name in (
        'app_installations', 'notification_subscriptions', 'push_endpoints',
        'notification_campaigns', 'notification_outbox', 'notification_deliveries'
      )
      and grantee in ('anon', 'authenticated')
  ),
  0::bigint,
  'anon and authenticated have no direct notification table privileges'
);

-- 9
select is(
  (
    select count(*)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name like 'service_%'
      and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'service Edge RPCs are not executable by public roles'
);

-- 10
select is(
  (
    select count(distinct routine_name)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name like 'service_%'
      and grantee = 'service_role'
      and privilege_type = 'EXECUTE'
  ),
  13::bigint,
  'service_role can execute the thirteen current worker and maintenance RPCs'
);

-- 11
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'admin_users'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ),
  0::bigint,
  'authenticated cannot mutate admin membership directly'
);

-- 12
select is(
  (
    select count(*)
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'admin_users'
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
      and column_name in ('approved_by', 'approved_at', 'created_at', 'updated_at')
  ),
  4::bigint,
  'admin approval metadata has explicit authenticated SELECT grants'
);

-- 13
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'legal_documents'
      and column_name in ('created_by', 'updated_by', 'published_by', 'withdrawn_by')
      and grantee in ('anon', 'authenticated')
      and privilege_type = 'SELECT'
  ),
  'legal audit UUIDs are not selectable by public roles'
);

-- 14
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'legal_documents'
      and column_name in ('status', 'published_at', 'published_by', 'withdrawn_at', 'withdrawn_by')
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE')
  ),
  'legal publication state is server-derived'
);

-- 15
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'legal_documents_one_published_type_idx'
      and indexdef like '%WHERE (status = ''published''::text)%'
  ),
  'each legal document type has at most one published row'
);

-- 16
select is(
  (
    select count(*)
    from pg_constraint
    where conrelid in (
      'private.notification_campaigns'::regclass,
      'private.notification_outbox'::regclass
    )
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%dedupe_key%'
  ),
  2::bigint,
  'campaign and outbox both enforce dedupe keys'
);

-- 17
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'private'
      and table_name = 'app_installations'
      and column_name in ('secret', 'installation_secret', 'secret_plaintext')
  ),
  'installation secret plaintext has no database column'
);

-- 18
select ok(
  (
    select pg_get_constraintdef(constraint_row.oid)
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'private.app_installations'::regclass
      and pg_get_constraintdef(constraint_row.oid) like '%secret_hash%'
    limit 1
  ) like '%[0-9a-f]{64}%',
  'installation secret hash is constrained to lowercase SHA-256 hex'
);

-- 19
select is(
  (select public from storage.buckets where id = 'gallery-staging'),
  false,
  'gallery staging bucket is private'
);

-- 20
select ok(
  (
    select
      pg_get_expr(policy.polwithcheck, policy.polrelid) like '%app-gallery%'
      and pg_get_expr(policy.polwithcheck, policy.polrelid) like '%is_owner%'
    from pg_policy as policy
    where policy.polname = 'public_media_admin_insert'
      and policy.polrelid = 'storage.objects'::regclass
  ),
  'public app-gallery object writes include an owner gate'
);

-- 21
select ok(
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name in ('gallery_items', 'guide_sections')
      and column_name = 'published'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE')
  ),
  'gallery and guide published flags cannot be written directly'
);

-- 22
select is(
  (
    select count(*)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name in (
        'publish_legal_document', 'withdraw_legal_document',
        'set_gallery_item_consent', 'set_gallery_item_published',
        'set_guide_section_published', 'verify_event_setlist_playlist',
        'verify_setlist_item_youtube'
      )
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'anon cannot execute owner publication RPCs'
);

-- 23
select is(
  (
    select string_agg(column_name::text, ',' order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'public_legal_documents'
  ),
  'id,document_type,version,title,body,effective_on,published_at'::text,
  'public legal DTO contains only the intended seven columns'
);

-- 24
select is(
  (
    select count(distinct routine_name)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name in (
        'approve_admin_user', 'set_admin_user_active', 'set_admin_user_role'
      )
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ),
  3::bigint,
  'authenticated sessions can call the three owner-gated admin RPCs'
);

-- 25
select is(
  (
    select count(distinct routine_name)
    from information_schema.routine_privileges
    where specific_schema = 'public'
      and routine_name in (
        'create_notification_campaign', 'update_notification_campaign',
        'delete_notification_campaign', 'list_notification_campaigns',
        'approve_notification_campaign', 'queue_notification_campaign'
      )
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ),
  6::bigint,
  'authenticated admins can call campaign RPCs whose bodies enforce role gates'
);

-- 26
select is(
  (
    select count(*)
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname like 'service_%'
      and procedure.prosecdef
      and 'search_path=""' = any (coalesce(procedure.proconfig, array[]::text[]))
  ),
  17::bigint,
  'all seventeen service RPC definitions are security definer functions with a fixed empty search path'
);

-- 27
select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name in (
        'app_installations', 'notification_subscriptions', 'push_endpoints',
        'notification_campaigns', 'notification_outbox', 'notification_deliveries'
      )
      and grantee = 'service_role'
      and privilege_type = 'SELECT'
  ),
  6::bigint,
  'service_role has explicit access to all six private notification tables'
);

-- 28
select ok(
  exists (
    select 1 from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'is_owner'
      and procedure.prosecdef
  ),
  'private.is_owner exists as a security definer predicate'
);

insert into auth.users (id, email)
values
  ('81111111-1111-4111-8111-111111111111', 'followup-owner@example.invalid'),
  ('82222222-2222-4222-8222-222222222222', 'followup-editor@example.invalid'),
  ('83333333-3333-4333-8333-333333333333', 'followup-user@example.invalid'),
  ('84444444-4444-4444-8444-444444444444', 'followup-target@example.invalid');

insert into public.admin_users (user_id, role, is_active)
values
  ('81111111-1111-4111-8111-111111111111', 'owner', true),
  ('82222222-2222-4222-8222-222222222222', 'editor', true);

insert into public.events (
  slug, title, starts_at, timezone, venue_name, address, status, published
)
values (
  'followup-security-event', 'Follow-up security event',
  statement_timestamp() + interval '7 days', 'Asia/Seoul',
  '선두교회 본당', '인천광역시 서구', 'scheduled', true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

-- 29
select lives_ok(
  $$
    insert into public.legal_documents (
      document_type, version, title, body, effective_on
    ) values (
      'privacy_policy', '1.0.0', '개인정보 처리방침',
      pg_temp.reviewed_privacy_body('첫 번째 공개 문서 본문'),
      current_date
    )
  $$,
  'an active editor can create a legal draft'
);

-- 30
select throws_ok(
  $$select public.publish_legal_document((select id from public.legal_documents where version = '1.0.0'))$$,
  '42501',
  'Active owner access required',
  'an editor cannot publish a legal document'
);

-- 31
select lives_ok(
  $$
    select public.create_notification_campaign(
      'setlist_update', '송리스트 공개', '새 송리스트가 공개되었습니다.',
      'jubileeworship://worship/followup-security-event/songlist',
      'setlist_updates',
      (select id from public.events where slug = 'followup-security-event'),
      null,
      'setlist:followup-security-event:1'
    )
  $$,
  'an active editor can create a notification campaign draft'
);

-- 32
select throws_ok(
  $$
    select public.approve_notification_campaign(
      (select id from public.list_notification_campaigns() where dedupe_key = 'setlist:followup-security-event:1')
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot approve a campaign'
);

-- 33
select throws_ok(
  $$
    select public.queue_notification_campaign(
      (select id from public.list_notification_campaigns() where dedupe_key = 'setlist:followup-security-event:1')
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot queue a campaign'
);

-- 34
select throws_ok(
  $$select public.approve_admin_user('84444444-4444-4444-8444-444444444444'::uuid)$$,
  '42501',
  'Active owner access required',
  'an editor cannot approve another administrator'
);

-- 35
select is(
  (select count(*) from public.admin_users),
  1::bigint,
  'an editor can see only their own active admin row'
);

-- 36
select lives_ok(
  $$
    insert into public.gallery_items (media_path, alt, caption, sort_order)
    values ('/images/gallery/followup-test.webp', '검증용 예배 사진', '검증용 사진', 1)
  $$,
  'an editor can create an unpublished gallery item'
);

-- 37
select throws_ok(
  $$update public.gallery_items set published = true where media_path = '/images/gallery/followup-test.webp'$$,
  '42501',
  null,
  'an editor cannot directly publish a gallery item'
);

-- 38
select lives_ok(
  $$
    insert into public.guide_sections (slug, title, body, kind, sort_order)
    values ('followup-parking', '주차 안내', '현장 안내를 따라 주세요.', 'parking', 1)
  $$,
  'an editor can create an unpublished guide section'
);

-- 39
select throws_ok(
  $$update public.guide_sections set published = true where slug = 'followup-parking'$$,
  '42501',
  null,
  'an editor cannot directly publish a guide section'
);

-- 40
select lives_ok(
  $$
    insert into public.event_setlists (event_id)
    select id from public.events where slug = 'followup-security-event'
  $$,
  'an editor can leave revision one unpublished'
);

-- 41
select lives_ok(
  $$
    insert into public.event_setlists (event_id, playlist_url)
    select id, 'https://www.youtube.com/playlist?list=PL1234567890'
    from public.events where slug = 'followup-security-event'
  $$,
  'an editor can create revision two with a YouTube playlist'
);

-- 42
select lives_ok(
  $$
    insert into public.setlist_items (
      setlist_id, position, title, artist, musical_key, youtube_url
    )
    select setlist.id, 1, '검증용 찬양', '공식 아티스트', 'G',
      'https://www.youtube.com/watch?v=O2mNdkl5q54'
    from public.event_setlists as setlist
    join public.events as event on event.id = setlist.event_id
    where event.slug = 'followup-security-event' and setlist.revision_no = 2
  $$,
  'an editor can add a linked song to the second draft'
);

-- 43
select lives_ok(
  $$
    select public.request_event_setlist_review(
      (
        select setlist.id
        from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  'an editor can request setlist review before owner link verification'
);

-- 44
select throws_ok(
  $$
    select public.verify_event_setlist_playlist(
      (
        select setlist.id from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot verify the playlist source'
);

-- 45
select throws_ok(
  $$
    select public.verify_setlist_item_youtube(
      (
        select item.id from public.setlist_items as item
        join public.event_setlists as setlist on setlist.id = item.setlist_id
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  '42501',
  'Active owner access required',
  'an editor cannot verify a song source'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 46
select throws_ok(
  $$
    select public.publish_event_setlist_revision(
      (
        select setlist.id from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  '23514',
  'A reviewed setlist with owner-verified YouTube links is required',
  'owner publication is blocked until every YouTube source is verified'
);

-- 47
select lives_ok(
  $$
    select public.verify_event_setlist_playlist(
      (
        select setlist.id from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  'an owner can verify the playlist source'
);

-- 48
select lives_ok(
  $$
    select public.verify_setlist_item_youtube(
      (
        select item.id from public.setlist_items as item
        join public.event_setlists as setlist on setlist.id = item.setlist_id
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  'an owner can verify a song source'
);

-- 49
select lives_ok(
  $$
    select public.publish_event_setlist_revision(
      (
        select setlist.id from public.event_setlists as setlist
        join public.events as event on event.id = setlist.event_id
        where event.slug = 'followup-security-event' and setlist.revision_no = 2
      )
    )
  $$,
  'an owner can publish the fully verified setlist'
);

-- 50
select results_eq(
  $$
    select revision_no, is_changed
    from public.public_event_setlists
    where event_slug = 'followup-security-event'
  $$,
  $$values (2::integer, false)$$,
  'the first actual publication is not marked changed even when it is revision two'
);

-- 51
select throws_ok(
  $$
    select public.set_gallery_item_published(
      (select id from public.gallery_items where media_path = '/images/gallery/followup-test.webp'),
      true
    )
  $$,
  '23514',
  'A consent-confirmed gallery item is required for publication',
  'gallery publication is blocked before consent confirmation'
);

-- 52
select lives_ok(
  $$
    select public.set_gallery_item_consent(
      (select id from public.gallery_items where media_path = '/images/gallery/followup-test.webp'),
      true
    )
  $$,
  'an owner can record gallery consent'
);

-- 53
select lives_ok(
  $$
    select public.set_gallery_item_published(
      (select id from public.gallery_items where media_path = '/images/gallery/followup-test.webp'),
      true
    )
  $$,
  'an owner can publish a consent-confirmed gallery item'
);

do $setup$
declare
  legacy_gallery_id bigint;
begin
  insert into public.gallery_items (media_path, alt, caption, sort_order)
  values (
    'storage://public-media/gallery/pgtap-editor-controlled.webp',
    '기존 웹 경로 차단 테스트',
    'editor가 쓰기 가능한 경로',
    990
  )
  returning id into legacy_gallery_id;

  perform public.set_gallery_item_consent(legacy_gallery_id, true);
end;
$setup$;

select throws_ok(
  $$
    select public.set_gallery_item_published(
      (
        select id from public.gallery_items
        where media_path = 'storage://public-media/gallery/pgtap-editor-controlled.webp'
      ),
      true
    )
  $$,
  '23514',
  'A consent-confirmed gallery item is required for publication',
  'an editor-writable legacy Storage locator cannot be published in the app gallery'
);

-- 54
select lives_ok(
  $$
    select public.set_guide_section_published(
      (select id from public.guide_sections where slug = 'followup-parking'),
      true
    )
  $$,
  'an owner can publish a guide section'
);

-- 55
select lives_ok(
  $$select public.publish_legal_document((select id from public.legal_documents where version = '1.0.0'))$$,
  'an owner can publish a current legal draft'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 56
select results_eq(
  $$select document_type, version, title from public.public_legal_documents$$,
  $$values ('privacy_policy'::text, '1.0.0'::text, '개인정보 처리방침'::text)$$,
  'anon reads the current legal DTO'
);

-- 57
select results_eq(
  $$select media_path, alt from public.public_gallery_items where sort_order = 1$$,
  $$values ('/images/gallery/followup-test.webp'::text, '검증용 예배 사진'::text)$$,
  'anon sees the owner-published gallery item'
);

-- 58
select results_eq(
  $$select slug, title from public.public_guide_sections where slug = 'followup-parking'$$,
  $$values ('followup-parking'::text, '주차 안내'::text)$$,
  'anon sees the owner-published guide section'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    with attempted as (
      update public.gallery_items
      set alt = '공개본 우회 수정'
      where media_path = '/images/gallery/followup-test.webp'
      returning 1
    )
    select count(*) from attempted
  $$,
  $$values (0::bigint)$$,
  'an editor cannot directly update a published gallery row'
);

select results_eq(
  $$
    with attempted as (
      delete from public.guide_sections
      where slug = 'followup-parking'
      returning 1
    )
    select count(*) from attempted
  $$,
  $$values (0::bigint)$$,
  'an editor cannot directly delete a published guide row'
);

-- 59
select lives_ok(
  $$
    insert into public.legal_documents (
      document_type, version, title, body, effective_on
    ) values (
      'privacy_policy', '2.0.0', '개인정보 처리방침 개정',
      pg_temp.reviewed_privacy_body('두 번째 공개 문서 본문'),
      current_date
    )
  $$,
  'an editor can prepare a replacement legal draft'
);

-- 60
select throws_ok(
  $$
    select public.create_notification_campaign(
      'setlist_update', '중복', '중복 방지', null, 'setlist_updates',
      (select id from public.events where slug = 'followup-security-event'),
      null, 'setlist:followup-security-event:1'
    )
  $$,
  '23505',
  null,
  'campaign dedupe keys reject a duplicate draft'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 61
select lives_ok(
  $$select public.publish_legal_document((select id from public.legal_documents where version = '2.0.0'))$$,
  'owner publication atomically replaces the current legal document'
);

-- 62
select results_eq(
  $$select version, status from public.legal_documents order by version$$,
  $$values ('1.0.0'::text, 'withdrawn'::text), ('2.0.0'::text, 'published'::text)$$,
  'the old legal version is withdrawn when the replacement is published'
);

-- 63
select lives_ok(
  $$select public.withdraw_legal_document((select id from public.legal_documents where version = '2.0.0'))$$,
  'an owner can withdraw the current legal document'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

-- 64
select is(
  (select count(*) from public.public_legal_documents),
  0::bigint,
  'withdrawn legal documents disappear from the public DTO'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- 65
select lives_ok(
  $$select public.approve_admin_user('84444444-4444-4444-8444-444444444444'::uuid)$$,
  'an owner can approve an Auth user as an editor'
);

-- 66
select results_eq(
  $$
    select role, is_active, approved_by is not null, approved_at is not null
    from public.admin_users
    where user_id = '84444444-4444-4444-8444-444444444444'::uuid
  $$,
  $$values ('editor'::text, true, true, true)$$,
  'admin approval records the default role, approver, and approval time'
);

-- 67
select lives_ok(
  $$select public.set_admin_user_role('84444444-4444-4444-8444-444444444444'::uuid, 'owner')$$,
  'an owner can manually promote another approved admin'
);

-- 68
select lives_ok(
  $$select public.set_admin_user_role('84444444-4444-4444-8444-444444444444'::uuid, 'editor')$$,
  'an owner can demote a second owner while another active owner remains'
);

-- 69
select lives_ok(
  $$select public.set_admin_user_active('84444444-4444-4444-8444-444444444444'::uuid, false)$$,
  'an owner can deactivate another approved administrator'
);

-- 70
select throws_ok(
  $$select public.set_admin_user_active('81111111-1111-4111-8111-111111111111'::uuid, false)$$,
  '23514',
  'An owner cannot deactivate their own account',
  'an owner cannot deactivate their own account'
);

-- 71
select throws_ok(
  $$select public.set_admin_user_role('81111111-1111-4111-8111-111111111111'::uuid, 'editor')$$,
  '23514',
  'The last active owner cannot be demoted',
  'the last active owner cannot be demoted'
);

-- 72
select lives_ok(
  $$
    select public.approve_notification_campaign(
      (select id from public.list_notification_campaigns() where dedupe_key = 'setlist:followup-security-event:1')
    )
  $$,
  'an owner can approve a campaign'
);

-- 73
select lives_ok(
  $$
    select public.queue_notification_campaign(
      (select id from public.list_notification_campaigns() where dedupe_key = 'setlist:followup-security-event:1')
    )
  $$,
  'an owner can queue an approved campaign'
);

-- 74
select lives_ok(
  $$
    select public.queue_notification_campaign(
      (select id from public.list_notification_campaigns() where dedupe_key = 'setlist:followup-security-event:1')
    )
  $$,
  'queuing an already queued campaign is idempotent'
);

select lives_ok(
  $$
    select public.schedule_worship_reminder_campaign(
      (select id from public.events where slug = 'followup-security-event'),
      '내일은 쥬빌리워십 예배가 있습니다',
      '예배 시간과 장소를 확인해 주세요.'
    )
  $$,
  'an owner can manually approve both timed worship reminders'
);

select results_eq(
  $$
    with repeated as (
      select public.schedule_worship_reminder_campaign(
        (select id from public.events where slug = 'followup-security-event'),
        '내일은 쥬빌리워십 예배가 있습니다',
        '예배 시간과 장소를 확인해 주세요.'
      ) as campaign_id
    )
    select
      repeated.campaign_id = (
        select reminder.campaign_id
        from public.list_worship_reminder_schedules() as reminder
        where reminder.event_id = (
          select id from public.events where slug = 'followup-security-event'
        )
          and reminder.reminder_slot = 'day_before_1930'
          and reminder.requires_reapproval = false
      )
      and (
        select count(*)
        from public.list_worship_reminder_schedules() as reminder
        where reminder.event_id = (
          select id from public.events where slug = 'followup-security-event'
        )
          and reminder.requires_reapproval = false
      ) = 2
    from repeated
  $$,
  $$values (true)$$,
  'preparing the same two event reminders is idempotent'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

-- 75
select throws_ok(
  $$select public.set_admin_user_role('84444444-4444-4444-8444-444444444444'::uuid, 'owner')$$,
  '42501',
  'Active owner access required',
  'an editor cannot change administrator roles'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"83333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

-- 76
select throws_ok(
  $$select * from public.list_notification_campaigns()$$,
  '42501',
  'Active admin access required',
  'a normal authenticated user cannot list campaigns'
);

-- 77
select throws_ok(
  $$
    insert into public.legal_documents (
      document_type, version, title, body, effective_on
    ) values ('privacy_policy', '3.0.0', '차단', '차단', current_date)
  $$,
  '42501',
  null,
  'a normal authenticated user cannot create a legal draft'
);

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select is(
  public.service_queue_due_worship_reminders(
    (
      select schedule.scheduled_for - interval '1 second'
      from private.worship_reminder_schedules as schedule
      where schedule.event_id = (
        select id from public.events where slug = 'followup-security-event'
      )
        and schedule.reminder_slot = 'day_before_1930'
        and schedule.is_current = true
    )
  ),
  0,
  'the KST due worker does not queue before the D-1 19:30 slot'
);

select is(
  public.service_queue_due_worship_reminders(
    (
      select schedule.scheduled_for
      from private.worship_reminder_schedules as schedule
      where schedule.event_id = (
        select id from public.events where slug = 'followup-security-event'
      )
        and schedule.reminder_slot = 'day_before_1930'
        and schedule.is_current = true
    )
  ),
  1,
  'the KST due worker queues the owner-approved D-1 19:30 reminder'
);

select is(
  public.service_queue_due_worship_reminders(
    (
      select schedule.scheduled_for
      from private.worship_reminder_schedules as schedule
      where schedule.event_id = (
        select id from public.events where slug = 'followup-security-event'
      )
        and schedule.reminder_slot = 'day_before_1930'
        and schedule.is_current = true
    )
  ),
  0,
  'the D-1 reminder due worker is idempotent'
);

select is(
  (
    select count(*)
    from private.notification_outbox as outbox
    join private.notification_campaigns as campaign on campaign.id = outbox.campaign_id
    join private.worship_reminder_schedules as schedule
      on schedule.campaign_id = campaign.id
    where campaign.kind = 'worship_reminder'
      and campaign.event_id = (
        select id from public.events where slug = 'followup-security-event'
      )
      and schedule.reminder_slot = 'day_before_1930'
  ),
  1::bigint,
  'the D-1 reminder has exactly one deduplicated outbox row'
);

-- The service-role register/update/unregister overloads are intentionally
-- revoked during the direct Data API v2 cutover. The remaining legacy-core
-- behavior assertions run as the database owner; separate privilege tests
-- above verify that deployed Edge code cannot call these overloads.
reset role;

-- 78
select lives_ok(
  $$
    select public.service_register_app_installation(
      '85555555-5555-4555-8555-555555555555'::uuid,
      repeat('a', 64), 'ios', '0.1.0',
      'production',
      'sensitive-interest-notifications-v5',
      true,
      'ExpoPushToken[database_test_token]', repeat('b', 64),
      true, true, true
    )
  $$,
  'the service role can register an anonymous installation'
);

-- 79
select ok(
  (
    select secret_hash = repeat('a', 64)
      and secret_hash <> 'raw-installation-secret'
    from private.app_installations
    where id = '85555555-5555-4555-8555-555555555555'::uuid
  ),
  'only the installation secret hash is stored'
);

-- 80
select throws_ok(
  $$
    select public.service_register_app_installation(
      '86666666-6666-4666-8666-666666666666'::uuid,
      repeat('c', 64), 'android', '0.1.0',
      'production',
      'sensitive-interest-notifications-v5',
      true,
      'ExpoPushToken[database_test_token]', repeat('b', 64),
      true, false, false
    )
  $$,
  '23505',
  null,
  'the same push token hash cannot register twice'
);

-- 81
select throws_ok(
  $$
    select public.service_update_app_installation(
      '85555555-5555-4555-8555-555555555555'::uuid,
      repeat('f', 64), '0.1.1', 'production',
      'sensitive-interest-notifications-v5', true, null, null, true, true, true
    )
  $$,
  '28000',
  'Invalid installation credentials',
  'an incorrect installation secret hash cannot change settings'
);

-- 82
select lives_ok(
  $$
    select public.service_update_app_installation(
      '85555555-5555-4555-8555-555555555555'::uuid,
      repeat('a', 64), '0.1.1', 'production',
      'sensitive-interest-notifications-v5', true, null, null, false, true, true
    )
  $$,
  'the correct installation secret hash can change notification settings'
);

-- 83
select is(
  (select count(*) from private.notification_outbox where dedupe_key = 'setlist:followup-security-event:1'),
  1::bigint,
  'idempotent queueing creates exactly one outbox row'
);

-- 84
select is(
  (
    select count(*)
    from public.service_claim_notification_outbox('pgtap-worker', 1)
    where delivery_id is not null
  ),
  1::bigint,
  'the worker claim creates one eligible delivery'
);

-- 85
select is(
  (
    select count(*)
    from private.notification_deliveries
    where status = 'queued'
  ),
  1::bigint,
  'delivery generation is deduplicated for the campaign and endpoint'
);

-- 86
select lives_ok(
  $$
    select public.service_record_push_ticket(
      (select id from private.notification_deliveries limit 1),
      'ok', 'pgtap-ticket-1', null
    )
  $$,
  'the worker can record an accepted Expo ticket'
);

-- 87
select lives_ok(
  $$
    select public.service_finish_notification_campaign(
      (select id from private.notification_campaigns where dedupe_key = 'setlist:followup-security-event:1'),
      true, null
    )
  $$,
  'the worker can complete a claimed campaign'
);

-- 88
select results_eq(
  $$select expo_ticket_id from public.service_list_pending_push_receipts(10)$$,
  $$values ('pgtap-ticket-1'::text)$$,
  'accepted tickets are listed for receipt processing'
);

-- 89
select lives_ok(
  $$
    select public.service_apply_push_receipt(
      (select id from private.notification_deliveries limit 1),
      'error', 'pgtap-ticket-1', 'DeviceNotRegistered'
    )
  $$,
  'a DeviceNotRegistered receipt is recorded'
);

-- 90
select results_eq(
  $$
    select is_active, disable_reason
    from private.push_endpoints
    where installation_id = '85555555-5555-4555-8555-555555555555'::uuid
  $$,
  $$values (false, 'DeviceNotRegistered'::text)$$,
  'DeviceNotRegistered disables the push endpoint'
);

-- 91
select lives_ok(
  $$
    select public.service_unregister_app_installation(
      '85555555-5555-4555-8555-555555555555'::uuid,
      repeat('a', 64)
    )
  $$,
  'the installation secret can unregister the installation'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.set_gallery_item_published(
      (
        select id from public.gallery_items
        where media_path = '/images/gallery/followup-test.webp'
      ),
      false
    )
  $$,
  'an owner can unpublish a gallery item before editor changes'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    update public.gallery_items
    set media_path = '/images/gallery/followup-test-replaced.webp'
    where media_path = '/images/gallery/followup-test.webp'
  $$,
  'an editor can replace a gallery locator without inheriting prior consent'
);

select results_eq(
  $$
    select published, consent_confirmed_at is null, consent_confirmed_by is null
    from public.gallery_items
    where media_path = '/images/gallery/followup-test-replaced.webp'
  $$,
  $$values (false, true, true)$$,
  'a gallery locator change clears consent and immediately unpublishes the item'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'public-media',
      'gallery/pgtap-editor-existing-site.webp',
      '82222222-2222-4222-8222-222222222222'
    )
  $$,
  'an editor retains the existing website gallery upload path'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'public-media',
      'app-gallery/pgtap-editor-blocked.webp',
      '82222222-2222-4222-8222-222222222222'
    )
  $$,
  '42501',
  null,
  'an editor cannot write the app-gallery publication path'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'public-media',
      'app-gallery/pgtap-owner-approved.webp',
      '81111111-1111-4111-8111-111111111111'
    )
  $$,
  'an owner can write the app-gallery publication path'
);

select throws_ok(
  $$
    select public.set_gallery_item_published(
      (
        select id from public.gallery_items
        where media_path = '/images/gallery/followup-test-replaced.webp'
      ),
      true
    )
  $$,
  '23514',
  'A consent-confirmed gallery item is required for publication',
  'the replaced gallery item cannot be republished with stale consent'
);

select lives_ok(
  $$
    select public.set_gallery_item_consent(
      (
        select id from public.gallery_items
        where media_path = '/images/gallery/followup-test-replaced.webp'
      ),
      true
    )
  $$,
  'an owner can reconfirm consent for the final public locator'
);

select lives_ok(
  $$
    select public.set_gallery_item_published(
      (
        select id from public.gallery_items
        where media_path = '/images/gallery/followup-test-replaced.webp'
      ),
      true
    )
  $$,
  'an owner can republish after reconfirming consent'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select results_eq(
  $$
    select media_path
    from public.public_gallery_items
    where media_path = '/images/gallery/followup-test-replaced.webp'
  $$,
  $$values ('/images/gallery/followup-test-replaced.webp'::text)$$,
  'anon sees only the reconfirmed replacement locator'
);

reset role;

insert into storage.objects (bucket_id, name, owner_id)
values (
  'gallery-staging',
  'gallery/pgtap-consent-locked.webp',
  '82222222-2222-4222-8222-222222222222'
);

insert into public.gallery_items (media_path, alt, caption, sort_order)
values
  (
    'storage://gallery-staging/gallery/pgtap-consent-locked.webp',
    '동의 잠금 테스트',
    '존재하는 스테이징 객체',
    991
  ),
  (
    'storage://gallery-staging/gallery/pgtap-consent-missing.webp',
    '재생성 차단 테스트',
    '현재 없는 스테이징 객체',
    992
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.set_gallery_item_consent(gallery.id, true)
    from public.gallery_items as gallery
    where gallery.media_path like 'storage://gallery-staging/gallery/pgtap-consent-%'
  $$,
  'an owner can confirm consent for staged gallery locators'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    with attempted as (
      update storage.objects
      set metadata = '{"pgtap":true}'::jsonb
      where bucket_id = 'gallery-staging'
        and name = 'gallery/pgtap-consent-locked.webp'
      returning 1
    )
    select count(*) from attempted
  $$,
  $$values (0::bigint)$$,
  'an editor cannot replace bytes at a consent-confirmed staging locator'
);

select ok(
  (
    select pg_get_expr(policy.polqual, policy.polrelid)
      like '%gallery_staging_object_has_consent%'
    from pg_policy as policy
    where policy.polname = 'gallery_staging_admin_delete'
      and policy.polrelid = 'storage.objects'::regclass
  ),
  'the staging delete policy protects consent-confirmed object names'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'gallery-staging',
      'gallery/pgtap-consent-missing.webp',
      '82222222-2222-4222-8222-222222222222'
    )
  $$,
  '42501',
  null,
  'an editor cannot recreate a missing object at a consent-confirmed locator'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

insert into public.legal_documents (
  document_type, version, title, body, effective_on
)
values (
  'privacy_policy', 'sensitive-disclosure-bypass', '민감정보 공개 gate 검증',
  E'쥬빌리 워십 sundoojubileeworship@gmail.com 설치 식별자 푸시 토큰 알림 선택 보유 비활성화\n알림 제공에만 사용합니다. 이름·이메일·광고 식별자와 결합하지 않고 광고·추적·이용자 프로파일링에 사용하지 않습니다.\n비활성 정보 보유 기간: 30일\n발송 기록 보유 기간: 90일\n정기 삭제 주기: 매일 1회\n수탁자: 검증 수탁자\n이전 국가: 검증 국가\n이전 항목: 설치 식별자 및 푸시 토큰\n이전 시점 및 방법: 서비스 이용 시 암호화 전송\n국외 처리 보유 기간: 30일\n이전 거부 방법 및 효과: 알림 해제 시 알림 기능 중단',
  current_date
);

select throws_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'sensitive-disclosure-bypass')
    )
  $$,
  '23514',
  'Legal document identity and disclosure review is incomplete',
  'a direct owner RPC cannot publish a privacy policy without the religious-interest disclosure'
);

insert into public.legal_documents (
  document_type, version, title, body, effective_on
)
values (
  'privacy_policy',
  'operational-label-bypass',
  '운영 라벨 직접 공개 우회 검증',
  replace(
    pg_temp.reviewed_privacy_body('운영 라벨 직접 공개 우회 검증'),
    '공개 콘텐츠·보안 로그 처리의 법적 근거:',
    '제거된 운영 라벨:'
  ),
  current_date
);

select throws_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'operational-label-bypass')
    )
  $$,
  '23514',
  'Legal document identity and disclosure review is incomplete',
  'a direct owner RPC cannot bypass any complete privacy operational-label requirement'
);

insert into public.legal_documents (
  document_type, version, title, body, effective_on
)
values (
  'privacy_policy',
  'required-disclosure-bypass',
  '필수 고지 직접 공개 우회 검증',
  replace(
    pg_temp.reviewed_privacy_body('필수 고지 직접 공개 우회 검증'),
    '광고 SDK',
    '제거된 필수 고지'
  ),
  current_date
);

select throws_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'required-disclosure-bypass')
    )
  $$,
  '23514',
  'Legal document identity and disclosure review is incomplete',
  'a direct owner RPC cannot bypass any required app privacy disclosure'
);

insert into public.legal_documents (
  document_type, version, title, body, effective_on
)
values (
  'privacy_policy',
  'support-transition-bypass',
  '지원 채널 전환 문구 직접 공개 우회 검증',
  pg_temp.reviewed_privacy_body('지원 채널 전환 문구 직접 공개 우회 검증')
    || E'\nGmail 기반 후보·임시 문의 주소',
  current_date
);

select throws_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'support-transition-bypass')
    )
  $$,
  '23514',
  'Legal document identity and disclosure review is incomplete',
  'a direct owner RPC cannot publish a policy that still contains a support-channel transition claim'
);

insert into public.legal_documents (
  document_type, version, title, body, effective_on
)
values (
  'privacy_policy',
  'privacy-contact-field-bypass',
  '개인정보 연락처 필드 직접 공개 우회 검증',
  replace(
    replace(
      pg_temp.reviewed_privacy_body('개인정보 연락처 필드 직접 공개 우회 검증'),
      '개인정보 및 앱 이용 문의: sundoojubileeworship@gmail.com',
      '개인정보 및 앱 이용 문의: other@example.invalid'
    ),
    '지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) sundoojubileeworship@gmail.com',
    '지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) other@example.invalid'
  ),
  current_date
);

select throws_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'privacy-contact-field-bypass')
    )
  $$,
  '23514',
  'Legal document identity and disclosure review is incomplete',
  'a direct owner RPC cannot bypass privacy contact-email consistency'
);

insert into public.legal_documents (
  document_type, version, title, body, effective_on
)
values (
  'terms_of_service',
  'terms-address-field-bypass',
  '약관 주소·전화 필드 직접 공개 우회 검증',
  replace(
    pg_temp.reviewed_terms_body(),
    '대한민국 인천광역시 부평구 예시로 123, 032-123-4567',
    '2026-09-01 주소·전화 서면 승인 기록'
  ),
  current_date
);

select throws_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'terms-address-field-bypass')
    )
  $$,
  '23514',
  'Legal document identity and disclosure review is incomplete',
  'a direct owner RPC cannot bypass terms address-and-phone field validation'
);

insert into public.legal_documents (
  document_type, version, title, body, effective_on
)
values (
  'terms_of_service',
  'terms-contact-lock-bypass',
  '약관 연락처 잠금 직접 공개 우회 검증',
  replace(
    pg_temp.reviewed_terms_body(),
    '서비스 문의: sundoojubileeworship@gmail.com',
    '서비스 문의: other@example.invalid'
  ),
  current_date
);

select throws_ok(
  $$
    select public.publish_legal_document(
      (select id from public.legal_documents where version = 'terms-contact-lock-bypass')
    )
  $$,
  '23514',
  'Legal document identity and disclosure review is incomplete',
  'a direct owner RPC cannot publish terms with a contact email different from locked site settings'
);

reset role;

select * from finish();
rollback;
