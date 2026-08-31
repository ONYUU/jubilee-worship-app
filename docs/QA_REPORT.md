# 출시 후보 개발본 QA 보고서

- 기준일: 2026-08-23 KST
- 범위: 커밋 `aaeed5ebb208d9a222eb89e953d9fbacb4c7c65b` Preview artifact의 기존 실기기·Simulator 검증, 출시 기준선 커밋 `73666286a4590a62f481ba62ea62a1541e5872e5`, Supabase remote, Vercel Production, EAS·Firebase·Apple·Google Play의 실시간 연결 상태
- 결론: 2026-08-23 현재 작업트리에서 Domain 98/98, Web 35/35, Mobile 115/115, Supabase pgTAP 720/720, workspace lint·typecheck·test·production build가 통과했다. 기존 Edge Function 29/29 통과와 원격 migration 15개·Edge Function 8개 활성 검증은 이전 기준선이다. 현재 checkout에는 법적 문서 gate를 보강한 신규 비파괴 전진형 migration 3개가 더 있고, 총 18개 migration의 로컬 reset·test만 통과했으며 원격에는 미적용이다. Android Production EAS keystore와 iOS Production Simulator build는 생성했으나 App Store 서명 IPA, Android Production APK·AAB는 없다. Firebase Production 앱과 Google Play 앱, iOS Distribution Certificate·Provisioning Profile·APNs key·App Store Connect API key도 없다. 따라서 실제 push·스토어 내부 테스트·정책 공개·최종 스크린샷·심사 제출은 미완료다.

Universal Link·App Link association 파일은 Production에 배포해 HTTPS 응답을
검증했다. 다만 이 서버 응답 검증은 운영 서명 앱에서의 실기기 링크 검증 완료를
의미하지 않는다.

## 1. 최신 자동 검증

| 영역 | 결과 | 판정 |
|---|---:|---:|
| Domain 단위 테스트 | 98/98 | 통과 |
| Web 단위 테스트 | 35/35 | 통과 |
| Mobile 단위 테스트 | 115/115 | 통과 |
| Supabase pgTAP | 720/720 | 통과 |
| Edge Function 단위 테스트 | 29/29 | 통과 |
| Edge Function format·type check | 25개 파일 | 통과 |
| Production dependency audit baseline | High 2, Moderate·Critical 0 | Expo Metro의 패치 미출시 `image-size` 두 권고만 허용, 신규 권고 0 |

Domain·Web·Mobile 단위 테스트는 합계 248건이며 모두 통과했다. 이 수치는 DB pgTAP과 Edge Function 테스트를 포함하지 않는다. 최신 법적 문서 gate·네이티브 안전영역·반응형 변경 후 workspace lint·typecheck·test·웹 production build, iOS/Android/Web Expo export, Expo Doctor 21/21, Expo 의존성 정합성 검사를 다시 통과했다.

## 2. 데이터베이스·보안

| 검증 | 결과 |
|---|---:|
| 최신 migration 포함 `supabase db reset --local --no-seed` | 통과 |
| RLS·GRANT·Storage·RPC pgTAP | 720/720 통과 |
| Supabase DB lint | warning/error 0 |
| 원격 Security Advisor | `SECURITY DEFINER` 실행 RPC 경고 존재; 내부 인증·HMAC·rate-limit gate 검토 완료(경고 0으로 간주하지 않음) |
| Performance Advisor | 보고 이슈 0 |
| 로컬 migration 재현 schema와 현재 로컬 `public`, `private`, `storage` schema diff | 불일치 0 |

확인된 주요 보안 경계는 다음과 같다.

