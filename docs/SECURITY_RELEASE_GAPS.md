# 릴리스 전 보안 경계와 외부 운영 게이트

기준일: 2026-08-23

## 1. 모바일 알림 호출 구조

- 모바일 앱은 Vercel을 거치지 않고 Supabase Data API의 `/rest/v1/rpc/*`를 직접 호출한다.
- 앱은 공개 publishable key와 JSON 본문을 보내며, Expo token·설치 proof는 제한된 custom header에 둔다.
- DB RPC 내부에서 형식 검증, 설치별 subject 한도, 출처 한도, 전체(global) 한도를 적용한다.
- `x-forwarded-for`는 DB 출처 판정에 사용하지 않는다. 현재 출처 bucket은 `cf-connecting-ip`만 사용한다.

## 2. 헤더 spoof와 분산 남용의 확인된 경계

- 로컬 pgTAP에서 `request.headers`를 임의 설정할 수 있다는 사실만으로 실제 Supabase gateway가 외부의 `cf-connecting-ip`를 덮어쓰는지 증명할 수 없다.
- 따라서 출처별 1분·일일 bucket은 원격 injection 시험 전까지 보조 방어로만 취급한다.
- 헤더와 무관한 global 한도와 설치·token 기반 subject 한도는 별도로 남아 있어 출처 bucket을 회전해도 전체 상한까지 제거되지는 않는다.
- 신뢰할 수 없는 SQL 계층에서 헤더를 고정 bucket으로 바꾸면 정상 사용자 전체가 하나의 작은 한도를 공유하여 손쉬운 서비스 거부가 가능하므로, 원격 gateway 검증 없이 그 변경을 적용하지 않는다.

## 3. malformed URL·body

- 잘못된 RPC URL, 파싱 불가능한 JSON, PostgREST 함수 선택 전에 거절되는 본문은 DB 함수에 진입하지 않으므로 DB rate-limit counter에 기록되지 않는다.
- 이 범위는 애플리케이션 SQL만으로 막을 수 없다. Supabase gateway 또는 앞단 WAF에서 요청 크기·요청률 제한과 4xx/429 경보를 설정해야 한다.

## 4. Vercel 코드 보강

- 재설치 복구 코드 원문은 브라우저에서 정규화·domain-separated SHA-256 처리하고 제거한다. Vercel Server Action과 Supabase에는 64자리 digest만 전송한다.
- 공개 캘린더 API는 slug를 Supabase 조회 전에 검증한다.
- 공개 캘린더 성공·404 응답에 `s-maxage`와 `stale-while-revalidate`를 적용해 반복 조회를 CDN에서 흡수한다.
- 모든 관리자 Server Action은 내부에서 active admin 또는 owner 권한을 다시 확인한다. 로그인은 Supabase Auth의 인증 rate limit도 적용받는다.

## 5. 제출 전 외부 운영 게이트

다음 항목은 로컬 코드로 완료 처리할 수 없다.

1. Supabase 점검 창에서 동일 요청에 `cf-connecting-ip`와 `x-forwarded-for` 값을 바꿔 보내고, 출처 bucket·global 100/500 상한·25시간 만료가 예상대로 동작하는지 확인한다.
2. 동일 출처 하루 100회·전체 하루 500회·전체 분당 200회 상한과 25시간 만료를 원격에서 확인한다. PostgREST의 유효한 쓰기 요청은 `pgrst.db_pre_request`로 추가 제한할 수 있지만, URL·JSON 파싱 전에 실패한 요청까지 차단하려면 Data API 앞에 별도 gateway를 두거나 Supabase가 제공하는 플랫폼 보호·사용량 경보를 확인해야 한다. 데이터베이스 Network Restrictions는 HTTPS Data API에 적용되지 않는다.
3. Vercel Preview에는 Hobby에서도 가능한 Standard Deployment Protection을 켠다. Vercel Production Firewall rate limiting은 Pro 또는 Enterprise 기능이므로 현재 플랜을 확인하고, 지원되는 경우에만 `/admin/login` POST, `/admin/**` POST, `/api/calendar/**` GET 기준을 정상 운영량에 맞춰 설정한다. 모바일 알림은 Vercel을 통과하지 않으므로 이 규칙이 Supabase 알림 RPC를 보호하지는 않는다.
4. Vercel runtime/error log canary에서 정상 owner 복구 승인 요청에 raw 26자리 코드가 없고 `recovery_code_digest`만 있는지 확인한다.
5. 위 시험은 실제 push 발송 및 최종 스토어 제출 전에 수행하고, 비밀값·token·복구코드는 로그 검색어 또는 보고서에 원문으로 남기지 않는다.

## 6. 공식 근거

- Supabase Data API 사전 요청 검사·write rate limit: https://supabase.com/docs/guides/api/securing-your-api
- Supabase Network Restrictions의 HTTPS API 제외 범위: https://supabase.com/docs/guides/platform/network-restrictions
- Vercel Standard Deployment Protection: https://vercel.com/docs/deployment-protection
- Vercel Firewall rate limiting 플랜 범위: https://vercel.com/templates/other/rate-limit-api-requests-firewall-rule
