# 출시 후보 개발본 QA 보고서

- 기준일: 2026-08-15 KST
- 범위: 로컬 코드·Supabase·Edge Function 검증, Android Release APK 및 에뮬레이터, iOS Release Simulator, 모바일 Web export
- 결론: 로컬 출시 후보 개발본의 주요 자동 검증과 Android·iOS 시뮬레이터 실행은 통과했다. 다만 운영 배포·실기기·스토어 검증은 아직 완료되지 않았다.

## 1. 최신 자동 검증

| 영역 | 결과 | 판정 |
|---|---:|---:|
| Domain 단위 테스트 | 85/85 | 통과 |
| Web 단위 테스트 | 15/15 | 통과 |
| Mobile 단위 테스트 | 9/9 | 통과 |
| Supabase pgTAP | 252/252 | 통과 |
| Edge Function 단위 테스트 | 11/11 | 통과 |
| Edge Function format·type check | 19개 파일 | 통과 |

Domain·Web·Mobile 단위 테스트는 합계 109건이며 모두 통과했다. 이 수치는 DB pgTAP과 Edge Function 테스트를 포함하지 않는다.

## 2. 데이터베이스·보안

| 검증 | 결과 |
|---|---:|
| 시드 포함 `supabase db reset` | 통과 |
| RLS·GRANT·Storage·RPC pgTAP | 252/252 통과 |
| Supabase DB lint | warning/error 0 |
| Security Advisor | 보고 이슈 0 |
| Performance Advisor | 보고 이슈 0 |
| `public`, `private`, `storage` schema diff | 불일치 0 |

확인된 주요 보안 경계는 다음과 같다.

- 관리자는 owner가 Auth 사용자를 건별로 수동 승인하며, 마지막 active owner의 비활성화·강등은 차단된다.
- 법적 문서는 draft·published·withdrawn 상태와 버전·시행일을 가지며 owner만 공개·철회할 수 있다.
- 설교·송리스트·갤러리·안내는 저장만으로 공개되지 않고 owner의 수동 공개 절차를 거친다.
- 공개된 갤러리·안내 행을 editor가 Data API로 직접 수정·삭제하는 우회는 차단된다.
- 앱 갤러리는 private `gallery-staging` 경로에서 owner 동의 확인 후 `public-media/app-gallery/`로 옮긴 객체만 공개할 수 있다.
- 앱 설치 secret은 원문 열을 두지 않고 SHA-256 hash만 저장하며, 알림 private table에 대한 anon·authenticated 직접 권한은 없다.
- 예배 D-1 알림은 owner가 미리 승인한 공개 `scheduled|postponed` 예배만 KST 기준으로 중복 없이 queue할 수 있다.

## 3. Android 검증

| 항목 | 결과 | 범위 |
|---|---:|---|
| Android Release APK 생성 | 성공 | 로컬 Release APK |
| Android 15 16KB page-size 에뮬레이터 설치 | 성공 | 로컬 에뮬레이터 |
| Android 15 16KB page-size 에뮬레이터 앱 실행 | 성공 | 기본 기동 확인 |
| Android 실기기 테스트 | 미완료 | 외부 기기 필요 |
| Store 서명 AAB·Play 내부 테스트 | 미완료 | Google Play 연결 필요 |

생성된 파일은 `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`에 있다. 이 APK 생성과 에뮬레이터 기동 성공은 Google Play 업로드, 스토어 서명, 실기기 검증 또는 스토어 승인을 의미하지 않는다.

## 4. iOS 검증

| 항목 | 결과 | 판정 |
|---|---:|---:|
| iOS Simulator Debug 빌드 | 기존 성공 기록 | 확인 |
| iOS Simulator Release 빌드 | 성공 | 통과 |
| Metro 없는 Release 단독 실행 | 성공 | 통과 |
| 앱 종료 후 알림함 custom-scheme 콜드 딥링크 | 성공 | 통과 |
| iOS 실기기·Archive·TestFlight | 미완료 | Apple 계정·서명 필요 |

iPhone 17 Pro Simulator(iOS 26.5)에서 Release 앱을 설치한 뒤 Metro 없이 홈을 실행했다. 앱을 종료한 후 `jubileeworship://notifications`로 다시 열어 알림함 도착을 확인했고, Fatal·Unhandled·bundle URL 오류와 크래시 보고서는 없었다. 무서명 Simulator 빌드에서 발생한 알림 Keychain entitlement 경고는 실제 서명된 EAS 실기기 빌드에서 재검증해야 한다.

## 5. 웹 화면·접근성 기존 QA 기록

2026-08-15 모바일 Web local export를 390×844 viewport에서 브라우저로 확인했다. 홈·예배·별도 송리스트·알림 설정 화면이 렌더링됐고, 빈 화면·오류 overlay·깨진 이미지·수평 overflow·page error는 없었다. Web에서는 Expo push-token listener가 동작하지 않는다는 공식 모듈 경고 1건만 있었으며 listener는 no-op이다. 이 검증은 네이티브 실기기 검증을 대체하지 않는다.

다음은 2026-08-13 웹 개발본에서 확인한 기존 기준선이다. 최신 관리자·모바일 연동 변경을 반영한 운영 Preview 회귀 검증을 대체하지 않는다.

- 공개 6개 경로를 360, 390, 768, 1024, 1280, 1440px 총 36개 조합에서 확인했다.
- 수평 넘침·누락된 H1·콘솔 오류가 없었고 WCAG A·AA 자동 접근성 위반은 0건이었다.
- 모바일 메뉴 포커스·Tab·Escape, 주소 복사 `aria-live`, 사용자 선택 전 YouTube iframe 미로드를 확인했다.
- Lighthouse 13.4.1 로컬 측정은 모바일 95/100/100/100, 데스크톱 100/100/100/100이었다. 이 수치는 운영 호스팅·네트워크의 필드 지표가 아니다.

## 6. 외부 미완료 항목

다음은 로컬 코드 완료와 별개의 배포·운영 게이트다.

1. Preview·Production Supabase remote 프로젝트 연결, migration 적용, Edge Function 배포
2. 운영 secret, 최초 owner Auth 계정, SMTP·인증 설정
3. Expo 실제 push 발송·receipt·`DeviceNotRegistered` 실기기 확인
4. D-1 알림 외부 scheduler 실행 시간 확정 및 활성화
5. Vercel Preview·Production 배포, 운영 연결 QA, 도메인·DNS
6. EAS 프로젝트, Apple Developer, Google Play Console, 서명·내부 테스트 트랙
7. iOS 실기기·Archive·TestFlight와 Android 실기기·AAB 검증
8. 개인정보 처리방침·이용약관 최종 원문, 시행일, 문의 연락처 승인
9. App Store·Google Play 정책 문서, 스크린샷, 메타데이터, 심사 제출

## 7. 최종 판정

- 로컬 DB·Edge·자동 테스트: **통과**
- Android Release APK·16KB Android 15 에뮬레이터: **통과**
- iOS Release Simulator·custom-scheme 콜드 딥링크: **통과**
- iOS 실기기·서명·스토어 배포: **미완료**
- Supabase remote·Vercel·DNS·실제 push: **미완료**

따라서 현재 상태는 **로컬 출시 후보 개발본**이며, **스토어 출시 또는 운영 배포 완료 상태는 아니다**.
