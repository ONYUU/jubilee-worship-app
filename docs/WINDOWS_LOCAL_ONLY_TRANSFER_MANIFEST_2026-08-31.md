# Windows 종합 비공개 자료 인계 명세

- 작성일: 2026-08-31 (Asia/Seoul)
- 목적: Git에 포함되지 않는 원본·참고·시연 자료를 Windows로 전달
- 취급 등급: 종합 ZIP과 원본은 비공개 작업 자료로 GitHub에 커밋하지 않음. 이 명세 문서는 비밀값이 없어 공개 저장소에 보존

## 1. 포함 항목

기존 123MB 인계 ZIP은 개인 화면 원본이 포함되어 사용하지 않는다. 이 명세는 Mac 반납을 위해 새로 만드는 `Jubilee_Mac_Retirement_Full_2026-08-31.zip` 기준이다. 최종 ZIP SHA-256은 ZIP 옆의 `.sha256` 파일에서 확인한다.

| ZIP 내 경로 | 용도 | 주의 |
|---|---|---|
| `00-start-here/` | Windows 메인 인계서·복구 순서·서비스 상태 | 첫 필독 |
| `01-git-source/` | 인터넷 없이 복원할 Git bundle | GitHub clone이 기본, bundle은 보조 수단 |
| `02-original-downloads/` | 홈 사진·BGM·과거 Jubilee ZIP 6개 | BGM은 권리 증빙 확인 전 내부 참고용 |
| `03-design-reference-font/` | 로고·디자인·초기 참고자료·NanumGothic Bold | Instagram 후보는 공개·배포 금지 |
| `04-sanitized-qa/` | 개인 화면과 전체 로그를 제거한 시연·QA 자료 | 최신 제출 완료 증거가 아님 |
| `05-supabase-backup/` | schema·roles·정제 데이터 SQL | 원격 복원은 별도 승인 전 실행 금지 |
| `06-remote-eas-builds/` | 만료 전 보존한 내부배포·Simulator 산출물 | Store Production 빌드가 아님 |
| `07-generated-native-reference/` | 캐시를 제거한 자동생성 네이티브 참고본 | 직접 빌드·덮어쓰기 금지 |
| `08-service-state/` | 비밀값 없는 원격 서비스 식별·확인 상태 | 로그인 토큰·환경변수 값 없음 |

## 2. 주요 원본 SHA-256

| 파일 | SHA-256 |
|---|---|
| `02-original-downloads/photo_2026-08-20 13.31.26.jpeg` | `5d6f0f1956122fcb6c9ddbaa279776284020c1494c51935ca759242009628fc4` |
| `03-design-reference-font/reference/jubilee-worship-handoff/assets/web-ready/brand/logo-official-master-4096-source-locked.png` | `0ed79e5139776b0b3ee35c6433bffd8abca8570d1d4e36d3276f86f242ae4fff` |
| `app-worship-balanced-v3.png` | `cf7dce93a7202e9d02cc74edefa7eb497447521a2308c6b0a07be00d3099e3ac` |
| `app-worship-light-v1.png` | `853c92fe955af71e10fdf38b09c0d7bb8b45bf9853858bb1e2d9b614d2705d8a` |
| `app-worship-light-v2.png` | `4769f25307d4253df39b9f6db928c330853ac2c3a4aad2020359cfc426c43bda` |
| `app-worship-rose-v4.png` | `faac3a6aa506c314fc71f1f3ef799a82e45b98376d43c166d7e4c11934d9ec23` |

Windows PowerShell에서 확인한다.

```powershell
Get-FileHash '.\02-original-downloads\photo_2026-08-20 13.31.26.jpeg' -Algorithm SHA256
Get-FileHash '.\03-design-reference-font\reference\jubilee-worship-handoff\assets\web-ready\brand\logo-official-master-4096-source-locked.png' -Algorithm SHA256
Get-ChildItem '.\03-design-reference-font\design-mobile\assets\*.png' | Get-FileHash -Algorithm SHA256
```

ZIP 전체 SHA-256은 전달 메시지에서 따로 제공한다.

## 3. 의도적 제외 항목

아래는 다시 생성할 수 있는 캐시·오래된 빌드 증거나 인증·비밀 자료이므로 제외했다.

- `node_modules`, `.next`, `dist`, `.expo`, `.eas`, `.vercel`
- Android·iOS의 Pods·Gradle·Xcode 빌드 캐시
- Supabase `.temp`, `.branches`
- Android `debug.keystore`
- 로컬 개발 APK와 debug keystore
- 개인 화면·실제 연락처·위치·전체 logcat
- GitHub·Expo·Supabase·Vercel·Firebase CLI 토큰과 상태 파일
- `.env`, Mac Keychain, Apple 서명키·인증서, 서비스 계정 JSON
- `google-services.json`, `GoogleService-Info.plist`, Firebase Admin 자격증명
- `reference/vinext-starter-backup`의 Mac ARM용 `node_modules`; 약 0.36MB source-only obsolete 참고본만 별도 포함

Windows에서 설치·인증·빌드를 새로 생성한다. Android Production JKS는 EAS 서버에 있으므로 이 ZIP에 없다. 일반 ZIP에는 활성 비밀값을 넣지 않는다.

## 4. Git bundle 복원법

GitHub에서 정상 clone할 수 있으면 bundle을 사용하지 않는다. 오프라인 복원이 필요할 때만 아래를 사용한다.

```powershell
git bundle verify .\01-git-source\jubilee-worship-full-handoff.bundle
git clone .\01-git-source\jubilee-worship-full-handoff.bundle .\jubilee-worship-app
Set-Location .\jubilee-worship-app
git switch codex/notification-schedule-and-metadata
git status --short
```

이후 GitHub 원격을 다시 연결하려면 기존 bundle 원격을 먼저 확인한 후 변경한다. 필요하면 Windows Codex에 이 작업을 요청한다.

## 5. Mac 초기화 금지 조건

ZIP이 Mac 바탕화면에 생성된 것만으로 전달이 끝난 것이 아니다. 외장 저장장치 또는 승인된 비공개 저장소에 복사하고, Windows에서 ZIP·Git bundle·SQL·원격 계정 접근을 실제 확인하기 전에는 Mac을 초기화하지 않는다. 세부 기준은 [Mac 반납·Windows 이전 인계 기준](MAC_RETIREMENT_HANDOFF_2026-08-31.md)을 따른다.