- 관리자는 owner가 Auth 사용자를 건별로 수동 승인하며, 마지막 active owner의 비활성화·강등은 차단된다.
- 법적 문서는 draft·published·withdrawn 상태와 버전·시행일을 가지며 owner만 공개·철회할 수 있다. 웹과 DB 직접 RPC는 동일한 필수 고지 37개·금지 문구 8개·개인정보 운영 라벨 30개·약관 라벨 6개를 검증한다. 정책·약관 문의 이메일은 앱 상수와 잠긴 `site_settings(id=1).contact_email`에 대소문자까지 일치해야 한다. 공급자 항목 내 동일 주소, 전화번호, 수신자 HTTPS URL 또는 이메일, 법적 명칭, 약관의 주소+전화 형식도 필드별로 검증하므로 모든 marker를 같은 승인 기록으로 바꾸는 우회는 거부된다. `N/A:`·`NA.`·공백 변형 `해당 없음`과 계약·법률검토의 미래형 미확정 문구도 웹과 DB에서 거부한다. 이 검증은 형식과 문구의 완성도를 확인하며, 실제 연락처·계약·법적 근거의 진실성은 owner 증빙과 법률 검토로 확정해야 한다.
- 설교·송리스트·갤러리·안내는 저장만으로 공개되지 않고 owner의 수동 공개 절차를 거친다.
- 공개된 갤러리·안내 행을 editor가 Data API로 직접 수정·삭제하는 우회는 차단된다.
- 앱 갤러리는 private `gallery-staging` 경로에서 owner 동의 확인 후 `public-media/app-gallery/`로 옮긴 객체만 공개할 수 있다.
- 앱 설치 secret은 원문 열을 두지 않고 SHA-256 hash만 저장하며, 알림 private table에 대한 anon·authenticated 직접 권한은 없다.
- 알림 등록은 Expo token을 JSON 인자가 아닌 custom header로 받고, 기기가 보관하는 증명값보다 한 단계 더 hash한 H2만 DB에 저장한다. 등록은 insert-only이며 기존 설치 ID·provider token takeover를 거부하도록 로컬 검증했다.
- 요청 출처는 IP 원문 대신 프로젝트 비밀키 HMAC 가명값으로 제한한다. 등록은 1분 제한과 별도로 하루 같은 출처 100회·전체 500회를 상한으로 두며, 잘못된 형식의 Expo token도 카운트한다. 101번째·501번째 차단, 등록 중단 스위치의 typed denial·미생성, anon·authenticated·service_role의 abuse-control table 직접 권한 없음을 pgTAP으로 확인했다.
- 일일 HMAC rate row는 요청이 이어지는 동안 다음 창으로 갱신될 수 있다. 마지막으로 시작된 일일 창에 추가 요청이 없으면 창 시작 25시간 후 만료하며, 5분 cleanup cron 지연을 포함하면 약 25시간 5분 뒤 삭제된다. 이 기준은 개인정보처리방침 초안과 공개 gate에 반영됐지만, 최종 정책 공개는 법률·실무 결정 후에만 가능하다.
- development·preview·production 설치정보를 분리하고, 일반·예배 알림은 production 설치에만 발송한다. owner가 특정 기기로 보내는 시험 알림은 development·preview에서도 허용한다.
- 시험 기기는 실기기에서 생성한 10분 만료 HMAC 연결 코드를 active owner가 수동 승인한 development·preview endpoint만 허용하도록 구현·검증했으며, 관련 migration과 Edge Function을 원격에 적용했다. raw 코드·설치 secret·Expo token은 관리자 목록과 DB에 노출하지 않고, 요청 UUID 재시도는 멱등하게 처리한다. `TEST_PUSH_PAIRING_PEPPER`는 설정했지만 최초 owner가 없고 등록 중단 상태이므로 실제 연결 승인·시험 push는 수행하지 않았다.
- 예배 알림은 owner가 미리 승인한 공개 `scheduled|postponed` 예배에 대해 `전날 19:30 KST`와 `당일 1시간 전` 두 예약을 중복 없이 생성하고, 예배·문구 기준 변경 시 재승인을 요구하도록 구현했다. 실제 queue는 예약 시각부터 15분 안에 운영 scheduler가 실행해야 한다.
- 알림 데이터 cleanup은 토큰 원문 최대 24시간, 180일 미활동 설치 비활성화, 비활성 설치정보 30일, 발송 상세 90일 기준으로 구현했다. 일일 cron, 멱등 실행, 직접 권한 차단, 경계값 삭제를 로컬 DB에서 검증했고 원격 cron을 활성화했다. 원격 실행 이력 4회는 성공했지만 만료 대상이 0건이어서 실제 만료정보 삭제 증거는 아직 없다.

