# 의존성 보안 위험 기록

기준일: 2026-08-16 KST

## Expo SDK 57 빌드 도구의 `image-size`

- 경로: Expo SDK 57 → Metro 0.84.4 → `image-size@1.2.1`
- 경고: `GHSA-w3rx-r6r6-pgpr`, `GHSA-5p2g-fcmc-qvqq`
- 영향: 신뢰할 수 없는 ICNS·JXL·HEIF 버퍼를 Node.js에서 분석할 때 무한 루프로 빌드 프로세스의 가용성이 저하될 수 있음
- 현재 상태: 2026-08-16 기준 공개된 최신 `2.0.2`까지 영향 범위에 포함되며, 적용 가능한 패치 버전은 아직 배포되지 않음
- 적용 완화:
  - 앱 런타임이나 서버 업로드 처리에 이 패키지를 직접 사용하지 않음
  - CI와 개발 빌드는 저장소에 포함된 검증 자산만 처리
  - 외부 사용자가 제출한 이미지를 Metro 입력으로 사용하지 않음
  - 저장소의 앱 빌드 자산에는 취약 경로인 ICNS·JXL·HEIF 파일이 없음
  - Expo/Metro 패치가 배포되는 즉시 lockfile 갱신 및 재감사

호환성이 검증되지 않은 `image-size` 주버전 강제 override는 Metro 빌드 손상 가능성이 있어 적용하지 않는다.

## Expo 설정 도구의 `uuid@7.0.3`

- 경로: Expo config plugin → `xcode@3.0.1` → `uuid@7.0.3`
- 경고: `GHSA-w5hq-g745-h8pq`
- 영향 조건: UUID v3/v5/v6 API에 외부 버퍼와 잘못된 범위를 직접 전달할 때 발생
- 적용 완화: 현재 전이 의존 경로인 `xcode@3.0.1`은 UUID v4만 인자 없이 사용하며, 애플리케이션 코드에서 취약 조건의 v3/v5/v6 API를 호출하지 않음. Expo 공식 호환 패치가 나오기 전 major override는 적용하지 않음

## 해제 조건

1. Expo 호환 버전에서 취약 전이 의존성이 제거됨
2. `pnpm audit --prod` 재실행 결과 해당 경고가 사라짐
3. `expo install --check`, `expo-doctor`, iOS·Android 빌드가 모두 통과함
