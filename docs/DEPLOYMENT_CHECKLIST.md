# 배포·스토어 출시 체크리스트

- 기준일: 2026-08-23 KST
- `[x]`: 현재 checkout에서 검증 완료하거나 날짜·빌드가 명시된 기존 검증 증거 확인
- `[ ]`: 미완료, 외부 연결 필요 또는 결과 미확인

## 1. 로컬 코드·데이터베이스 QA

- [x] Domain 단위 테스트 98/98 통과
- [x] Web 단위 테스트 35/35 통과
- [x] Mobile 단위 테스트 115/115 통과
- [x] Supabase pgTAP 720/720 통과
- [x] Edge Function 테스트 29/29 통과
- [x] Edge Function format·type check 통과
- [x] 시드 포함 `supabase db reset` 성공
- [x] 최신 법적 문서 gate migration을 포함한 로컬 migration 18개 `supabase db reset --local --no-seed` 성공
- [x] DB lint warning/error 0
- [x] 원격 Security Advisor의 `SECURITY DEFINER` 실행 RPC 경고를 내부 인증·HMAC·rate-limit gate 기준으로 검토 완료(경고 0으로 간주하지 않음)
- [x] Performance Advisor 보고 이슈 0
- [x] 로컬 migration 재현 schema와 현재 로컬 `public`, `private`, `storage` schema diff 불일치 0

## 2. 관리자·콘텐츠 보안

- [x] 등록된 Auth 사용자를 owner가 건별로 수동 승인하는 DB 구조
- [x] editor 승인·비활성화·owner 역할 관리 RPC 및 마지막 owner 보호
- [x] 설교·송리스트 개정본과 owner 수동 공개
- [x] 송리스트 YouTube locator owner 확인과 순서·곡 Key 무결성
- [x] 갤러리·안내 공개 행의 editor 직접 수정·삭제 차단
- [x] `gallery-staging` private bucket과 `public-media/app-gallery/` owner 공개 경로
- [x] 인물·이용 동의 감사 필드와 locator 변경 시 동의·공개 자동 해제
- [x] 법적 문서 버전·시행일·owner 공개·철회 구조
- [x] 웹·DB 공개 gate의 필수 고지 37개·금지 문구 8개·개인정보 라벨 30개·약관 라벨 6개 exact parity 검증
- [x] 정책·약관 문의 이메일을 앱 `SITE.contact_email`과 잠긴 DB `site_settings(id=1).contact_email`에 대소문자까지 일치시키는 fail-closed gate 로컬 검증
- [x] 표시 운영주체 `쥬빌리 워십` 확인
- [x] `/privacy`의 정책 미공개·`noindex`·스토어 제출 차단 안내를 Production에서 확인
- [ ] 최초 owner Auth 계정·이메일·복구 담당자 확정
- [ ] 표시 운영주체와 구분한 개인정보 처리자의 법적 성명·명칭, 보호책임자·고충처리 담당부서·전화번호 확정
- [ ] 최종 지원 이메일 공급자·확정 주소·관리자·계약/처리 조건·삭제 운영 증거 확정
- [x] 현재 개발본은 알림 기능만 만 14세 이상으로 제한하고 별도 자기확인 gate 구현; 공개 콘텐츠는 연령과 관계없이 열람 가능
- [ ] 만 14세 제한 범위를 알림 기능에만 둘지 앱 전체에 둘지 사용자 최종 확정
- [ ] 만 14세 자기확인의 법률적 충분성, 국외 처리 근거·Google의 법적 역할과 처리 국가에 대한 법률 전문가 검토
- [ ] 개인정보 처리방침·이용약관 원문과 시행일 승인
- [x] 보유 기준 확정: 토큰 원문 24시간, 180일 미활동 비활성화, 비활성 정보 30일, 발송 상세기록 90일, 매일 정리
- [x] 알림 등록 요청의 IP 원문 대신 프로젝트 비밀키 HMAC 가명값만 저장하고, 일일 카운터는 창 시작 후 25시간에 만료(정리 cron 지연 시 최대 약 25시간 5분 잔존) 기준 반영
- [x] 동일 기준의 cleanup RPC·일일 cron·삭제 회귀 테스트 로컬 구현 및 검증 완료
- [x] 원격 Supabase에 cleanup migration·일일 cron 적용
- [x] 원격 cleanup cron 실행 이력 4회 성공 확인
- [ ] 실제 만료정보 삭제 확인(완료 전 store-ready 개인정보처리방침 공개·스토어 개인정보 URL 사용 금지)

## 3. Android