원격 migration 15개·Edge Function 8개·legacy endpoint 410·direct v2 `REGISTRATION_DISABLED`는 이전 원격 기준선 검증 결과다. 현재 checkout의 `20260823130815`, `20260823132500`, `20260823143000` migration은 로컬 reset과 pgTAP을 통과했지만 원격에 적용하지 않았다. 따라서 원격이 현재 로컬 18개 migration과 일치한다고 표시하면 안 된다. 기존 원격은 `registration_enabled=false`, `policy_ready=false`, 법적 문서·설치·endpoint·구독·동의·복구 관련 행 및 실제 push 0건으로 확인된 상태였다.

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
| EAS Preview APK build `f60bcbcc-de16-457b-99cd-d3a9460df37d` | 성공 | commit `aaeed5e`, Samsung SM-G991N replace install·핵심 회귀·만 14세 gate·Fatal/ANR 0건 |
| Preview APK 정적 검증 | 성공 | SHA-256 `2f9773412dbd040dd368fd115f636f31dfe258a4c9c033c3abdc51c56c641f07`, target API 36, v2 서명, 64-bit arm64/x86_64 ELF·ZIP 16KB 정렬 |
| API 36 16KB Pixel Tablet 조기 QA | 성공 | 4탭·테마 저장·회전·50:50 분할·864×1600 축소·복원, crash/ANR 0 |
| API 36 16KB Pixel 9 Pro Fold 조기 QA | 성공 | 펼침·반접힘·접힘·외부화면·재펼침·회전·상태 유지, crash/ANR 0 |
| Google Play target API 정책 | 충족 | 2026-08-31부터 신규 앱 API 36 이상 필요, 현재 target API 36 |
| Android Production EAS keystore | 생성 완료 | Production package용; SHA-256는 `docs/APP_LINK_ASSOCIATION.md` 참조 |
| EAS Production Android build | 미완료 | 2026-08-23 기준 0건 |
| Android FCM 원격 알림 | 미완료 | `GOOGLE_SERVICES_JSON` 미설정으로 Firebase 초기화 단계에서 중단; token·실제 push·receipt 0건 |
| Store 서명 AAB·Play 내부 테스트 | 미완료 | Play 앱 미생성; 등록 폼 기본값만 준비하고 외부 선언·생성 확인 대기 |
| Play 비공개 테스트 12명·14일·Production access | 미완료 | 2025년 생성 개인 개발자 계정 필수 게이트 |

생성된 파일은 `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`에 있다. 최신 v9 Release는 16KB 페이지 정렬, 라이트·다크 시작 화면, 테마 저장, 4개 탭, 송리스트 빈 상태, 주소 복사, 뒤로가기, 글자 크기 1.5, development 딥링크를 Android 15 16KB 에뮬레이터에서 확인했다. 이 APK는 development/debug 인증서 기반이며 Google Play 업로드, 스토어 서명, 최신 v9의 물리 기기 검증 또는 스토어 승인을 의미하지 않는다.

2026-08-23에는 Production package용 Android EAS keystore를 생성했다. 이는
운영 서명 자격 증명 준비에 해당하며 AAB 생성·Play 업로드·Play App Signing
완료를 의미하지 않는다. 같은 시점에 Samsung SM-G991N(Android 15)은 Mac에
연결되어 있지만 Firebase Production 앱은 아직 생성하지 않았다.

2026-08-16 EAS development build `9d6ba4af-ad4c-419b-9319-7506100f0160`(commit `9159518`)을 Samsung SM-G991N(Android 15)에 설치했다. 4개 탭과 송리스트를 확인했고, 이전 빌드에서 시스템 Back이 앱을 종료하던 문제를 `predictiveBackGestureEnabled=false`로 수정한 뒤 화면 버튼·시스템 Back·가장자리 제스처가 모두 예배 화면으로 복귀함을 확인했다. 캘린더 선택기, 길찾기 선택창, Android 공유 시트도 열렸으며 저장·지도 선택·외부 공유 전송은 수행하지 않았다. Fatal·Unhandled JS 오류는 없었다. 이 결과물은 development client이므로 운영 서명 AAB와 실제 FCM 알림 검증을 대체하지 않는다.

