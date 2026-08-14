# 쥬빌리워십 모바일 앱

Expo SDK 57과 Expo Router로 구성한 iOS·Android 공용 앱입니다. 공개 사용자는 로그인하지 않으며, 앱은 Supabase 공개 전용 view만 읽습니다. 콘텐츠 작성과 공개 승인은 웹 관리자에서 수행합니다.

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

## 보안 원칙

- `EXPO_PUBLIC_` 값은 최종 앱에서 누구나 읽을 수 있습니다.
- 모바일에는 Supabase URL과 publishable key만 허용합니다.
- Supabase secret/service-role key, Expo access token, APNs 키, Android keystore는 저장소와 앱에 넣지 않습니다.
- 운영 환경에서는 `EXPO_PUBLIC_CONTENT_SOURCE=supabase`를 사용합니다.

## 라이선스

이 공개 저장소는 별도 라이선스가 확정되기 전까지 열람용입니다. 코드·사진·브랜드 자산의 재사용 권한을 자동으로 부여하지 않습니다.
