# Windows 별도 자료 인계 명세

- 작성일: 2026-08-31 (Asia/Seoul)
- 목적: Git에 포함되지 않는 원본·참고·시연 자료를 Windows로 전달
- 취급 등급: 비공개 작업 자료. GitHub에 커밋하지 않음

## 1. 포함 항목

| ZIP 내 경로 | 용도 | 주의 |
|---|---|---|
| `handoff/WINDOWS_CODEX_START_HERE.md` | Windows 메인 인계서 | 첫 필독 |
| `handoff/WINDOWS_CODEX_START_PROMPT.txt` | Windows Codex 첫 메시지 | 읽기 전용 점검부터 시작 |
| `handoff/PAUSED_HANDOFF_2026-08-24.md` | 개발 일시중지 체크포인트 | 재개 조건·금지사항 필독 |
| `handoff/WINDOWS_LOCAL_ONLY_TRANSFER_MANIFEST_2026-08-31.md` | 이 명세서 | ZIP 해제 후 확인 |
| `source-assets/home/home-stage-original.jpeg` | 홈 예배 사진 원본 | 게시 동의 확정됨. 원본 유지 |
| `source-assets/brand/logo-official-master-4096.png` | 공식 로고 4096px 원본 | 앱 실행 아이콘은 Git의 최적화 파생본 사용 |
| `source-assets/design-mobile/` | 모바일 디자인 시안 4종 | 참고용 렌더링 자산 |
| `source-assets/design-mobile-output/` | 모바일 디자인 과정 렌더링 | 현재 런타임 자산이 아닌 과정 참고용 |
| `legacy-reference/jubilee-worship-handoff/` | 초기 제품·디자인 인계 참고 | **현재 코드 기준이 아님** |
| `legacy-reference/instagram-candidates/` | 과거 이미지 후보 | 이용권·게시 동의 미확정. 공개·배포 금지 |
| `demo-history/app-demo/` | 시연 영상·포스터·프레임 | **현재 체크포인트 QA 증거가 아님** |
| `git/jubilee-worship-handoff.bundle` | 인터넷 없이 복원할 Git 스냅샷 | GitHub clone이 기본, bundle은 보조 수단 |

## 2. 주요 원본 SHA-256

| 파일 | SHA-256 |
|---|---|
| `home-stage-original.jpeg` | `5d6f0f1956122fcb6c9ddbaa279776284020c1494c51935ca759242009628fc4` |
| `logo-official-master-4096.png` | `0ed79e5139776b0b3ee35c6433bffd8abca8570d1d4e36d3276f86f242ae4fff` |
| `app-worship-balanced-v3.png` | `cf7dce93a7202e9d02cc74edefa7eb497447521a2308c6b0a07be00d3099e3ac` |
| `app-worship-light-v1.png` | `853c92fe955af71e10fdf38b09c0d7bb8b45bf9853858bb1e2d9b614d2705d8a` |
| `app-worship-light-v2.png` | `4769f25307d4253df39b9f6db928c330853ac2c3a4aad2020359cfc426c43bda` |
| `app-worship-rose-v4.png` | `faac3a6aa506c314fc71f1f3ef799a82e45b98376d43c166d7e4c11934d9ec23` |

Windows PowerShell에서 확인한다.

```powershell
Get-FileHash .\source-assets\home\home-stage-original.jpeg -Algorithm SHA256
Get-FileHash .\source-assets\brand\logo-official-master-4096.png -Algorithm SHA256
Get-ChildItem .\source-assets\design-mobile\* | Get-FileHash -Algorithm SHA256
```

ZIP 전체 SHA-256은 전달 메시지에서 따로 제공한다.

## 3. 의도적 제외 항목

아래는 다시 생성할 수 있는 캐시·오래된 빌드 증거나 인증·비밀 자료이므로 제외했다.

- `node_modules`, `.next`, `dist`, `.expo`, `.eas`, `.vercel`
- `apps/mobile/android`, `apps/mobile/ios`
- Supabase `.temp`, `.branches`
- Android `debug.keystore`
- APK, AAB, IPA, xcarchive
- `outputs/mobile-qa-api36`, `outputs/browser`, Lighthouse·로컬 QA 로그
- GitHub·Expo·Supabase·Vercel·Firebase CLI 토큰과 상태 파일
- `.env`, Mac Keychain, Apple 서명키·인증서, 서비스 계정 JSON
- `google-services.json`, `GoogleService-Info.plist`, Firebase Admin 자격증명
- `reference/vinext-starter-backup` (폐기된 초기 starter와 `node_modules` 포함)

Windows에서 설치·인증·빌드를 새로 생성한다. Android Production JKS는 EAS 서버에 있으므로 이 ZIP에 없다.

## 4. Git bundle 복원법

GitHub에서 정상 clone할 수 있으면 bundle을 사용하지 않는다. 오프라인 복원이 필요할 때만 아래를 사용한다.

```powershell
git bundle verify .\git\jubilee-worship-handoff.bundle
git clone .\git\jubilee-worship-handoff.bundle .\jubilee-worship-app
Set-Location .\jubilee-worship-app
git switch codex/notification-schedule-and-metadata
git status --short
```

이후 GitHub 원격을 다시 연결하려면 기존 bundle 원격을 먼저 확인한 후 변경한다. 필요하면 Windows Codex에 이 작업을 요청한다.
