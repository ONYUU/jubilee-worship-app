# 출시 후보 개발본 QA 보고서

- 기준일: 2026-08-19 KST
- 범위: 로컬 코드·Supabase·Edge Function, v9 라이트·다크 모바일 Web, Android 16KB Release, iOS Simulator Release, 기존 EAS·Android 실기기 검증 기록
- 결론: v9 시작 자산·화면·라이트·다크·접근성·딥링크를 실제 앱에 반영했고 자동 검증과 Android 16KB 에뮬레이터·iOS Simulator Release 회귀를 통과했다. 다만 최신 v9의 Android 물리 기기, iPhone 실기기, 실제 APNs·FCM, 운영 서명·스토어 검증은 아직 완료되지 않았다.

## 1. 최신 자동 검증

| 영역 | 결과 | 판정 |
|---|---:|---:|
| Domain 단위 테스트 | 98/98 | 통과 |
| Web 단위 테스트 | 27/27 | 통과 |
| Mobile 단위 테스트 | 61/61 | 통과 |
| Supabase pgTAP | 567/567 | 통과 |
| Edge Function 단위 테스트 | 31/31 | 통과 |
| Edge Function format·type check | 24개 파일 | 통과 |

Domain·Web·Mobile 단위 테스트는 합계 186건이며 모두 통과했다. 이 수치는 DB pgTAP과 Edge Function 테스트를 포함하지 않는다. 전체 workspace lint·typecheck·test·web build·iOS/Android/Web Expo export와 Expo Doctor 21/21도 통과했다.

## 2. 데이터베이스·보안

| 검증 | 결과 |
|---|---:|
| 시드 포함 `supabase db reset` | 통과 |
| RLS·GRANT·Storage·RPC pgTAP | 567/567 통과 |
| Supabase DB lint | warning/error 0 |
| 원격 Security Advisor | 오류 0, 관리자 전용 RPC 정적 경고 27건 검토 완료 |
| Performance Advisor | 보고 이슈 0 |
| 로컬 migration 재현 schema와 현재 로컬 `public`, `private`, `storage` schema diff | 불일치 0 |

확인된 주요 보안 경계는 다음과 같다.

- 관리자는 owner가 Auth 사용자를 건별로 수동 승인하며, 마지막 active owner의 비활성화·강등은 차단된다.
- 법적 문서는 draft·published·withdrawn 상태와 버전·시행일을 가지며 owner만 공개·철회할 수 있다. 웹과 DB 공개 작업은 보유·삭제·국외 처리 및 약관 핵심 항목의 정확한 항목명과 실제 값이 모두 있는지 검증하며, `확인`·`검토`·`확정`·`완료`·`입력`·`기입`·`작성`·`미정`·`추후` 계열의 미완성 값은 거부한다.
- 설교·송리스트·갤러리·안내는 저장만으로 공개되지 않고 owner의 수동 공개 절차를 거친다.
- 공개된 갤러리·안내 행을 editor가 Data API로 직접 수정·삭제하는 우회는 차단된다.
- 앱 갤러리는 private `gallery-staging` 경로에서 owner 동의 확인 후 `public-media/app-gallery/`로 옮긴 객체만 공개할 수 있다.
- 앱 설치 secret은 원문 열을 두지 않고 SHA-256 hash만 저장하며, 알림 private table에 대한 anon·authenticated 직접 권한은 없다.
- development·preview·production 설치정보를 분리하고, 일반·예배 알림은 production 설치에만 발송한다. owner가 특정 기기로 보내는 시험 알림은 development·preview에서도 허용한다.
- 시험 기기는 실기기에서 생성한 10분 만료 HMAC 연결 코드를 active owner가 수동 승인한 development·preview endpoint만 허용하도록 로컬 구현·검증했다. raw 코드·설치 secret·Expo token은 관리자 목록과 DB에 노출하지 않고, 요청 UUID 재시도는 멱등하게 처리한다. 신규 migration·Edge Function 2개와 변경된 `test-push`는 아직 원격에 적용하지 않았다.
- 예배 알림은 owner가 미리 승인한 공개 `scheduled|postponed` 예배에 대해 `전날 19:30 KST`와 `당일 1시간 전` 두 예약을 중복 없이 생성하고, 예배·문구 기준 변경 시 재승인을 요구하도록 구현했다. 실제 queue는 예약 시각부터 15분 안에 운영 scheduler가 실행해야 한다.
- 알림 데이터 cleanup은 토큰 원문 최대 24시간, 180일 미활동 설치 비활성화, 비활성 설치정보 30일, 발송 상세 90일 기준으로 구현했다. 일일 cron, 멱등 실행, 직접 권한 차단, 경계값 삭제를 로컬 DB에서 검증했고 원격 cron을 활성화했다. 원격 실행 이력 4회는 성공했지만 만료 대상이 0건이어서 실제 만료정보 삭제 증거는 아직 없다.