- [x] Android Release APK 생성
- [x] Android 15 16KB page-size 에뮬레이터 설치
- [x] Android 15 16KB page-size 에뮬레이터 앱 기동
- [x] 홈 인디케이터·제스처 내비게이션 안전영역을 덮어쓰던 하단 탭바 고정 높이·아래 여백 제거
- [x] Android 태블릿·폴더블 최소 반응형 기준으로 720dp 최대 폭 단일 열·액션 행 자동 줄바꿈 구현
- [ ] API 36 Pixel Tablet·Fold 에뮬레이터 실행 회전·분할 화면·상태 유지 검증
- [x] Samsung SM-G991N(Android 15)에 2026-08-16 EAS development APK(commit `9159518`) 설치·4개 탭·송리스트·캘린더 선택기·길찾기 선택창·공유 시트 확인
- [x] 같은 기존 실기기 빌드의 송리스트에서 화면 버튼·시스템 Back·가장자리 제스처로 예배 화면 복귀 확인
- [x] commit `aaeed5e` EAS Preview build `f60bcbcc-de16-457b-99cd-d3a9460df37d`를 Samsung SM-G991N에 replace install하고 공식 아이콘·새 홈 사진·4개 탭·테마 유지·3종 Back·만 14세 gate·crash/ANR 0건 확인
- [x] Preview APK SHA-256 `2f9773412dbd040dd368fd115f636f31dfe258a4c9c033c3abdc51c56c641f07`, package `org.sundoo.jubileeworship.preview`, target API 36, v2 서명, 64-bit arm64/x86_64 ELF·ZIP 16KB 정렬 확인
- [x] 2026-08-31부터 적용되는 Google Play 신규 앱 target API 36 요구사항과 현재 target API 36 일치 확인
- [x] Android 알림 종류 선택 전 14세 확인·별도 동의가 OS 권한보다 먼저 표시되고, 미확인·권한 거절 시 선택이 모두 꺼진 상태로 복구됨을 확인
- [x] Production package `org.sundoo.jubileeworship`용 Android EAS 운영 keystore 생성; SHA-256는 `docs/APP_LINK_ASSOCIATION.md`에 기록
- [ ] Android Firebase 설정·FCM token·실제 push·receipt 검증(`GOOGLE_SERVICES_JSON` 미설정으로 Preview의 Firebase 초기화 단계에서 중단)
- [ ] Store 서명 AAB 생성과 서명 정보 확인(2026-08-23 기준 Production build 0건)
- [ ] Google Play Console 앱 생성·앱 서명·내부 테스트 트랙 업로드
- [x] Play Console 개발자 연락처 이메일·전화번호 인증 표시 확인
- [ ] 개인 개발자 계정 Android 실제 기기 인증 상태 확인
- [ ] Android 개발자 인증용 package 등록(새 Play 앱 생성 시 자동 등록 예정)
- [ ] 비공개 테스트 12명 이상을 14일 연속 유지
- [ ] 비공개 테스트 종료 후 Production access 신청·승인
- [x] 대상 API·16KB 최신 요구사항 재확인
- [ ] 데이터 안전·알림 권한 정책을 최종 바이너리와 Play Console 최신 문항으로 재확인

## 4. iOS

- [x] Apple 개발자 계정 유형 `개인` 확인
- [x] iOS Simulator Debug 빌드 기존 성공 기록
- [x] iOS Simulator Release 빌드·Metro 없는 단독 실행
- [x] 앱 종료 후 `jubileeworship://notifications` 콜드 딥링크 확인
- [x] EAS Preview Simulator build `5756d596-dc2e-478f-aacc-e094b8f78bb7`(commit `aaeed5e`) clean install·공식 아이콘·새 홈 사진·4개 탭·테마 유지·만 14세 gate·Simulator fail-closed 확인
- [x] 위 artifact SHA-256 `39eacb096d85de7521a92aab1b1ec2a3f1f0e6cb989ac1874fde9e60814b235f`, Fatal·crash report 0건 확인
- [ ] iOS 실기기 설치·핵심 플로우·알림 검증
- [x] Apple Developer Team `N84F73NX4K`와 Production Bundle ID `org.sundoo.jubileeworship` 확인
- [ ] iOS Distribution Certificate·Provisioning Profile·APNs key·App Store Connect API key 설정(2026-08-23 기준 모두 없음)
- [ ] iPhone 실기기 연결(등록 기기는 있으나 현재 Mac에 미연결)
- [ ] Release Archive·Export·TestFlight 업로드
- [ ] App Store Connect 내부 테스트·심사 메타데이터 검증