2026-08-20 EAS Preview build `f60bcbcc-de16-457b-99cd-d3a9460df37d`(commit `aaeed5e`, package `org.sundoo.jubileeworship.preview`)를 Samsung SM-G991N(Android 15/API 35)에 replace install했다. 공식 launcher icon, 새 홈 예배 사진, 4개 탭, 라이트·다크 강제종료 후 유지, 송리스트의 화면 버튼·시스템 Back·왼쪽 edge Back을 확인했다. 알림 종류 선택 전 만 14세 확인과 별도 동의가 먼저 표시되고, `별도 동의하고 알림 켜기`를 누른 뒤에만 Android 권한창이 표시됐다. 미확인·권한 거절 시 선택은 모두 꺼진 상태로 복구됐다. OS 권한을 시험용으로 허용한 뒤에는 Firebase 설정 부재로 `Default FirebaseApp is not initialized` 단계에서 중단돼 서버 RPC 및 FCM token 생성에는 도달하지 못했다. 원격 등록·정책 gate는 계속 꺼져 있고 관련 DB 행과 실제 push는 0건이다. 최종 logcat과 ApplicationExitInfo의 crash·ANR는 0건이며 권한은 다시 철회했다. SM-G991N의 page size는 4KB이므로 이 기기에서 16KB runtime을 검증한 것은 아니며, APK의 64-bit ELF와 ZIP 정렬을 정적으로 검증했다.

2026-08-23에는 API 36·16KB Google Play ARM64 이미지로 Pixel Tablet과 Pixel 9
Pro Fold AVD를 별도 생성해 개발 변형 Release APK를 조기 검수했다. APK는 target
API 36, runtime page size 16,384 bytes이며 ZIP 16KB 정렬과 ARM64 라이브러리
25개의 `PT_LOAD >= 0x4000`을 통과했다. Tablet은 4개 탭·라이트/다크 저장·
회전·50:50 분할화면·864×1600 축소·복원을, Fold는 펼침→반접힘→접힘
→외부화면→재펼침·회전과 같은 PID·탭·테마 유지를 통과했다. 각 clean
final logcat과 ApplicationExitInfo에서 쥬빌리 앱 crash·ANR는 0건이었다. 이는
`org.sundoo.jubileeworship.dev` 개발 변형·debug 인증서·로컬 콘텐츠 APK의
조기 결과이므로 Firebase·Supabase 운영 설정이 포함된 최종 `production-device`
서명 APK에서 같은 매트릭스를 반복해야 한다.

## 4. iOS 검증

| 항목 | 결과 | 판정 |
|---|---:|---:|
| iOS Simulator Debug 빌드 | 기존 성공 기록 | 확인 |
| iOS Simulator Release 빌드 | 성공 | 통과 |
| Metro 없는 Release 단독 실행 | 성공 | 통과 |
| 앱 종료 후 알림함 custom-scheme 콜드 딥링크 | 성공 | 통과 |
| EAS Simulator development build | 생성·설치·실행 성공 | 홈·예배·미디어 화면 확인 |
| EAS Preview Simulator build `5756d596-dc2e-478f-aacc-e094b8f78bb7` | 생성·clean install·실행 성공 | commit `aaeed5e`, 공식 아이콘·새 홈 사진·4개 탭·테마 유지·만 14세 gate·Simulator fail-closed 확인 |
| Preview 알림함·알림설정 딥링크 | 성공 | 각 화면 진입 후 이전 버튼으로 홈 복귀 |
| v9 시작화면·라이트·다크 저장 | 성공 | 네이티브 아이콘→테마 전체화면→홈 |
| v9 홈·4탭·송리스트 빈 상태·주소 복사 | 성공 | 실제 송리스트 공개 데이터 표시는 미검증, Clipboard 실제 값·성공 피드백 포함 |
| iOS Dynamic Type 실행 중 변경·콜드 재실행 | 성공 | 현재 화면 유지, 한글 글리프 잘림 없음 |
| development·preview custom scheme 분리 | 성공 | `jubileeworship-dev`·`jubileeworship-preview` |
| Apple Team·Production Bundle ID | 확인 | Team `N84F73NX4K`, `org.sundoo.jubileeworship` |
| EAS Production Simulator build `583708c5-d674-4524-863c-36ae40db46f8` | 생성·설치·독립 실행 성공 | commit `7366628`, 앱 `1.0.0` build `1`, iPhone 17 Simulator(iOS 26.5) |
| Production Simulator 핵심 회귀 | 성공 | 홈·예배 상세·송리스트·미디어 검색·안내·알림함·알림 미동의·라이트/다크 저장 |
| iOS Distribution Certificate·Provisioning Profile·APNs·ASC API key | 없음 | 생성·설정 필요 |
| App Store용 EAS Production iOS build | 미완료 | Simulator 산출물은 Distribution 서명·IPA·TestFlight를 대체하지 않음 |
| iOS 실기기·Archive·TestFlight | 미완료 | 등록 기기는 있으나 현재 iPhone 미연결, 서명 자격 증명 필요 |

