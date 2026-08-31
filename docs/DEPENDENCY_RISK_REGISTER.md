# 의존성 보안 위험 기록

기준일: 2026-08-23 KST

## Expo SDK 57 빌드 도구의 `image-size`

- 경로: Expo SDK 57 → Metro 0.84.4 → `image-size@1.2.1`
- 경고: `GHSA-w3rx-r6r6-pgpr`, `GHSA-5p2g-fcmc-qvqq`
- 영향: 신뢰할 수 없는 ICNS·JXL·HEIF 버퍼를 Node.js에서 분석할 때 무한 루프로 빌드 프로세스의 가용성이 저하될 수 있음
- 현재 상태: 2026-08-23 재확인 기준 npm 최신 버전은 `2.0.2`이고 GitHub 공식 권고의 패치 버전은 `None`이다. `pnpm audit` JSON이 `>=2.0.3`을 패치 범위로 표시하지만 해당 버전은 npm에 존재하지 않으므로 적용 가능한 수정 버전은 아직 배포되지 않음
- 적용 완화:
  - 앱 런타임이나 서버 업로드 처리에 이 패키지를 직접 사용하지 않음
  - CI와 개발 빌드는 저장소에 포함된 검증 자산만 처리
  - 외부 사용자가 제출한 이미지를 Metro 입력으로 사용하지 않음
  - 저장소의 앱 빌드 자산에는 취약 경로인 ICNS·JXL·HEIF 파일이 없음
  - Expo/Metro 패치가 배포되는 즉시 lockfile 갱신 및 재감사

호환성이 검증되지 않은 `image-size` 주버전 강제 override는 Metro 빌드 손상 가능성이 있어 적용하지 않는다.
`pnpm audit:baseline`은 이 두 권고만 허용하며 신규 권고 또는 Critical 권고가 추가되면 CI를 실패시킨다. 2026-08-23 재실행 결과는 High 2건, Moderate·Critical 0건, 허용하지 않은 신규 권고 0건이다.

## Expo 설정 도구의 `uuid` 완화 완료

- 기존 경로: Expo config plugin → `xcode@3.0.1` → `uuid@7.0.3`
- 경고: `GHSA-w5hq-g745-h8pq`
- 영향 조건: UUID v3/v5/v6 API에 외부 버퍼와 잘못된 범위를 직접 전달할 때 발생
- 실제 사용: `xcode@3.0.1`은 CommonJS `require("uuid")`의 `v4()`만 인자 없이 호출하며, 애플리케이션 런타임에서는 이 패키지를 사용하지 않음
- 적용 완화: 루트 `pnpm-workspace.yaml`에서 `xcode@3.0.1>uuid`만 공식 수정 버전 `11.1.1`로 제한 override
- 검증 결과: `pnpm audit --prod`의 Moderate가 1건에서 0건으로 감소했고 `uuid@7.0.3`은 잠금파일에서 제거됨
- 유지 기준: Expo 또는 `xcode`가 공식 수정 버전을 직접 사용하게 되면 override를 제거하고 동일 검증을 반복함

## 해제 조건

1. Expo 호환 버전에서 `image-size` 취약 전이 의존성이 제거됨
2. `pnpm audit --prod` 재실행 결과 두 `image-size` 경고가 사라짐
3. `expo install --check`, `expo-doctor`, iOS·Android 빌드가 모두 통과함