## 3. Android 검증

| 항목 | 결과 | 범위 |
|---|---:|---|
| Android Release APK 생성 | 성공 | 로컬 Release APK |
| Android 15 16KB page-size 에뮬레이터 설치 | 성공 | 로컬 에뮬레이터 |
| Android 15 16KB page-size 에뮬레이터 앱 실행 | 성공 | 기본 기동 확인 |
| v9 라이트·다크·시작화면 | 성공 | 테마 저장·재실행 유지 포함 |
| v9 4개 탭·송리스트 빈 상태·주소 복사 | 성공 | 실제 송리스트 공개 데이터 표시는 미검증, 안내 시각 피드백·클립보드 포함 |
| Android 글자 크기 1.5 | 성공 | 홈 핵심 일정 문구 잘림 없음 |
| development 변형 딥링크 분리 | 성공 | `jubileeworship-dev`, production 스킴 미등록 |
| EAS development APK 생성 | 성공 | `org.sundoo.jubileeworship.dev`, target API 36, APK v2 서명 확인 |
| EAS development APK 실기기 설치 | 성공 | Samsung SM-G991N, Android 15 |
| Android 실기기 핵심 화면 | 성공 | 홈·예배·미디어·안내·송리스트 |
| Android 실기기 이동·공유 | 성공 | 캘린더 선택기·길찾기 선택창·공유 시트 확인, 외부 전송 없음 |
| Android 뒤로가기 회귀 | 성공 | 화면 버튼·시스템 Back·가장자리 제스처 모두 송리스트에서 예배로 복귀 |
| Android FCM 원격 알림 | 미완료 | Firebase/FCM 자격 증명 및 새 알림 빌드 필요 |
| Store 서명 AAB·Play 내부 테스트 | 미완료 | Google Play 연결 필요 |
| Play 비공개 테스트 12명·14일·Production access | 미완료 | 2025년 생성 개인 개발자 계정 필수 게이트 |

생성된 파일은 `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`에 있다. 최신 v9 Release는 16KB 페이지 정렬, 라이트·다크 시작 화면, 테마 저장, 4개 탭, 송리스트 빈 상태, 주소 복사, 뒤로가기, 글자 크기 1.5, development 딥링크를 Android 15 16KB 에뮬레이터에서 확인했다. 이 APK는 development/debug 인증서 기반이며 Google Play 업로드, 스토어 서명, 최신 v9의 물리 기기 검증 또는 스토어 승인을 의미하지 않는다.

2026-08-16 EAS development build `9d6ba4af-ad4c-419b-9319-7506100f0160`(commit `9159518`)을 Samsung SM-G991N(Android 15)에 설치했다. 4개 탭과 송리스트를 확인했고, 이전 빌드에서 시스템 Back이 앱을 종료하던 문제를 `predictiveBackGestureEnabled=false`로 수정한 뒤 화면 버튼·시스템 Back·가장자리 제스처가 모두 예배 화면으로 복귀함을 확인했다. 캘린더 선택기, 길찾기 선택창, Android 공유 시트도 열렸으며 저장·지도 선택·외부 공유 전송은 수행하지 않았다. Fatal·Unhandled JS 오류는 없었다. 이 결과물은 development client이므로 운영 서명 AAB와 실제 FCM 알림 검증을 대체하지 않는다.

## 4. iOS 검증

