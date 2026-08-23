# 쥬빌리워십 개발 일시중지 인계서

- 중지일: 2026-08-24 (Asia/Seoul)
- 중지 사유: 제품 오너 요청에 따른 개발 일시중지
- 작업 브랜치: `codex/notification-schedule-and-metadata`
- 기존 원격 검토 경로: GitHub Draft PR #11
- 재개 조건: 제품 오너가 쥬빌리워십 개발 재개를 명시적으로 요청할 때
- 제출 경계: App Store Connect 또는 Google Play Console의 실제 심사 제출은 하지 않음

## 1. 현재 상태

현재 변경분은 알림 개인정보 동의 v5, 알림 철회 정리 재시도, 스토어 선언 초안, 배포 게이트와 관련 테스트를 포함한다. 개발 중지 시점에 전체 자동검증은 최종 스크린샷 게이트를 제외하고 통과했다.

- 앱·웹 단위 테스트: 267건 통과
- Supabase Edge Function 테스트: 30건 통과
- Supabase pgTAP: 723건 통과
- 총 자동 테스트: 1,020건 통과
- lint, typecheck, Next/Expo build, Deno check, DB lint, `git diff --check`: 통과
- 기본 스토어 자산 검증: 통과
- 전체 스토어 자산 검증: iOS 6.9인치 최종 스크린샷 0/6으로 의도된 실패 차단

## 2. 원격에 이미 적용된 항목

- Supabase 원격 마이그레이션 21개가 일치하며, 알림 민감정보 동의 v5 마이그레이션까지 적용됨
- 알림 관련 Supabase Edge Function 8개가 v5 계약에 맞는 버전으로 배포되어 `ACTIVE` 상태임
- v5 적용 뒤 기존 알림 동의·토큰·구독·복구 상태는 비활성화 및 정리되었고, 새 등록 게이트는 닫힌 상태로 확인함
- Vercel Production의 `SUPABASE_SECRET_KEY`는 현재 Supabase 서버 비밀키로 교체했으나, 이 변경을 사용하는 새 Production 배포는 아직 실행하지 않음

주의: 적용 완료된 `20260823150748`, `20260823152830`, `20260823154935` 마이그레이션은 수정하지 않는다. 향후 동의문 또는 계약을 바꿀 때는 새 순방향 마이그레이션을 추가한다.

## 3. 아직 하지 않은 항목

- 현재 브랜치의 최신 코드로 Vercel Production 재배포
- 현재 브랜치의 최신 코드로 iOS 시뮬레이터 및 연결된 Android 실기기 재검증
- Firebase Production Android 앱 설정, `google-services.json`, FCM V1 자격증명 연결
- Apple Distribution 인증서, Provisioning Profile, APNs 키, App Store Connect 앱 레코드 연결
- 서명된 Production IPA/AAB 생성
- 스토어 최종 스크린샷 제작 및 자산 전체 게이트 통과
- 공개 개인정보처리방침의 법적 입력값 확정과 게시
- Apple App Privacy, Google Data Safety, 연령·대상·배포·거래자 상태 등 최종 선언
- App Store 또는 Play Store 실제 심사 제출

## 4. 재개 전 최우선 보안·개인정보 이슈

Android Production 생성 Manifest에 FCM 자동 초기화를 끄는 설정이 아직 없다. Firebase 공식 문서상 기본 자동 초기화는 사용자가 앱 내 별도 동의를 하기 전에 FCM 등록 정보가 생성·전송될 수 있으므로, 현재 v5의 “별도 동의 후 등록” 계약과 일치하지 않는다.

재개 즉시 다음을 먼저 처리한다.

1. Expo config plugin으로 Android `<application>`에 아래 메타데이터를 중복 없이 고정한다.
   - `firebase_messaging_auto_init_enabled=false`
   - `firebase_analytics_collection_enabled=false`
2. 현재 동의 경로의 명시적 `getExpoPushTokenAsync()`가 자동 초기화 OFF 상태에서만 토큰을 발급하는지 Production prebuild와 실제 Android 기기에서 확인한다.
3. Firebase Installation ID(FID)가 토큰 발급 때 생성되고 토큰 등록 해제 뒤에도 남을 수 있다는 공식 동작을 기준으로, v5 고지에 FID 처리를 추가할지 또는 네이티브 삭제를 구현할지 먼저 결정한다.
4. 고지문이 바뀌면 기존 v3~v5 파일을 고치지 말고 동의 v6 및 새 순방향 DB 마이그레이션을 만든다.

공식 근거:

- Firebase Android FCM 자동 초기화: https://firebase.google.com/docs/cloud-messaging/android/get-started#prevent-auto-init
- FirebaseMessaging 토큰·FID·등록 해제 동작: https://firebase.google.com/docs/reference/android/com/google/firebase/messaging/FirebaseMessaging

## 5. 안전한 재개 순서

1. 이 문서와 Draft PR #11의 최신 상태를 확인한다.
2. 제4항의 FCM 자동 초기화 및 FID 계약 불일치를 먼저 해결한다.
3. 동의 계약이 바뀌면 v6 순방향 마이그레이션과 Edge Function 계약을 로컬에서 검증한 뒤 원격에 적용한다.
4. 전체 lint, typecheck, 테스트 1,020건 이상, 앱·웹 build, DB reset/lint를 다시 실행한다.
5. 최신 커밋으로 Vercel Production을 재배포하고 공개 링크·보안 헤더·앱 링크 파일을 확인한다.
6. 최신 iOS 시뮬레이터 빌드와 Android Preview 빌드를 설치해 핵심 기능을 다시 확인한다.
7. 제품 오너 승인 아래 Firebase·Apple·Google의 Production 자격증명과 법적 선언을 연결한다.
8. 서명된 IPA/AAB, 스크린샷, 스토어 메타데이터와 내부 테스트를 마친 뒤 실제 심사 제출 직전에서 멈춘다.

## 6. 재개 시 기본 검증 명령

```bash
pnpm audit:baseline
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Supabase 검사는 저장소의 `supabase/README.md`와 CI 명령을 기준으로 Deno 검사, 로컬 reset, pgTAP 723건 이상, `public`·`private` lint를 모두 다시 실행한다.

## 7. 금지 사항

- v3~v5 원격 적용 마이그레이션을 수정하거나 삭제하지 않는다.
- Firebase·Apple·Google의 법적 체크박스나 공개 배포 설정을 제품 오너 확인 없이 확정하지 않는다.
- 비밀키, 서비스 계정 JSON, 서명 인증서를 Git 또는 문서에 저장하지 않는다.
- FCM 자동 초기화 문제를 해결하기 전 Production Android 빌드를 배포 대상으로 확정하지 않는다.
- 실제 스토어 심사 제출 버튼을 누르지 않는다.
