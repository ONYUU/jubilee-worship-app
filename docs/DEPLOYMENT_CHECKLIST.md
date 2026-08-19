# 배포·스토어 출시 체크리스트

- 기준일: 2026-08-19 KST
- `[x]`: 현재 checkout에서 검증 완료하거나 날짜·빌드가 명시된 기존 검증 증거 확인
- `[ ]`: 미완료, 외부 연결 필요 또는 결과 미확인

## 1. 로컬 코드·데이터베이스 QA

- [x] Domain 단위 테스트 98/98 통과
- [x] Web 단위 테스트 27/27 통과
- [x] Mobile 단위 테스트 61/61 통과
- [x] Supabase pgTAP 567/567 통과
- [x] Edge Function 테스트 31/31 통과
- [x] Edge Function format·type check 통과
- [x] 시드 포함 `supabase db reset` 성공
- [x] DB lint warning/error 0
- [x] 원격 Security Advisor 오류 0, 관리자 전용 `SECURITY DEFINER` RPC 정적 경고 27건 권한 검토 완료
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
- [x] 운영주체 `쥬빌리 워십`과 문의·개인정보 이메일 `sundoojubileeworship@gmail.com` 확정·표시
- [x] `/privacy`에 owner가 공개한 앱 개인정보처리방침 연결과 미공개 스토어 제출 차단 안내
- [ ] 최초 owner Auth 계정·이메일·복구 담당자 확정
- [ ] 개인정보 처리방침·이용약관 원문과 시행일 승인
- [x] 보유 기준 확정: 토큰 원문 24시간, 180일 미활동 비활성화, 비활성 정보 30일, 발송 상세기록 90일, 매일 정리
- [x] 동일 기준의 cleanup RPC·일일 cron·삭제 회귀 테스트 로컬 구현 및 검증 완료
- [x] 원격 Supabase에 cleanup migration·일일 cron 적용
- [x] 원격 cleanup cron 실행 이력 4회 성공 확인
- [ ] 실제 만료정보 삭제 확인(완료 전 앱 정책 공개 금지)

## 3. Android

- [x] Android Release APK 생성
- [x] Android 15 16KB page-size 에뮬레이터 설치
- [x] Android 15 16KB page-size 에뮬레이터 앱 기동
- [x] Samsung SM-G991N(Android 15)에 2026-08-16 EAS development APK(commit `9159518`) 설치·4개 탭·송리스트·캘린더 선택기·길찾기 선택창·공유 시트 확인
- [x] 같은 기존 실기기 빌드의 송리스트에서 화면 버튼·시스템 Back·가장자리 제스처로 예배 화면 복귀 확인
- [ ] 최신 v9 APK를 Samsung SM-G991N에서 재설치·핵심 화면·뒤로가기 검증
- [ ] Android 실기기 알림 권한·FCM token·실제 push·receipt 검증
- [ ] Store 서명 AAB 생성과 서명 정보 확인
- [ ] Google Play Console 앱 생성·앱 서명·내부 테스트 트랙 업로드
- [ ] 개인 개발자 계정 Android 실제 기기·개발자 연락처 검증 상태 확인
- [ ] 비공개 테스트 12명 이상을 14일 연속 유지
- [ ] 비공개 테스트 종료 후 Production access 신청·승인
- [ ] 대상 API·16KB·데이터 안전·알림 권한 정책을 Play Console 최신 요구사항으로 재확인

## 4. iOS

- [x] Apple 개발자 계정 유형 `개인` 확인
- [x] iOS Simulator Debug 빌드 기존 성공 기록
- [x] iOS Simulator Release 빌드·Metro 없는 단독 실행
- [x] 앱 종료 후 `jubileeworship://notifications` 콜드 딥링크 확인
- [ ] iOS 실기기 설치·핵심 플로우·알림 검증
- [ ] Apple Developer Team·Bundle ID·서명·Provisioning Profile 확정
- [ ] Release Archive·Export·TestFlight 업로드
- [ ] App Store Connect 내부 테스트·심사 메타데이터 검증

Simulator Release는 통과했지만 무서명 빌드의 알림 Keychain entitlement는 실제 서명된 EAS 실기기에서 재검증한다.

## 5. Supabase remote·Push

- [x] `Jubilee Worship` 조직의 Free `쥬빌리` 프로젝트를 Seoul 리전에 생성
- [x] 단일 원격 프로젝트를 통합검수 후 초기 운영으로 사용하고 일상 reset·seed·CI는 로컬에서만 수행하는 기준 확정
- [x] Supabase remote 프로젝트 link·dry-run·migration 9개 적용
- [x] 6개 Edge Function 배포와 인증 없는 요청 차단 smoke test
- [x] 공개 DTO 조회·원본 비공개 열 차단·함수 method/auth 원격 smoke test
- [x] 외부 push 비활성 상태로 `PUSH_EXTERNAL_SEND_ENABLED=false` 설정
- [ ] Vercel 서버 전용 `SUPABASE_SECRET_KEY`, Expo access token 등 운영 secret 설정
- [ ] 등록 API에 분산 rate limit·gateway 적용
- [ ] 실제 iOS·Android Expo push token 등록
- [x] owner-pairing allowlist·10분 1회용 HMAC 코드·request UUID 멱등성·production 배제 로컬 구현 및 회귀 테스트
- [x] 앱·웹·DB의 푸시 딥링크를 구현된 허용 경로로 제한하고 직접 DB·RPC 우회를 차단하는 로컬 회귀 테스트
- [ ] 서버 전용 `TEST_PUSH_PAIRING_PEPPER` 생성·Edge secret 설정(저장소·브라우저·로그 금지)
- [ ] pairing·딥링크 허용 경로 migration과 `create-test-push-pairing`·`approve-test-push-pairing`·변경된 `test-push` Edge Function 원격 배포
- [ ] development/preview 실기기 코드 발급 → owner 승인 → 단일 큐 등록 검증
- [ ] owner 시험 발송, Expo ticket, receipt, `DeviceNotRegistered` 처리 실기기 확인
- [x] 예배 알림 시각 `전날 19:30 KST` + `당일 1시간 전` 확정
- [x] 각 예약은 예약 시각부터 15분 이내만 발송하고 이후 만료하는 기준 확정
- [ ] 두 예약을 예약 시각부터 15분 안에 queue하고 이후 만료하는 운영 scheduler·worker 활성화 및 재승인 흐름 실기기 확인
- [ ] 실제 발송 전 `PUSH_EXTERNAL_SEND_ENABLED=true` 변경 승인

