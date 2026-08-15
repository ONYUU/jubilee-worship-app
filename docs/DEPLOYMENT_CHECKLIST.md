# 배포·스토어 출시 체크리스트

- 기준일: 2026-08-15 KST
- `[x]`: 현재 checkout에서 검증 완료
- `[ ]`: 미완료, 외부 연결 필요 또는 결과 미확인

## 1. 로컬 코드·데이터베이스 QA

- [x] Domain 단위 테스트 85/85 통과
- [x] Web 단위 테스트 25/25 통과
- [x] Mobile 단위 테스트 11/11 통과
- [x] Supabase pgTAP 330/330 통과
- [x] Edge Function 테스트 11/11 통과
- [x] Edge Function format·type check 통과
- [x] 시드 포함 `supabase db reset` 성공
- [x] DB lint warning/error 0
- [x] Security Advisor 보고 이슈 0
- [x] Performance Advisor 보고 이슈 0
- [x] `public`, `private`, `storage` schema diff 불일치 0

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
- [ ] 개인정보 보유기간 확정 후 동일 기간의 cleanup RPC·cron·삭제 회귀 테스트 완료(완료 전 앱 정책 공개 금지)

## 3. Android

- [x] Android Release APK 생성
- [x] Android 15 16KB page-size 에뮬레이터 설치
- [x] Android 15 16KB page-size 에뮬레이터 앱 기동
- [ ] Android 실기기 설치·핵심 플로우·알림 검증
- [ ] Store 서명 AAB 생성과 서명 정보 확인
- [ ] Google Play Console 앱 생성·앱 서명·내부 테스트 트랙 업로드
- [ ] 대상 API·16KB·데이터 안전·알림 권한 정책을 Play Console 최신 요구사항으로 재확인

## 4. iOS

- [x] iOS Simulator Debug 빌드 기존 성공 기록
- [x] iOS Simulator Release 빌드·Metro 없는 단독 실행
- [x] 앱 종료 후 `jubileeworship://notifications` 콜드 딥링크 확인
- [ ] iOS 실기기 설치·핵심 플로우·알림 검증
- [ ] Apple Developer Team·Bundle ID·서명·Provisioning Profile 확정
- [ ] Release Archive·Export·TestFlight 업로드
- [ ] App Store Connect 내부 테스트·심사 메타데이터 검증

Simulator Release는 통과했지만 무서명 빌드의 알림 Keychain entitlement는 실제 서명된 EAS 실기기에서 재검증한다.

## 5. Supabase remote·Push

- [ ] Preview Supabase remote 프로젝트 생성·link·migration 적용
- [ ] Production Supabase remote 프로젝트 생성·link·migration 적용
- [ ] 6개 Edge Function 배포
- [ ] `SUPABASE_SECRET_KEY`, Expo access token 등 운영 secret 설정
- [ ] 등록 API에 분산 rate limit·gateway 적용
- [ ] 실제 iOS·Android Expo push token 등록
- [ ] owner 시험 발송, Expo ticket, receipt, `DeviceNotRegistered` 처리 실기기 확인
- [x] 예배 알림 시각 `전날 19:30 KST` + `당일 1시간 전` 확정
- [ ] 두 예약을 예약 시각부터 15분 안에 queue하고 이후 만료하는 운영 scheduler·worker 활성화 및 재승인 흐름 실기기 확인
- [ ] 실제 발송 전 `PUSH_EXTERNAL_SEND_ENABLED=true` 변경 승인

로컬 Edge Function은 기본 `dryRun=true`이며, 실제 push 발송은 현재 활성화되지 않았다.

## 6. Vercel·도메인

- [ ] Vercel Preview 프로젝트·환경 변수·Preview Supabase 연결
- [ ] Preview에서 공개 DTO·관리자 CRUD·Storage·법적 문서·알림 회귀 검증
- [ ] Preview Playwright·Lighthouse·Core Web Vitals·외부 링크 재검증
- [ ] Production Vercel 프로젝트·환경 변수 설정
- [ ] 선두교회 하위 도메인 사용 승인
- [ ] DNS 레코드 생성·TLS·canonical·sitemap·robots·OG 확인
- [ ] 사용자가 Production 공개와 DNS 연결을 명시적으로 승인

## 7. EAS·스토어

- [ ] Expo/EAS 프로젝트 연결과 운영 환경 변수 설정
- [ ] iOS·Android 운영 서명 빌드 생성
- [ ] TestFlight·Google Play 내부 테스트 배포
- [ ] 내부 테스터 실기기 검수와 치명적 이슈 0건 확인
- [ ] App Store Privacy·Google Play Data safety·알림 권한 설명 완성
- [ ] 스크린샷·앱 설명·지원 URL·개인정보 URL·연령등급 확정
- [ ] `/privacy`에 검토 마커·미정값이 없고, 확정 운영주체·이메일·보유·삭제·국외 처리 실제값을 포함한 owner 공개 앱 정책이 표시되는지 확인
- [ ] 공개 정책의 보유기간과 실제 cleanup RPC·cron 설정이 일치하고 만료 정보가 삭제되는지 운영 Preview에서 확인
- [ ] 스토어 최종 제출 전 사용자 승인
- [ ] App Store·Google Play 심사 제출

## 8. 배포 중단 조건

다음 중 하나라도 완료되지 않으면 Production 공개나 스토어 제출을 진행하지 않는다.

- [ ] iOS Release·Android 실기기·스토어 서명 검증
- [ ] Supabase remote·Edge Function·실제 push 통합 검증
- [ ] Vercel Preview·Production·DNS 검증
- [ ] 법적 문서 원문·시행일·스토어 메타데이터 승인
- [ ] 보유기간과 동일한 cleanup RPC·cron·테스트 완료
- [ ] 사용자의 최종 배포·스토어 제출 승인

승인 전에는 Production 배포, DNS 변경, 실제 push 활성화, SNS 게시, 관리자 초대, App Store·Google Play 제출을 실행하지 않는다.