Simulator Release는 통과했지만 무서명 빌드의 알림 Keychain entitlement는 실제 서명된 EAS 실기기에서 재검증한다.

## 5. Supabase remote·Push

- [x] `Jubilee Worship` 조직의 Free `쥬빌리` 프로젝트를 Seoul 리전에 생성
- [x] 단일 원격 프로젝트를 통합검수 후 초기 운영으로 사용하고 일상 reset·seed·CI는 로컬에서만 수행하는 기준 확정
- [x] `20260820100035`까지 기존 Supabase remote migration 15개 적용·검증(이전 원격 기준선)
- [ ] 신규 법적 문서 gate migration 3개(`20260823130815`, `20260823132500`, `20260823143000`) 원격 적용·직접 RPC·runtime fail-closed 재검증
- [x] Edge Function 8개 배포 및 legacy 등록·갱신·해제 endpoint HTTP 410 확인
- [x] 공개 DTO 조회·원본 비공개 열 차단·함수 method/auth 원격 smoke test
- [x] 외부 push 비활성 상태 `PUSH_EXTERNAL_SEND_ENABLED=false`를 digest로 재확인
- [x] Vercel Production 서버 전용 `SUPABASE_SECRET_KEY` 설정
- [ ] Expo access token 등 실제 push 발송에 필요한 운영 secret 설정
- [x] 등록 RPC에 1분 요청 출처·전역 제한, 일일 요청 출처 100회·전체 500회 제한, private 등록 중단 스위치 로컬 구현
- [x] 잘못된 형식의 Expo token 시도도 카운트되고 제한되며, anon·authenticated·service_role이 rate-limit·중단·동의 테이블에 직접 접근할 수 없음을 pgTAP으로 검증
- [x] 별도 동의·direct v2·일일 제한·중단 스위치·재설치 복구 migration과 앱 호출 변경을 원격 적용
- [x] direct v2 synthetic canary에서 HTTP 200·`REGISTRATION_DISABLED`·관련 원격 행 0건 확인
- [x] synthetic Expo token·설치 proof·installation UUID가 Supabase 통합 로그에 남지 않고, API Gateway 범위 custom-header 이름 검색도 0건임을 확인
- [x] 개발·미리보기 재설치 복구를 오너 승인→기기 atomic finalize 2단계로 고정하고, 승인만으로 token unique 예약이 풀리지 않음·기기 미복귀 시 target 미생성·최신 선택만 반영됨을 pgTAP으로 검증
- [x] 복구 철회는 실제 `withdrawn` 확인 전 SecureStore의 철회용 exact token/proof 연결과 cleanup marker를 보존하며, pending·authorized·expired·감사 삭제 뒤 exact target 및 provisional 응답 유실 fallback을 검증
- [x] 복구 코드 TTL·철회 전환 시 raw code를 SecureStore에서 제거하고 철회용 최소 token/variant/proof 연결만 재시작 후 유지하며, 관리자 대조값은 untrusted 앱 버전 없이 12자리 설치 지문만 표시
- [ ] 실제 owner·복구 흐름에서 raw 재설치 복구 코드가 Vercel runtime/error log에 남지 않는지 canary하고, exact-token unsubscribe fallback의 알림 해제 DoS 가능성을 운영자에게 고지
- [x] 재설치 복구의 재사용 가능한 verifier/token hash/code digest는 terminal 전환 즉시 scrub하고 unlink-only 감사 메타데이터는 최대 30일 후 삭제하며, 승인자 UUID snapshot은 auth 계정 삭제와 독립적으로 감사기간 동안 유지함을 검증
- [ ] 공개 Data API에서 사용자가 보낸 `cf-connecting-ip`·`x-forwarded-for`로 rate-limit bucket을 선택하거나 우회할 수 없는지 injection·spoof 원격 테스트
- [ ] RPC 선택 전에 실패하는 malformed URL·body와 분산 공격을 차단하는 gateway/WAF 제한과 사용량·차단량 alert 설정
- [x] 원격 `registration_enabled=false` 상태에서 `REGISTRATION_DISABLED`와 미생성을 확인
- [ ] 등록 재활성 운영 절차·승인자와 장애 시 재중단 절차 확정
- [ ] 비운영 환경 또는 승인된 점검 창에서 일일 출처 101번째·전체 501번째 차단과 25시간 만료 설정을 원격 검증
- [ ] 실제 iOS·Android Expo push token 등록
- [x] owner-pairing allowlist·10분 1회용 HMAC 코드·request UUID 멱등성·production 배제 로컬 구현 및 회귀 테스트
- [x] 앱·웹·DB의 푸시 딥링크를 구현된 허용 경로로 제한하고 직접 DB·RPC 우회를 차단하는 로컬 회귀 테스트
- [x] 서버 전용 `TEST_PUSH_PAIRING_PEPPER` 생성·Edge secret 설정(저장소·브라우저·로그에는 값 미기록)
- [x] pairing·딥링크 허용 경로 migration과 `create-test-push-pairing`·`approve-test-push-pairing`·변경된 `test-push`를 포함한 Edge Function 8개 원격 배포
- [ ] development/preview 실기기 코드 발급 → owner 승인 → 단일 큐 등록 검증
- [ ] owner 시험 발송, Expo ticket, receipt, `DeviceNotRegistered` 처리 실기기 확인
- [x] 예배 알림 시각 `전날 19:30 KST` + `당일 1시간 전` 확정
- [x] 각 예약은 예약 시각부터 15분 이내만 발송하고 이후 만료하는 기준 확정
- [ ] 두 예약을 예약 시각부터 15분 안에 queue하고 이후 만료하는 운영 scheduler·worker 활성화 및 재승인 흐름 실기기 확인
- [ ] 실제 발송 전 `PUSH_EXTERNAL_SEND_ENABLED=true` 변경 승인