| 항목 | 결과 | 판정 |
|---|---:|---:|
| iOS Simulator Debug 빌드 | 기존 성공 기록 | 확인 |
| iOS Simulator Release 빌드 | 성공 | 통과 |
| Metro 없는 Release 단독 실행 | 성공 | 통과 |
| 앱 종료 후 알림함 custom-scheme 콜드 딥링크 | 성공 | 통과 |
| EAS Simulator development build | 생성·설치·실행 성공 | 홈·예배·미디어 화면 확인 |
| EAS Preview Simulator 원격 콘텐츠 | 생성·설치·실행 성공 | 원격 Supabase 예배 데이터 표시 확인 |
| Preview 알림함·알림설정 딥링크 | 성공 | 각 화면 진입 후 이전 버튼으로 홈 복귀 |
| v9 시작화면·라이트·다크 저장 | 성공 | 네이티브 아이콘→테마 전체화면→홈 |
| v9 홈·4탭·송리스트 빈 상태·주소 복사 | 성공 | 실제 송리스트 공개 데이터 표시는 미검증, Clipboard 실제 값·성공 피드백 포함 |
| iOS Dynamic Type 실행 중 변경·콜드 재실행 | 성공 | 현재 화면 유지, 한글 글리프 잘림 없음 |
| development·preview custom scheme 분리 | 성공 | `jubileeworship-dev`·`jubileeworship-preview` |
| iOS 실기기·Archive·TestFlight | 미완료 | Apple 계정·서명 필요 |

iPhone 17 Pro Simulator(iOS 26.5)에서 Release 앱을 설치한 뒤 Metro 없이 홈을 실행했다. 앱을 종료한 후 `jubileeworship://notifications`로 다시 열어 알림함 도착을 확인했고, Fatal·Unhandled·bundle URL 오류와 크래시 보고서는 없었다. 2026-08-16에는 별도의 EAS Simulator development build를 iPhone 17 Simulator에 설치하고 Metro에 연결해 홈·예배·미디어 화면을 확인했다. development build는 개발 검수용이며 독립 Release·실기기·스토어 빌드를 대체하지 않는다. 무서명 Simulator 빌드의 알림 Keychain entitlement는 실제 서명된 EAS 실기기 빌드에서 재검증해야 한다.

2026-08-19 v9 clean Release에서 홈 단체사진, 4개 탭, 안내 사진, 주소 복사 실제 pasteboard 값과 피드백, 라이트→다크 변경·재실행 유지, 송리스트 빈 상태를 확인했다. iOS에서 앱 실행 중 글자 크기를 바꾸었을 때 React Native 0.86 Fabric의 이전 텍스트 측정값이 남는 현상을 재현했고, fontScale 변경 시 현재 화면 콘텐츠의 텍스트를 재측정하도록 보완한 후 실행 중·콜드 재실행 모두에서 한글 잘림이 없음을 확인했다. development·preview·production 스킴도 분리했다. 이 검증은 Simulator Release이며 실제 iPhone·APNs·TestFlight를 대체하지 않는다.

2026-08-17에는 EAS Preview Simulator build `870d1615-ac38-4353-a4fa-c73913266d52`(commit `09c84da`)를 iPhone 17 Simulator(iOS 26.5)에 단독 설치했다. 원격 Supabase에서 2026-09-04 예배와 최근 영상을 읽어 홈에 표시했으며, 앱을 종료한 뒤 `jubileeworship://notifications`로 콜드 진입하고 화면의 이전 버튼으로 홈에 복귀했다. `jubileeworship://notification-settings` 진입·복귀도 성공했고, 시뮬레이터에는 실기기에서만 사용하는 시험 알림 연결 코드가 노출되지 않았다. 최근 실행 로그의 Fatal·Unhandled·exception·bundle URL 오류는 0건이었다.

Expo에 등록된 iPhone 테스트 기기는 확인했지만, 실기기용 내부 빌드는 Apple 서명 자격 증명 입력 단계에서 중단했다. Apple 비밀번호·2단계 인증값은 저장소나 채팅에 남기지 않고 사용자가 로컬 터미널에 직접 입력한 뒤 재개한다.

## 5. 웹 화면·접근성 기존 QA 기록