원격 Edge Function은 배포됐지만 `PUSH_EXTERNAL_SEND_ENABLED=false`이며, 실제 push 발송은 현재 활성화되지 않았다.

시험 기기 pairing migration 배포 순서는 고정한다.

1. `PUSH_EXTERNAL_SEND_ENABLED=false`를 재확인하고 scheduler·dispatch worker를 중지한다.
2. DB에서 `processing` notification outbox가 0건인지 확인한다. 0건이 아니면 migration을 적용하지 않는다.
3. migration을 적용하고 production test campaign/outbox 0건, 공개·anon pairing 권한 0건을 검증한다.
4. `TEST_PUSH_PAIRING_PEPPER`를 서버 secret으로 설정한 뒤 두 pairing Edge Function, `test-push`, 웹, 앱 순으로 배포한다.
5. 외부 발송을 계속 비활성화한 상태에서 development/preview 실기기 연결 승인과 단일 큐 생성만 검증한다.
6. worker를 재개하되 실제 외부 발송 활성화와 최초 실기기 전송은 사용자 별도 승인 후 진행한다.

## 6. Vercel·도메인

- [ ] Vercel Preview 프로젝트·공개 환경 변수 설정(서버 secret 미제공, 관리자 변경 차단)
- [ ] Preview에서 공개 DTO·관리자 CRUD·Storage·법적 문서·알림 회귀 검증
- [ ] Preview Playwright·Lighthouse·Core Web Vitals·외부 링크 재검증
- [ ] Production Vercel 프로젝트·환경 변수 설정
- [ ] 선두교회 하위 도메인 사용 승인
- [ ] DNS 레코드 생성·TLS·canonical·sitemap·robots·OG 확인
- [ ] 사용자가 Production 공개와 DNS 연결을 명시적으로 승인

## 7. EAS·스토어

- [x] Expo/EAS `jubilee-worship` 프로젝트 연결과 Preview·Production용 Supabase 공개 환경 변수 설정
- [x] iOS Simulator development build 생성·설치·홈/예배/미디어 실행 확인
- [x] Android development APK 생성과 개발용 패키지·서명 확인
- [ ] 운영 웹 주소 확정 후 `EXPO_PUBLIC_WEB_ORIGIN` 설정
- [ ] APNs·FCM 자격 증명 설정과 iOS·Android 실기기 원격 알림 검증
- [ ] iOS·Android 운영 서명 빌드 생성
- [ ] TestFlight·Google Play 내부 테스트 배포
- [ ] 내부 테스터 실기기 검수와 치명적 이슈 0건 확인
- [ ] Google Play 비공개 테스트 12명·14일 연속 참여 및 Production access 승인
- [ ] App Store Privacy·Google Play Data safety·알림 권한 설명 완성
- [ ] 스크린샷·앱 설명·지원 URL·개인정보 URL·연령등급 확정
- [ ] `/privacy`에 검토 마커·미정값이 없고, 확정 운영주체·이메일·보유·삭제·국외 처리 실제값을 포함한 owner 공개 앱 정책이 표시되는지 확인
- [ ] 공개 정책의 보유기간과 실제 cleanup RPC·cron 설정이 일치하고 만료 정보가 삭제되는지 운영 Preview에서 확인
- [ ] 스토어 최종 제출 전 사용자 승인
- [ ] App Store·Google Play 심사 제출

## 8. 배포 중단 조건

다음 중 하나라도 완료되지 않으면 Production 공개나 스토어 제출을 진행하지 않는다.

- [ ] iOS Release·Android 운영 AAB·스토어 서명 검증
- [ ] 최신 로컬 migration 2개·Edge Function 2개·변경된 `test-push`까지 Supabase remote에 배포하고 비발송 smoke test
- [ ] 실제 iOS·Android push 통합 검증
- [ ] Vercel Preview·Production·DNS 검증
- [ ] 법적 문서 원문·시행일·스토어 메타데이터 승인
- [x] 보유기간과 동일한 cleanup RPC·cron·테스트 로컬 완료
- [x] 원격 cleanup cron 적용
- [x] 원격 cleanup cron 실행 이력 4회 성공 확인
- [ ] 실제 만료정보 삭제 확인
- [ ] 사용자의 최종 배포·스토어 제출 승인

승인 전에는 Production 배포, DNS 변경, 실제 push 활성화, SNS 게시, 관리자 초대, App Store·Google Play 제출을 실행하지 않는다.