iPhone 17 Pro Simulator(iOS 26.5)에서 Release 앱을 설치한 뒤 Metro 없이 홈을 실행했다. 앱을 종료한 후 `jubileeworship://notifications`로 다시 열어 알림함 도착을 확인했고, Fatal·Unhandled·bundle URL 오류와 크래시 보고서는 없었다. 2026-08-16에는 별도의 EAS Simulator development build를 iPhone 17 Simulator에 설치하고 Metro에 연결해 홈·예배·미디어 화면을 확인했다. development build는 개발 검수용이며 독립 Release·실기기·스토어 빌드를 대체하지 않는다. 무서명 Simulator 빌드의 알림 Keychain entitlement는 실제 서명된 EAS 실기기 빌드에서 재검증해야 한다.

2026-08-19 v9 clean Release에서 홈 단체사진, 4개 탭, 안내 사진, 주소 복사 실제 pasteboard 값과 피드백, 라이트→다크 변경·재실행 유지, 송리스트 빈 상태를 확인했다. iOS에서 앱 실행 중 글자 크기를 바꾸었을 때 React Native 0.86 Fabric의 이전 텍스트 측정값이 남는 현상을 재현했고, fontScale 변경 시 현재 화면 콘텐츠의 텍스트를 재측정하도록 보완한 후 실행 중·콜드 재실행 모두에서 한글 잘림이 없음을 확인했다. development·preview·production 스킴도 분리했다. 이 검증은 Simulator Release이며 실제 iPhone·APNs·TestFlight를 대체하지 않는다.

2026-08-17에는 EAS Preview Simulator build `870d1615-ac38-4353-a4fa-c73913266d52`(commit `09c84da`)를 iPhone 17 Simulator(iOS 26.5)에 단독 설치했다. 원격 Supabase에서 2026-09-04 예배와 최근 영상을 읽어 홈에 표시했으며, 앱을 종료한 뒤 `jubileeworship://notifications`로 콜드 진입하고 화면의 이전 버튼으로 홈에 복귀했다. `jubileeworship://notification-settings` 진입·복귀도 성공했고, 시뮬레이터에는 실기기에서만 사용하는 시험 알림 연결 코드가 노출되지 않았다. 최근 실행 로그의 Fatal·Unhandled·exception·bundle URL 오류는 0건이었다.

2026-08-20 EAS Preview Simulator build `5756d596-dc2e-478f-aacc-e094b8f78bb7`(commit `aaeed5e`, bundle `org.sundoo.jubileeworship.preview`)을 iPhone 17 Pro Simulator에 clean install했다. artifact SHA-256은 `39eacb096d85de7521a92aab1b1ec2a3f1f0e6cb989ac1874fde9e60814b235f`이다. 공식 launcher icon, 새 홈 예배 사진, 4개 탭, 라이트·다크 저장 및 재실행 유지를 확인했다. 만 14세 확인 전에는 별도 동의 버튼이 비활성화되고 확인 후 활성화됐으며, 동의 뒤에는 Simulator에서 실기기 전용 기능으로 fail-closed 처리됐다. Fatal·crash report는 0건이고 실제 push는 수행하지 않았다. 재설치 복구 UI는 등록된 실기기 token이 없어 직접 진입하지 못했으며, targeted test 27/27과 production 복구 거부로 보완 검증했다.