2026-08-19 v9 모바일 Web local export를 390×844 viewport에서 브라우저로 확인했다. 홈·예배·미디어·안내·송리스트, 검색, 주소 복사, 라이트·다크 저장·재로드를 확인했다. 빈 화면·오류 overlay·깨진 이미지·수평 overflow·page error는 없었고, WCAG 자동 접근성 위반과 보이는 44px 미만 터치 대상은 0건이었다. Web에서는 Expo push-token listener가 동작하지 않는다는 공식 모듈 경고 1건만 있었으며 listener는 no-op이다. 이 검증은 네이티브 실기기 검증을 대체하지 않는다.

다음은 2026-08-13 웹 개발본에서 확인한 기존 기준선이다. 최신 관리자·모바일 연동 변경을 반영한 운영 Preview 회귀 검증을 대체하지 않는다.

- 공개 6개 경로를 360, 390, 768, 1024, 1280, 1440px 총 36개 조합에서 확인했다.
- 수평 넘침·누락된 H1·콘솔 오류가 없었고 WCAG A·AA 자동 접근성 위반은 0건이었다.
- 모바일 메뉴 포커스·Tab·Escape, 주소 복사 `aria-live`, 사용자 선택 전 YouTube iframe 미로드를 확인했다.
- Lighthouse 13.4.1 로컬 측정은 모바일 95/100/100/100, 데스크톱 100/100/100/100이었다. 이 수치는 운영 호스팅·네트워크의 필드 지표가 아니다.

## 6. 외부 미완료 항목

다음은 로컬 코드 완료와 별개의 배포·운영 게이트다.

1. 신규 시험 알림 연결 migration·딥링크 허용 경로 migration·Edge Function 2개, 변경된 기존 `test-push`, `TEST_PUSH_PAIRING_PEPPER`를 원격 Supabase에 안전 순서로 적용하고 최초 owner Auth 계정·SMTP를 설정
2. Firebase Android 앱 3종 등록 완료, `google-services.json` EAS Secret File 및 최소권한 FCM V1 자격 증명 연결
3. Expo 실제 push 발송·receipt·`DeviceNotRegistered` 실기기 확인
4. 전날 19:30·당일 1시간 전 알림을 예약 시각부터 15분 안에 queue할 외부 scheduler 활성화
5. 서버 secret이 없는 Vercel Preview와 Production 배포, 운영 연결 QA, 도메인·DNS
6. APNs·FCM, iOS·Android 실기기 서명·내부 테스트 트랙, Play 비공개 테스트 12명·14일과 Production access
7. iOS 실기기·Archive·TestFlight와 Android 실기기·AAB 검증
8. 개인정보처리방침·이용약관 최종 원문과 시행일 승인(운영주체 `쥬빌리 워십`, 문의·개인정보 `sundoojubileeworship@gmail.com`은 확정·반영 완료)
9. 원격 cleanup cron이 실제 만료정보를 정책 기간에 맞춰 삭제하는지 최초 대상 발생 후 확인. 완료 전 앱 정책 공개·스토어 개인정보 URL 사용 금지
10. 실제 설교·송리스트를 관리자에서 검수·공개한 뒤 앱의 주제·말씀 구절·곡·아티스트·KEY·공식 YouTube 링크 표시를 검증
11. App Store·Google Play 정책 문서, 스크린샷, 메타데이터, 심사 제출

## 7. 최종 판정

- 로컬 DB·Edge·자동 테스트: **통과**
- Android v9 Release APK·16KB Android 15 에뮬레이터·테마·뒤로가기·딥링크: **통과**
- Android 15 물리 기기 기존 development APK·핵심 화면·뒤로가기: **통과**, **최신 v9 재검증 전**
- iOS v9 Release Simulator·테마·Dynamic Type·주소 복사·변형별 custom scheme: **통과**
- iOS 실기기·서명·스토어 배포: **미완료**
- Expo/EAS 개발 프로젝트·iOS Simulator development build·Android development APK: **완료**
- Supabase 기존 remote schema·Edge Function·retention cron: **적용 완료, 실제 push·만료정보 삭제 검증 전**
- 시험 알림 연결 migration·딥링크 허용 경로 migration·Edge Function 2개·변경된 `test-push`·server pepper: **로컬 검증 완료, 원격 미적용**
- Vercel·DNS·실제 push: **미완료**

따라서 현재 상태는 **로컬 출시 후보 개발본**이며, **스토어 출시 또는 운영 배포 완료 상태는 아니다**.