원격 Edge Function은 배포됐지만 `PUSH_EXTERNAL_SEND_ENABLED=false`이며, 실제 push 발송은 현재 활성화되지 않았다.

알림 등록·발송 재활성화 전 남은 순서는 다음과 같다.

1. [x] `PUSH_EXTERNAL_SEND_ENABLED=false`, scheduler·dispatch worker 비활성, notification outbox·legacy 행 0건 확인
2. [x] 기존 원격 migration 15개·Edge Function 8개 적용, legacy endpoint 410, 등록 중단·미생성·Supabase custom-header log canary 확인
3. [ ] 신규 법적 문서 gate migration 3개 원격 적용 후 정책 공개·알림 등록 직접 RPC가 동일하게 fail closed하는지 확인
4. [ ] `cf-connecting-ip` injection/spoof, gateway/WAF, 사용량·차단량 alert, 일일 101번째·전체 501번째 및 25시간 만료 원격 검증
5. [ ] 법적 처리자·담당자·연락처·최종 이메일 공급자·만 14세 절차·국외 처리 근거를 확정하고 검토 완료 정책 공개
6. [x] `TEST_PUSH_PAIRING_PEPPER`를 서버 secret으로 설정
7. [ ] 최초 owner·development/preview 실기기 pairing 검증
8. [ ] 승인된 점검 창에서만 등록을 일시 활성화해 실제 기기 token 등록을 확인한 뒤 즉시 다시 비활성화
9. [ ] 사용자 별도 승인 후에만 실제 외부 push·ticket·receipt·`DeviceNotRegistered`를 검증

## 6. Vercel·도메인

- [ ] Vercel Preview 공개 환경 변수·관리자 변경 차단 설정
- [ ] Preview에서 공개 DTO·관리자 CRUD·Storage·법적 문서·알림 회귀 검증
- [ ] Preview Playwright·Lighthouse·Core Web Vitals·외부 링크 재검증
- [x] Vercel 기본 Production deployment `dpl_954nm6pMVRkGQP17kHyh1c3epB9R` 배포·승격
- [x] `https://jubilee-worship.vercel.app`의 홈·지원·개인정보·sitemap HTTP 200, 모바일·데스크톱 overflow 0, 사이트 console/page error 0 확인
- [x] 사용자의 기본 Vercel Production 공개 승인 반영
- [x] Vercel 프로젝트 연결과 기본 Production URL `https://jubilee-worship.vercel.app` 확정
- [x] Universal Link·App Link association 파일과 응답 헤더를 로컬에 준비
- [ ] association 파일 Production 배포 및 HTTPS 200·JSON content type 검증
- [ ] 선두교회 하위 도메인 사용 승인
- [ ] custom domain DNS·TLS·canonical·robots·OG 검증

## 7. EAS·스토어

