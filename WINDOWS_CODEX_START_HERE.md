# 쥬빌리워십 Windows Codex 인계서

- 작성일: 2026-08-31 (Asia/Seoul)
- 목적: Mac에서 일시중지한 쥬빌리워십 앱을 Windows 데스크톱의 Codex에서 안전하게 인계
- 현재 상태: **개발 일시중지**
- 재개 조건: 제품 오너가 “쥬빌리워십 개발 재개”를 명시적으로 지시할 때
- 제출 경계: iOS App Store와 Google Play의 **실제 심사 제출 직전에서 멈춤**

Windows에서 첫 Codex 작업은 읽기 전용 점검이다. 코드 수정, 빌드, 배포, DB 마이그레이션, 푸시 활성화, 스토어 생성·선언·제출은 재개 지시 전에 실행하지 않는다.

## 1. 기준 스냅샷

2026-08-31에 읽기 전용으로 재확인한 결과다.

| 구분 | 현재 상태 |
|---|---|
| GitHub | 공개 저장소 `ONYUU/jubilee-worship-app` |
| 작업 브랜치 | `codex/notification-schedule-and-metadata` |
| 앱 코드 중지 체크포인트 | `014859ebb191a7ba5d4ac1ff7fa284b9407b6d90` |
| GitHub 상태 | 로컬·원격 일치, Draft PR #11 `OPEN / MERGEABLE`, 해당 체크포인트의 CI·CodeQL 6건 모두 성공 |
| 중지 시점 자동 검증 기록 | 앱·웹 267 + Edge Function 30 + pgTAP 723 = 총 1,020건 통과 |
| 남은 자산 게이트 | iOS 6.9인치 최종 스크린샷 0/6으로 의도된 차단 |

이 인계 문서를 추가하는 Git 커밋은 문서만 변경한다. 앱 코드의 중지 기준은 위 `014859e` 커밋이다.
1,020건은 중지 시점의 검증 기록이며, 이 인계 작업에서 전체 로컬 테스트를 다시 실행한 것은 아니다.

## 2. Windows로 가져갈 내용

### GitHub에서 받는 항목

소스, 문서, 테스트, Supabase 마이그레이션·Edge Functions, 실행용 최적화 이미지, 스토어 기본 자산은 Git에 있다. Git LFS와 심볼릭 링크 의존성은 없다.

```powershell
New-Item -ItemType Directory -Force C:\src | Out-Null
Set-Location C:\src
git -c core.autocrlf=false clone --branch codex/notification-schedule-and-metadata --single-branch https://github.com/ONYUU/jubilee-worship-app.git
Set-Location .\jubilee-worship-app
git config core.autocrlf false
git config core.safecrlf true
git fetch --prune origin
git status --short
git log --oneline -5
git merge-base --is-ancestor 014859ebb191a7ba5d4ac1ff7fa284b9407b6d90 HEAD
```

- `git status --short`는 출력이 없어야 한다.
- 마지막 명령의 종료 코드가 `0`이면 앱 중지 체크포인트가 현재 HEAD에 포함된 것이다.

### 별도 전달 ZIP에서 받는 항목

- 홈 예배 사진 JPEG 원본
- 공식 로고 4096px 원본
- 모바일 디자인 시안 4종
- 모바일 디자인 과정 렌더링
- 초기 제품·디자인 인계 참고자료
- Instagram 이미지 후보 참고자료
- 기존 시연 영상·포스터·프레임
- 인터넷 없이도 복원할 수 있는 Git bundle

상세 파일명과 해시는 [별도 자료 인계 명세](docs/WINDOWS_LOCAL_ONLY_TRANSFER_MANIFEST_2026-08-31.md)를 따른다. 시연 영상과 후보 이미지는 최신 앱 QA 증거나 공개 게시 자산으로 간주하지 않는다.

## 3. Windows 첫 설정

### Codex

Windows 11의 네이티브 PowerShell 환경을 우선 사용한다. Android Studio·USB ADB와 같은 Windows 네이티브 도구와 연결하기 쉽기 때문이다.

```powershell
winget install --id 9PLM9XGG6VKS -s msstore
```

Codex에 기존 계정으로 로그인하고, 클론한 `jubilee-worship-app` 폴더를 프로젝트로 추가한다. 가능하면 Windows 샌드박스의 elevated 모드를 활성화한다.

- Codex Windows: https://developers.openai.com/codex/app/windows
- Windows 샌드박스: https://developers.openai.com/codex/windows
- WSL2는 선택사항이다. 사용할 경우 저장소를 `/mnt/c` 대신 `~/code`에 둔다: https://learn.chatgpt.com/docs/windows/wsl

### 기준 도구 버전

Windows 설치 후 아래 결과와 일치하는지 확인한다. 재개 전에는 버전 일치와 로그인만 확인하고 업그레이드하지 않는다.

