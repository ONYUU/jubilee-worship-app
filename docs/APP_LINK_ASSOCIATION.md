# 운영 App Links·Universal Links 연결값

- 확인 기준일: 2026-08-23 KST
- 운영 웹 호스트: `jubilee-worship.vercel.app`
- 앱 연결 경로: `/worship`, `/worship/*`
- 상태: 웹 association 파일 Production 배포·HTTPS 응답 검증 완료,
  운영 서명 앱의 실기기 링크 검증 대기

`apps/mobile/app.config.ts`는 `EXPO_PUBLIC_WEB_ORIGIN`이 경로·쿼리 없는
HTTPS origin이면 다음을 선언한다.

- iOS: `applinks:jubilee-worship.vercel.app`
- Android: `https://jubilee-worship.vercel.app/worship...`,
  `android:autoVerify=true`

Preview와 Production EAS 프로필에는 위 웹 origin을 고정하지만, 검증 가능한
association 파일과 식별자가 준비된 **Production 변형만** Universal Link·App
Link를 선언한다. Preview는 커스텀 scheme
(`jubileeworship-preview://...`)만 사용한다.

## 1. Apple `apple-app-site-association`

| 구분 | 값 |
| --- | --- |
| Apple Team ID | `N84F73NX4K` |
| Production bundle ID | `org.sundoo.jubileeworship` |
| Production application identifier | `N84F73NX4K.org.sundoo.jubileeworship` |
| Preview bundle ID | `org.sundoo.jubileeworship.preview` |
| Preview application identifier | `N84F73NX4K.org.sundoo.jubileeworship.preview` |

스토어 운영 앱에 필요한 최소 파일은 다음과 같다.

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "N84F73NX4K.org.sundoo.jubileeworship",
        "paths": ["/worship", "/worship/*"]
      }
    ]
  }
}
```

현재 Preview 앱은 Universal Link를 선언하지 않는다. 향후 Preview까지 지원하려면
실제 Preview 서명값을 확인한 뒤 `details`에 다음 항목을 추가하고 앱 설정도 함께
변경한다. 스토어 운영에는 필수가 아니다.

```json
{
  "appID": "N84F73NX4K.org.sundoo.jubileeworship.preview",
  "paths": ["/worship", "/worship/*"]
}
```

배포 요건:

- URL: `https://jubilee-worship.vercel.app/.well-known/apple-app-site-association`
- 파일명에 `.json` 확장자를 붙이지 않음
- HTTPS 200, redirect 없음, `Content-Type: application/json`
- 서명된 운영 IPA의 `application-identifier`와 위 `appID`가 일치하는지
  최종 확인

## 2. Android `assetlinks.json`

| 구분 | 값 |
| --- | --- |
| Production package | `org.sundoo.jubileeworship` |
| EAS 운영 keystore SHA-256 | `24:DF:6F:0B:4D:89:23:5E:B9:37:D4:D2:A0:47:62:47:80:08:12:04:C4:5B:BF:0E:00:D7:5F:13:67:07:DE:E7` |

EAS가 직접 서명한 `production-device` APK를 검증하는 파일은 다음과
같다.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "org.sundoo.jubileeworship",
      "sha256_cert_fingerprints": [
        "24:DF:6F:0B:4D:89:23:5E:B9:37:D4:D2:A0:47:62:47:80:08:12:04:C4:5B:BF:0E:00:D7:5F:13:67:07:DE:E7"
      ]
    }
  }
]
```

배포 요건:

- URL: `https://jubilee-worship.vercel.app/.well-known/assetlinks.json`
- HTTPS 200, redirect 없음, `Content-Type: application/json`
- package와 SHA-256는 대·소문자를 포함해 정확히 일치

### Play App Signing 주의사항

위 SHA-256는 **현재 EAS 운영 keystore**의 지문이다. Google Play에서
Play App Signing을 활성화하면 사용자가 Play에서 받는 AAB/APK는 별도의
**앱 서명 키**로 서명될 수 있다. Play Console의 앱 서명 키 증명서
SHA-256가 위 값과 다르면 `sha256_cert_fingerprints`에 **Play 앱 서명
지문을 반드시 추가**한다. EAS 지문을 같이 유지하면 직접 배포한
`production-device` APK와 Play 설치본을 모두 검증할 수 있다.

Preview Android 패키지는 `org.sundoo.jubileeworship.preview`이지만, 현재
제공된 운영 keystore 지문을 Preview에 재사용한다고 간주하지 않는다.
Preview App Link가 필요하면 Preview APK의 실제 서명 지문을 따로
확인해 두 번째 statement로 추가한다.

## 3. 배포·실기기 검증

2026-08-23 23:20 KST Vercel Production deployment
`dpl_4RxDM8gBpXnV4Mr72M9WyAnVn3sR`를
`https://jubilee-worship.vercel.app`에 연결했다. 다음 세 URL은 모두 redirect
없이 HTTPS 200과 `application/json; charset=utf-8`을 반환했고, 응답 본문은
저장소 파일과 byte 단위로 일치했다.

- `/.well-known/assetlinks.json`
- `/.well-known/apple-app-site-association`
- `/apple-app-site-association`

남은 종단 간 검증은 다음과 같다.

1. 운영 서명 iOS 실기기에서 `https://jubilee-worship.vercel.app/worship`를
   눌러 운영 앱으로 연다.
2. EAS 직접 서명 Android `production-device` APK를 새로 설치한 뒤
   `adb shell pm get-app-links org.sundoo.jubileeworship`의 도메인 상태가
   `verified`인지 확인한다.
3. Play App Signing 활성화 후 Play 앱 서명 SHA-256를 파일에 추가하고,
   Play 트랙 설치본으로 Android 검증을 반복한다.

## 4. 근거

- [Apple Universal Links](https://developer.apple.com/library/archive/documentation/General/Conceptual/AppSearch/UniversalLinks.html)
- [Apple Associated Domains](https://developer.apple.com/documentation/Xcode/supporting-associated-domains)
- [Android `assetlinks.json` 구성](https://developer.android.com/training/app-links/configure-assetlinks)
- [Android App Links 문제 해결](https://developer.android.com/training/app-links/troubleshoot)
