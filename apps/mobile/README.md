# 쥬빌리워십 모바일 앱

Expo SDK 57과 Expo Router로 구성한 iOS·Android 공용 앱입니다. 공개 사용자는 로그인하지 않으며, 앱은 Supabase 공개 전용 view만 읽습니다. 콘텐츠 작성과 공개 승인은 웹 관리자에서 수행합니다.

- 앱명: 쥬빌리워십
- 운영주체 표시: 쥬빌리 워십
- 문의·개인정보 연락처: sundoojubileeworship@gmail.com
- Expo 프로젝트: `@trust_me/jubilee-worship`

Expo 프로젝트 ID는 공개 연결 식별자이므로 `app.config.ts`에 고정합니다.
Expo access token과 Apple·Google 서명 자격증명은 로컬 인증 저장소 또는
EAS Credentials에만 보관하고 Git에는 기록하지 않습니다.

## 로컬 실행

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
pnpm --filter @jubilee/mobile start
```

캘린더와 원격 푸시는 Expo Go가 아니라 development build에서 검증합니다.

```bash
pnpm --filter @jubilee/mobile ios
pnpm --filter @jubilee/mobile android
```

스토어 앱 레코드를 만들기 전 EAS 테스트 빌드는 다음 프로필을 사용합니다.

```bash
# Android 실기기 설치용 development APK
pnpm dlx eas-cli build --platform android --profile development

# Apple 서명 없이 iOS Simulator에서 실행하는 development build
pnpm dlx eas-cli build --platform ios --profile development-simulator
```

iOS 실기기용 development build는 테스트 기기 UDID 등록과 Apple 개발자
프로비저닝을 별도로 완료한 뒤 생성합니다. 어느 빌드도 스토어에 자동 제출하지 않습니다.

## 보안 원칙

- `EXPO_PUBLIC_` 값은 최종 앱에서 누구나 읽을 수 있습니다.
- 모바일에는 Supabase URL과 publishable key만 허용합니다.
- Supabase secret/service-role key, Expo access token, APNs 키, Android keystore는 저장소와 앱에 넣지 않습니다.
- 운영 환경에서는 `EXPO_PUBLIC_CONTENT_SOURCE=supabase`를 사용합니다.

## 라이선스

이 공개 저장소는 별도 라이선스가 확정되기 전까지 열람용입니다. 코드·사진·브랜드 자산의 재사용 권한을 자동으로 부여하지 않습니다.