| 도구 | 기준 |
|---|---|
| Node.js | `22.13.1` (`.node-version`) |
| pnpm | `11.10.0` (`packageManager`) |
| Java | `17` (Windows React Native Android 권장, Mac 인계 스냅샷은 `21.0.11`) |
| Expo EAS CLI | `20.5.1` 인계 기준, 프로젝트 최소 `>=19.1.0` |
| Supabase CLI | `2.109.0` 인계 기준 |
| Vercel CLI | `54.20.1` 인계 기준 |
| Deno | `2.9.1` 인계 기준 |
| Android | Android Studio, SDK Platform 36, Build Tools 36.0.0, Platform Tools/ADB |
| DB 통합 검증 | Docker Desktop 필요 |

React Native Windows Android 환경은 JDK 17을 권장한다: https://reactnative.dev/docs/set-up-your-environment

```powershell
node --version
corepack enable
corepack prepare pnpm@11.10.0 --activate
pnpm --version
java -version
adb version
git --version
gh --version
```

### 의존성과 로컬 예시 환경

```powershell
pnpm install --frozen-lockfile
Copy-Item apps\web\.env.example apps\web\.env.local
Copy-Item apps\mobile\.env.example apps\mobile\.env.local
```

`.env.local`의 빈 값은 로컬 모드 실행용이다. 실제 키를 채팅, Git, 인계 문서 또는 ZIP에 넣지 않는다. 특히 `SUPABASE_SECRET_KEY`를 `EXPO_PUBLIC_*`에 넣지 않는다.

## 4. Windows에서 재로그인·재연결

Mac의 인증 파일, Keychain, CLI 토큰, 서명 자격증명을 복사하지 않는다. 소유자가 Windows에서 각 서비스에 다시 로그인한다.

### GitHub

```powershell
gh auth login
gh auth status
gh pr view 11 --repo ONYUU/jubilee-worship-app
```

### Expo/EAS

```powershell
Set-Location apps\mobile
npx eas-cli@20.5.1 login
npx eas-cli@20.5.1 whoami
npx eas-cli@20.5.1 build:list --limit 5
Set-Location ..\..
```

프로젝트는 `@trust_me/jubilee-worship`, EAS project ID는 `b003dbe7-c515-43c6-b1eb-e025c03f25bd`다. Android Production JKS는 EAS 서버에 있으므로 Mac에서 복사하지 않는다.

### Supabase

```powershell
npx supabase@2.109.0 login
npx supabase@2.109.0 link --project-ref xyuehkayxnbfgqmnppzx
npx supabase@2.109.0 migration list --linked
npx supabase@2.109.0 functions list --project-ref xyuehkayxnbfgqmnppzx
```

Windows에서도 로컬·원격 마이그레이션이 21/21 일치해야 한다. 이미 적용된 v3~v5 마이그레이션은 수정하지 않는다.

### Vercel

```powershell
npx vercel@54.20.1 login
npx vercel@54.20.1 link
npx vercel@54.20.1 project inspect jubilee-worship
```

소유 계정·팀과 `jubilee-worship` 프로젝트를 확인한 후에만 링크한다. 원격 Root Directory는 `apps/web`이다. 재개 전에 `vercel deploy --prod`를 실행하지 않는다.

### Firebase·Apple·Google

- Firebase CLI는 재개 시 소유자가 재로그인하고 실제 프로젝트·앱 ID를 다시 확인한다.
- Apple 인증서를 Mac Keychain에서 복사하지 않는다. 재개 시 EAS·Apple에서 새로 인증한다.
- Google Play 서비스 계정과 Android FCM V1 자격증명은 현재 미설정 상태다.

## 5. 원격 서비스 현재 상태

| 서비스 | 2026-08-31 확인 결과 | 재개 후 할 일 |
|---|---|---|
| Supabase | 서울 프로젝트 `ACTIVE_HEALTHY`, 마이그레이션 21/21 일치, Edge Function 8개 `ACTIVE`, 새 푸시 등록 게이트는 닫힘 | FCM/FID 계약 결정 후 필요하면 v6 순방향 마이그레이션 |
| Vercel | `https://jubilee-worship.vercel.app` `READY`, 홈·개인정보·지원·앱링크 파일 HTTP 200 | 운영 배포는 `3be9fe1`로 중지 체크포인트보다 4커밋 이전. 갱신된 서버 키는 기존 배포에 소급 적용되지 않으므로 최신 코드 재배포 후 검증 |
| EAS iOS | 최신 빌드는 내부용 시뮬레이터 빌드이며 중지 체크포인트보다 3커밋 이전 | Distribution, Provisioning, APNs, App Store Connect 자격증명 모두 미설정 |
| EAS Android | 최신 빌드는 내부용 Preview APK며 중지 체크포인트보다 7커밋 이전 | Production JKS는 EAS에 존재. 최신 AAB, FCM V1, Play 제출용 서비스 계정은 없음 |
| 스토어 | 제출용 서명 IPA/AAB·최종 스크린샷·법적 선언 미완료 | 오너 선택과 검증 후 실제 제출 직전에서 멈춤 |

## 6. Windows 호환성 주의사항

아래는 현재 코드의 확인된 이식 주의사항이다. 앱 기능 회귀로 판정하지 말고, 재개 후 첫 코드 작업으로 교차 플랫폼화한다.