2026-08-23 EAS Production Simulator build `583708c5-d674-4524-863c-36ae40db46f8`
(commit `7366628`, bundle `org.sundoo.jubileeworship`, 앱 `1.0.0` build `1`)을
iPhone 17 Simulator(iOS 26.5)에 설치해 Metro 없이 실행했다. 승인된 홈 사진,
다가오는 예배, 예배 상세, 준비 중 송리스트, 미디어와 검색 결과·빈 결과, 안내,
알림함, 알림 설정의 만 14세 확인 전 동의 버튼 비활성화, 미동의 복귀를 확인했다.
라이트→다크 변경 뒤 강제 종료·재실행에도 다크 설정이 유지됐고 검수 후 라이트로
복원했다. 개인정보 화면은 의도한 차단 상태인 `개인정보 처리방침 공개 전입니다`를
표시하므로 스토어 개인정보 URL로는 아직 사용할 수 없다. 실제 민감정보·설치 ID·
푸시 토큰 전송과 OS 권한 허용은 별도 승인 전이라 수행하지 않았다. 검수 중 앱 종료,
Unhandled JS, bundle URL 오류나 crash는 없었다. 로그에는 향후 iOS에서 UIScene
lifecycle이 필요하다는 런타임 경고와 Simulator UIFocus·haptic·network 계층
진단이 있었다. [Apple TN3187](https://developer.apple.com/documentation/technotes/tn3187-migrating-to-the-uikit-scene-based-life-cycle)
기준 이 경고는 iOS 26 SDK의 현재 실행·제출 차단은 아니지만 iOS 27 최신 SDK
빌드부터 UIScene 미채택 앱은 실행되지 않는다. Expo SDK 57은
[완전한 UIScene lifecycle을 지원하지 않으므로](https://github.com/expo/expo/issues/47570#issuecomment-4903598460)
manifest만 추가하지 않고,
이번 제출용 EAS iOS image를 `macos-tahoe-26.5-xcode-26.6`으로 고정했다. 정식
Expo 지원 릴리스로 업그레이드할 때 SceneDelegate·manifest·앱 수명주기·딥링크·
알림 회귀를 다시 검증해야 한다. 이 산출물은 Simulator용 무서명 앱이므로
Distribution 서명·IPA·실제 iPhone·APNs·TestFlight 검증을 대체하지 않는다.

Expo에 등록된 iPhone 테스트 기기는 확인했지만, 실기기용 내부 빌드는 Apple 서명 자격 증명 입력 단계에서 중단했다. Apple 비밀번호·2단계 인증값은 저장소나 채팅에 남기지 않고 사용자가 로컬 터미널에 직접 입력한 뒤 재개한다.

## 5. 웹 화면·접근성·Production QA

2026-08-20 Vercel deployment `dpl_954nm6pMVRkGQP17kHyh1c3epB9R`를 Production으로 승격했다. 기본 운영 주소 `https://jubilee-worship.vercel.app`에서 `/`, `/support`, `/privacy`, `/sitemap.xml`이 모두 HTTP 200을 반환했다. `/support`의 문의 안내·만 14세 알림 절차·비밀정보 전송 금지 안내와 `/privacy`의 `noindex`·스토어 제출 금지 표시를 확인했다. 데스크톱 1240px와 모바일 390×844에서 수평 overflow와 사이트 console/page error는 0건이며, Production runtime error·warning도 0건이었다. 홈은 데스크톱과 모바일에 각각 승인된 새 hero 자산을 제공했다.

2026-08-23 Vercel deployment `dpl_4RxDM8gBpXnV4Mr72M9WyAnVn3sR`를
Production에 배포하고 기본 운영 주소에 alias했다. `/`, `/support`, `/privacy`와
두 well-known URL 및 루트 AASA URL은 모두 redirect 없이 HTTP 200을 반환했다.
association 3개 응답은 `application/json; charset=utf-8`이고 저장소 원본과
byte 단위로 일치했다. Google Digital Asset Links API는 운영 package와 EAS
keystore 지문을, Apple AASA CDN은 운영 appID와 `/worship` 경로를 각각 HTTP
200으로 반환했다. `/privacy`의 `noindex, follow`도 유지됐다.

같은 Production을 390×844 viewport에서 다시 열어 hero·예배 일정·미디어·갤러리까지
스크롤 검증했다. `scrollWidth=390`으로 수평 overflow가 없었고, 승인된 대체텍스트가
있는 이미지 9개가 모두 `complete=true`와 유효한 natural width를 반환했다.
page error와 console error는 각각 0건이었다. 초기 full-page 캡처에서 viewport 밖
lazy gallery가 skeleton으로 보였지만 해당 구역을 실제로 스크롤한 뒤 모두 로드되어
오류가 아님을 확인했다.

2026-08-19 v9 모바일 Web local export를 390×844 viewport에서 브라우저로 확인했다. 홈·예배·미디어·안내·송리스트, 검색, 주소 복사, 라이트·다크 저장·재로드를 확인했다. 빈 화면·오류 overlay·깨진 이미지·수평 overflow·page error는 없었고, WCAG 자동 접근성 위반과 보이는 44px 미만 터치 대상은 0건이었다. Web에서는 Expo push-token listener가 동작하지 않는다는 공식 모듈 경고 1건만 있었으며 listener는 no-op이다. 이 검증은 네이티브 실기기 검증을 대체하지 않는다.

다음은 2026-08-13 웹 개발본에서 확인한 기존 기준선이다. 최신 관리자·모바일 연동 변경을 반영한 운영 Preview 회귀 검증을 대체하지 않는다.

- 공개 6개 경로를 360, 390, 768, 1024, 1280, 1440px 총 36개 조합에서 확인했다.
- 수평 넘침·누락된 H1·콘솔 오류가 없었고 WCAG A·AA 자동 접근성 위반은 0건이었다.
- 모바일 메뉴 포커스·Tab·Escape, 주소 복사 `aria-live`, 사용자 선택 전 YouTube iframe 미로드를 확인했다.
- Lighthouse 13.4.1 로컬 측정은 모바일 95/100/100/100, 데스크톱 100/100/100/100이었다. 이 수치는 운영 호스팅·네트워크의 필드 지표가 아니다.

## 6. 외부 미완료 항목

다음은 로컬 코드 완료와 별개의 배포·운영 게이트다.

1. `TEST_PUSH_PAIRING_PEPPER` 서버 secret은 설정 완료. 최초 owner Auth 계정·SMTP를 설정한 뒤 development·preview 실기기 pairing을 검증
2. Supabase custom-header log canary는 완료했으나, 실제 owner·복구 흐름에서 raw 재설치 복구 코드가 Vercel runtime/error log에 남지 않는지 별도 canary 수행
3. 외부 요청자가 `cf-connecting-ip`·`x-forwarded-for`를 주입·변조해 출처 bucket을 선택하거나 우회할 수 없는지 원격 테스트. 이 가정이 확인되지 않으면 현재 DB 소스 제한을 운영 보안경계로 간주할 수 없음
4. DB RPC에 도달하지 않는 malformed URL·body와 분산 공격을 위한 gateway/WAF 제한, 사용량·차단량 alert, 등록 중단 스위치 운영 절차 설정
5. 비운영 환경 또는 승인된 점검 창에서 중단 스위치와 일일 출처 101번째·전체 501번째 차단, 25시간 만료 설정을 원격 검증
6. 기존 Development·Preview에 이어 Firebase Production Android 앱을 생성하고, `google-services.json` EAS Secret File 및 최소권한 FCM V1 자격 증명 연결. 현재 Production 앱은 미생성이며 등록 폼만 준비돼 외부 생성 확인 대기
7. Expo 실제 push 발송·receipt·`DeviceNotRegistered` 실기기 확인
8. 전날 19:30·당일 1시간 전 알림을 예약 시각부터 15분 안에 queue할 외부 scheduler 활성화
9. Vercel 기본 Production 연결·URL·`SUPABASE_SECRET_KEY`와 association 파일 배포·응답 검증은 완료. Preview 관리자 CRUD 회귀, 운영 서명 앱 링크 검증, 선두교회 하위 도메인 승인·DNS·TLS·canonical 검증
10. Firebase Production 앱·Google Play 앱 생성에 필요한 외부 확인, APNs·FCM, iOS·Android 운영 빌드·내부 테스트 트랙, Play 비공개 테스트 12명·14일과 Production access
11. 현재 연결된 Samsung 실기기의 운영 빌드 검증과 현재 미연결 iPhone의 실기기·Archive·TestFlight 검증
12. 개인정보처리방침·이용약관 최종 원문과 시행일 승인. 현재 개발본은 알림 기능에 만 14세 자기확인 gate를 두고 지원 이메일 후보를 표시하지만, 최종 이메일 공급자·확정 주소·도메인·계약/관리 설정·처리 국가·삭제 증빙, 법적 처리자·담당자·전화번호, 연령 확인의 법률적 충분성, 각 실제 공급자의 법적 역할·처리 국가, 국외 처리 근거와 법률 검토는 미확정이므로 정책 공개 gate를 유지한다. 최종 주소 확정 시 `SITE.contact_email`, 잠긴 `site_settings(id=1).contact_email` corrective migration, 웹·앱 연락처, 법적 문서·스토어 메타데이터를 한 번에 동일하게 변경한다.
13. 원격 cleanup cron이 실제 만료정보를 정책 기간에 맞춰 삭제하는지 최초 대상 발생 후 확인. 완료 전 store-ready 개인정보처리방침 공개·스토어 개인정보 URL 사용 금지
14. 실제 설교·송리스트를 관리자에서 검수·공개한 뒤 앱의 주제·말씀 구절·곡·아티스트·KEY·공식 YouTube 링크 표시를 검증
15. App Store·Google Play 정책 문서, 스크린샷, 메타데이터, 심사 제출

## 7. 최종 판정

- 로컬 DB reset·pgTAP 720/720·DB lint·workspace 자동 테스트: **통과**
- 커밋 `aaeed5e` 기준 GitHub PR #11 CI: **모두 통과**
- Supabase 기존 remote migration 15개·Edge Function 8개·legacy 410·direct v2 fail-closed canary: **이전 기준선 적용·검증 완료**
- 법적 문서 gate 신규 migration 3개: **로컬 통과·원격 미적용**
- Supabase 등록·정책 gate: **`registration_enabled=false`, `policy_ready=false` 유지**
- 원격 설치·endpoint·구독·동의·복구 행 및 실제 push: **모두 0건**
- Vercel 기본 Production 홈·지원·개인정보·sitemap: **배포·검증 완료**
- Vercel Production `SUPABASE_SECRET_KEY`·Supabase `TEST_PUSH_PAIRING_PEPPER`: **설정 완료**
- App Link·Universal Link association 파일: **Production 배포·HTTPS 응답 검증 완료, 운영 서명 실기기 검증 대기**
- Android Production EAS keystore: **생성 완료**, Production Android build: **0건**
- Firebase Production 앱·Google Play 앱: **미생성**, 등록 폼 준비 후 외부 확인 대기
- Android v9 Release APK·16KB Android 15 에뮬레이터·테마·뒤로가기·딥링크: **통과**
- Android API 36·16KB Tablet·Fold·분할화면·posture 조기 QA: **통과**, 최종 운영 APK 반복 대기
- iOS Production Simulator build·핵심 기능 회귀: **통과**, App Store 서명·실기기·TestFlight는 **미완료**
- Android EAS Preview build `f60bcbcc-de16-457b-99cd-d3a9460df37d`·Samsung SM-G991N: **replace install·핵심 화면·테마·Back·만 14세 gate·Fatal/ANR 0건 통과**
- iOS EAS Preview Simulator build `5756d596-dc2e-478f-aacc-e094b8f78bb7`: **clean install·핵심 화면·테마·만 14세 gate·fail-closed 통과**
- iOS Team·Bundle ID: **확인**, 배포 인증서·profile·APNs·ASC API key: **없음**
- iPhone: **현재 미연결**, iOS Production build: **0건**
- 실제 APNs·FCM·운영 서명·스토어 트랙·심사 제출: **미완료**
- 법적 개인정보처리방침·최종 지원 이메일 공급자·확정 주소·계약/관리 설정: **미확정**
- 정책 공개·최종 스토어 스크린샷·내부 테스트: **미완료**

따라서 현재 상태는 **기존 원격 fail-closed 배포와 iOS Preview Simulator 및 Android Preview 검증은 있지만, 최신 법적 문서 공개·알림 등록 gate는 로컬에만 있는 출시 후보 개발본**이며, **실제 알림 운영 또는 App Store·Google Play 제출 완료 상태는 아니다**.