- [x] Expo/EAS `jubilee-worship` 프로젝트 연결과 Preview·Production용 Supabase 공개 환경 변수 설정
- [x] iOS Simulator development build 생성·설치·홈/예배/미디어 실행 확인
- [x] Android development APK 생성과 개발용 패키지·서명 확인
- [x] iOS Preview Simulator build `5756d596-dc2e-478f-aacc-e094b8f78bb7` 생성·clean install·핵심 회귀 통과
- [x] 운영 앱 이름·Bundle ID·서버 설정으로 Mac 검수할 `production-simulator` 프로필 추가(서명·TestFlight를 대체하지 않음)
- [x] Android Preview build `f60bcbcc-de16-457b-99cd-d3a9460df37d` 생성·Samsung SM-G991N replace install·핵심 회귀·만 14세 gate·Fatal/ANR 0건 확인
- [x] `EXPO_PUBLIC_WEB_ORIGIN=https://jubilee-worship.vercel.app`을 Preview·Production 프로필에 설정
- [x] 독립 실행 가능한 정적 Production config 검사와 EAS Production 환경 주입 iOS·Android 사전검사 명령 추가
- [x] Android Production EAS keystore 생성
- [ ] EAS Production build 생성(2026-08-23 기준 iOS 0건·Android 0건)
- [ ] Firebase Production Android 앱 생성(등록 폼만 준비, 외부 생성 확인 대기)
- [ ] Google Play Console 앱 생성(등록 폼 기본값만 준비, 외부 선언·생성 확인 대기)
- [ ] APNs·FCM 자격 증명 설정과 iOS·Android 실기기 원격 알림 검증
- [ ] iOS·Android 운영 서명 빌드 생성
- [ ] TestFlight·Google Play 내부 테스트 배포
- [ ] 내부 테스터 실기기 검수와 치명적 이슈 0건 확인
- [ ] Google Play 비공개 테스트 12명·14일 연속 참여 및 Production access 승인
- [ ] App Store Privacy·Google Play Data safety·알림 권한 설명 완성
- [x] Google Play 아이콘·Feature Graphic 기본 자산 준비
- [ ] 최종 스토어 스크린샷·앱 설명·지원 URL·개인정보 URL·연령등급 확정
- [ ] `/privacy`에 검토 마커·미정값이 없고, 확정 운영주체·이메일·보유·삭제·국외 처리 실제값을 포함한 owner 공개 앱 정책이 표시되는지 확인
- [ ] 공개 정책의 보유기간과 실제 cleanup RPC·cron 설정이 일치하고 만료 정보가 삭제되는지 운영 Preview에서 확인
- [ ] 스토어 최종 제출 전 사용자 승인
- [ ] App Store·Google Play 심사 제출

2026-08-23 현재 Samsung SM-G991N(Android 15)은 연결되어 있으나 iPhone은
Mac에 연결되어 있지 않다. 실제 push, 스토어 내부 테스트, 정책 공개와 최종
스토어 스크린샷은 완료되지 않았다.

## 8. 배포 중단 조건

다음 중 하나라도 완료되지 않으면 실제 push 활성화, 정책의 store-ready 공개, custom domain DNS 변경 또는 스토어 제출을 진행하지 않는다. 기본 Vercel Production 지원 페이지 배포는 사용자의 기존 승인에 따라 완료됐다.

- [ ] iOS Release·Android 운영 AAB·스토어 서명 검증
- [x] 기존 알림 migration·Edge Function·앱 호출 변경의 Supabase remote fail-closed smoke test 완료(이전 원격 기준선)
- [ ] 현재 checkout의 신규 법적 문서 gate migration 3개 원격 적용·직접 RPC·runtime 재검증
- [x] Supabase custom-header log canary 완료
- [ ] `cf-connecting-ip` injection/spoof·gateway/WAF·사용량 alert·일일 100/500 상한 원격 검증
- [ ] 실제 iOS·Android push 통합 검증
- [x] Vercel 기본 Production 홈·지원·개인정보·sitemap 검증
- [ ] Vercel Preview 관리자 회귀·custom domain·DNS 검증
- [ ] 법적 문서 원문·시행일·스토어 메타데이터 승인
- [ ] 만 14세 절차·지원 이메일 보유/법적 역할·개인정보 처리자·담당자·국외 처리 근거·법률 검토 확정
- [x] 보유기간과 동일한 cleanup RPC·cron·테스트 로컬 완료
- [x] 원격 cleanup cron 적용
- [x] 원격 cleanup cron 실행 이력 4회 성공 확인
- [ ] 실제 만료정보 삭제 확인
- [ ] 사용자의 최종 배포·스토어 제출 승인

기본 Vercel Production 배포 외에 custom domain·DNS 변경, 실제 push 활성화, store-ready 개인정보처리방침 공개, SNS 게시, 관리자 초대, App Store·Google Play 제출은 각각 필요한 선행 검증과 사용자 별도 승인을 거친 뒤 실행한다.