| 위치 | Windows 이슈 | 임시 처리 |
|---|---|---|
| `apps/mobile/package.json` | `release:check-config*` 3개가 POSIX `VAR=value`와 단일 인용부호를 사용 | 재개 전에 실행 금지. 재개 후 `cross-env` 또는 Node 러너로 교체 |
| `scripts/check-audit-baseline.mjs` | `spawnSync("pnpm", ...)`은 Windows에서 `pnpm.cmd`를 찾지 못할 수 있음 | `pnpm audit:baseline`은 CI/Linux 결과를 사용하거나 재개 후 교차 플랫폼으로 수정 |
| `store-assets/build-store-assets.sh` | Bash 및 `/Library/Fonts/NanumGothic-Bold.ttf`, `shasum` 의존 | Windows에서 바로 실행하지 않음 |
| `store-assets/validate-store-assets.sh` | Bash, BSD `stat -f` 의존 | CI/macOS 결과를 사용하거나 재개 후 Node 기반으로 교체 |
| `README.md` | 일부 예시가 `cp` 사용 | PowerShell에서 `Copy-Item` 사용 |
| iOS | Xcode와 iOS Simulator는 Windows에 없음 | EAS 클라우드 빌드·제출과 실기기/TestFlight 검증. 최종 Xcode·Simulator QA는 Mac 필요 |

WSL2는 POSIX 스크립트 일부를 보완하지만, Mac 폰트 경로와 BSD `stat`을 해결하지 못한다. Android USB·에뮬레이터와의 연결도 추가 구성이 필요하므로 기본 환경으로 사용하지 않는다.

Windows에서 재개 지시 후 먼저 실행할 수 있는 기본 검증은 아래와 같다.

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

`pnpm audit:baseline`, release config 스크립트, 스토어 자산 스크립트는 위 Windows 호환성 문제를 먼저 해결한 뒤 실행한다. Docker Desktop이 없으면 DB reset·pgTAP은 미실행으로 보고하고 lint·typecheck으로 대체 통과 처리하지 않는다.

## 7. iOS를 Windows에서 다루는 범위

- Expo EAS는 Windows에서도 원격 macOS 빌드 환경으로 iOS 빌드를 생성할 수 있다: https://docs.expo.dev/build-reference/ios-builds/
- EAS Submit은 Windows에서도 iOS 빌드를 App Store Connect로 전송할 수 있다: https://docs.expo.dev/submit/ios/
- iOS Simulator는 macOS에서만 사용할 수 있다: https://docs.expo.dev/tutorial/eas/introduction/
- 따라서 Windows는 EAS 빌드·TestFlight·실물 iPhone 검증까지 담당하고, 최종 iOS Simulator·Xcode 검증은 Mac을 유지하거나 별도 Mac 환경을 사용한다.

## 8. 재개 후 안전한 순서

1. Windows 도구·계정·프로젝트 연결을 읽기 전용으로 확인한다.
2. Windows 비호환 스크립트를 교차 플랫폼으로 수정한다.
3. Android FCM 자동 초기화를 끄고 Firebase Installation ID 생성·보유·삭제 계약을 결정한다.
4. 동의문이 바뀐면 기존 v3~v5를 고치지 말고 v6 순방향 DB 마이그레이션과 Edge Function 계약을 만든다.
5. Windows 기본 검증, Docker DB reset·pgTAP, CI·CodeQL을 모두 통과시킨다.
6. 최신 커밋으로 Vercel Production을 재배포하고 갱신된 서버 키 적용을 검증한다.
7. Android Preview·실기기와 iOS EAS·TestFlight·Mac QA를 다시 실행한다.
8. Firebase·Apple·Google 자격증명, 스토어 스크린샷·메타데이터·법적 선언을 오너 확인 아래 완료한다.
9. 서명 IPA/AAB와 내부 테스트를 통과한 뒤 실제 스토어 심사 제출 직전에서 멈춘다.

## 9. 금지 사항

- 제품 오너의 재개 지시 전에 앱 코드를 수정하거나 실행·빌드·배포하지 않는다.
- v3~v5 원격 적용 마이그레이션을 수정·삭제하지 않는다.
- 실제 비밀키, `.env`, 서비스 계정 JSON, Firebase 설정 파일, 서명키·인증서를 Git·채팅·인계 ZIP에 저장하지 않는다.
- Mac의 `.vercel`, Supabase `.temp`, Expo 인증 파일, GitHub CLI 토큰, Keychain을 Windows로 복사하지 않는다.
- FCM 자동 초기화·FID 계약을 해결하기 전에 Android Production 빌드를 배포 후보로 확정하지 않는다.
- Apple·Google의 법적 선언이나 스토어 심사 제출 버튼을 임의로 확정·실행하지 않는다.

## 10. Windows Codex에 첫으로 전달할 프롬프트

[붙여넣기용 프롬프트](WINDOWS_CODEX_START_PROMPT.txt)를 Windows Codex의 첫 메시지로 사용한다.
