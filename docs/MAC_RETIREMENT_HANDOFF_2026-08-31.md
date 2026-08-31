# Mac 반납·Windows 이전 인계 기준

- 작성일: 2026-08-31 (Asia/Seoul)
- 목적: Mac 초기화 전에 쥬빌리워십 프로젝트를 Windows에서 복원할 수 있도록 보존
- 앱 개발 상태: **일시중지 유지**
- 재개 조건: 제품 오너가 “쥬빌리워십 개발 재개”를 명시적으로 지시할 때

이 문서는 앱 기능을 변경하거나 배포를 재개하는 문서가 아니다. 소스·원본·검증자료·원격 서비스 식별정보를 보존하고, Windows에서 읽기 전용으로 복원 확인하는 기준이다.

## 1. 초기화 가능 여부

2026-08-31 기준으로 Mac 초기화 조건은 아직 충족되지 않았다. 새 종합 인계본은 Mac 로컬에만 준비하며, 다음 절차가 모두 끝난 뒤에만 초기화할 수 있다.

1. 개인정보와 활성 인증정보를 제외한 새 종합 ZIP 생성
2. ZIP 무결성 검사와 SHA-256 생성
3. 별도 외장 저장장치 또는 승인된 비공개 저장소로 복사
4. Windows에서 ZIP 해제·Git bundle 복원·SHA-256 일치 확인
5. Windows에서 GitHub, Expo/EAS, Supabase, Vercel, Firebase, Google Play, Apple 계정 접근 확인

기존 `Jubilee_Windows_Private_Transfer_2026-08-31.zip`은 사용하지 않는다. iOS 원본 녹화와 연락처 원본 화면이 포함된 것으로 확인되어 새 정제본으로 교체한다.

## 2. 보존 대상

새 비공개 종합 인계본에는 다음을 포함한다.

- 현재 브랜치와 전체 도달 가능 Git 이력을 담은 검증된 Git bundle
- Windows 시작 문서와 개발 일시중지 체크포인트
- 홈 예배 사진, 공식 로고, 모바일 디자인 원본·과정 렌더링
- 과거 Jubilee 인계 ZIP 6개와 초기 참고자료
- 스토어 자산 재현에 사용한 `NanumGothic-Bold.ttf`와 OFL 문서
- 개인정보를 제거한 앱 시연 영상·브라우저·모바일 QA 자료
- 캐시를 제거한 Android·iOS 자동생성 소스 참고 스냅샷
- Supabase schema, roles, 공개·비공개 데이터 백업(무작위 rate-limit secret 값 제외)
- 만료되지 않은 EAS 내부배포·iOS Simulator 빌드 산출물과 해시
- 원격 서비스 식별정보, 복구 순서, 미설정 자격증명 목록

자동생성 Android·iOS 스냅샷은 마지막 앱 소스보다 오래될 수 있다. Windows 작업본 위에 덮어쓰거나 직접 빌드하지 않고, Expo 설정으로 새 prebuild를 만든 뒤 비교하는 참고자료로만 사용한다.

## 3. 의도적 제외 대상

“전부 전달”은 Mac의 모든 캐시·로그·로그인 세션을 복사한다는 뜻이 아니다. 아래 자료는 보안·개인정보·재현성 문제 때문에 제외한다.

- Mac Keychain, 브라우저 세션, CLI 로그인 토큰, ADB 개인키
- `.env`, `.vercel`, Supabase `.temp`, Expo `devices.json`
- 서비스 계정 JSON, Firebase 설정 파일, Apple 개인키·인증서, Android keystore
- `node_modules`, `.next`, Pods, Gradle·Xcode 빌드 캐시
- 실제 연락처·개인 홈 화면·개인 위치가 보이는 캡처
- iOS 원본 녹화, `contact-raw.jpg`, 전체 logcat
- 재생성 가능한 로컬 개발 APK와 debug keystore

활성 비밀값은 일반 ZIP, Git, 채팅, 메신저에 넣지 않는다. Windows에서 기존 소유 계정으로 다시 로그인하고 원격 자격증명을 확인한다.

## 4. 원격 서비스 복원 기준

| 서비스 | 확인된 상태 | Windows에서 확인할 사항 |
|---|---|---|
| GitHub | 공개 저장소와 Draft PR #11이 인계 문서 커밋 기준으로 동기화됨 | 저장소·브랜치·PR 접근, 최신 커밋 확인 |
| Expo/EAS | `@trust_me/jubilee-worship`, 프로젝트 ID `b003dbe7-c515-43c6-b1eb-e025c03f25bd`; Android Production JKS는 EAS 원격에 있음 | 같은 계정 로그인, 프로젝트·원격 JKS 접근 확인 |
| Supabase | 프로젝트 ref `xyuehkayxnbfgqmnppzx`; 마이그레이션 21/21, Edge Function 8개 | 기존 프로젝트 연결과 migration/function 목록 확인 |
| Vercel | `jubilee-worship`, Root Directory `apps/web`; Production 환경변수는 원격 유지 | 기존 프로젝트와 환경변수 이름 확인, 재개 전 배포 금지 |
| Firebase | `jubilee-worship-push`; dev·preview Android 앱만 존재하고 production 앱·SHA 지문은 없음 | 동일 소유자 계정에서 기존 프로젝트가 열리는지 재확인 |
| Google Play | 개발자 계정은 있으나 앱 레코드·Play App Signing·제출 계정 없음 | 개발자 계정 접근 확인 |
| Apple | Mac·EAS에 Jubilee 서명 인증서·프로파일·APNs·ASC 키가 없음 | Apple Developer·App Store Connect 계정 접근과 앱 레코드 여부 확인 |

Firebase는 한 세션에서 기존 프로젝트와 앱이 확인됐지만, 다른 세션에서는 Firebase 추가 화면이 표시됐다. 계정 또는 세션 차이일 수 있어 현재 원인을 단정하지 않으며, Windows에서 동일 소유자 계정으로 재확인하기 전에는 이전 완료로 보지 않는다.

## 5. 권리·공개 주의사항

- 홈 예배 사진은 제품 오너가 게시 동의를 확정한 원본으로 보존한다.
- Instagram 후보 이미지는 이용권·게시 동의가 확정되지 않은 참고자료이므로 공개·배포하지 않는다.
- BGM MP3는 별도 라이선스 증빙이 발견되지 않았다. 팀 내부 참고용으로만 보존하고, 향후 영상 사용 전 출처와 허용범위를 다시 확인한다.
- `NanumGothic-Bold.ttf`는 스토어 자산 재현용 내부 인계본에 OFL 문서와 함께 보존한다.

## 6. Windows 복원 완료 판정

다음 증거를 남겼을 때만 이전을 완료로 판정한다.

- Windows `Get-FileHash` 결과가 전달된 SHA-256과 일치
- `git bundle verify` 성공
- bundle 복제 후 `codex/notification-schedule-and-metadata` 브랜치와 인계 커밋 확인
- Supabase SQL 백업 3개의 해시 일치
- 보존된 EAS 산출물의 해시·파일 형식 확인
- 원격 서비스 7종의 소유 계정 접근 확인

Windows 복원 점검은 읽기 전용으로 수행한다. 앱 코드 수정, 빌드, 배포, DB 변경, 푸시 활성화, 스토어 앱 생성·제출은 별도의 개발 재개 지시 전에는 실행하지 않는다.
