# 쥬빌리워십 스토어 등록문구·시각자료 초안

- 확인 기준일: 2026-08-23 KST
- 대상 버전: iOS·Android 첫 공개 버전 `1.0.0`
- 기본 언어: 한국어
- 상태: 문구 초안과 Play 아이콘·Feature Graphic 제작 완료, 최종 운영 빌드 캡처 전

이 문서는 현재 앱 코드에서 직접 확인되는 기능만 스토어 문구에 반영한다.
스토어 콘솔에 입력하거나 외부에 업로드한 결과를 뜻하지 않는다. 개인정보처리방침,
운영 서명 빌드, 실제 공개 콘텐츠와 푸시 알림 검증이 끝나기 전에는 제출용으로
확정하지 않는다.

## 1. 공통 등록 기준

| 항목 | 초안 |
| --- | --- |
| 앱 이름 | 쥬빌리워십 |
| 운영주체 표시 | 쥬빌리 워십 |
| 앱 유형 | 무료 앱, 인앱결제·광고 없음 |
| 기본 언어 | 한국어 |
| 로그인 | 일반 이용자 로그인 없음 |
| iOS Bundle ID | `org.sundoo.jubileeworship` |
| Android package | `org.sundoo.jubileeworship` |
| 지원 URL | `https://jubilee-worship.vercel.app/support` |
| 개인정보처리방침 URL | `https://jubilee-worship.vercel.app/privacy` — 최종 정책 공개 전 사용 금지 |
| 문의 이메일 | `sundoojubileeworship@gmail.com` — 후보로만 표시, 최종 공급자·주소 확정 필요 |

지원 페이지는 현재 이메일과 사이트 공통 footer의 주소·전화번호를 표시한다. 최종
제출 전 실제 운영 연락처인지 다시 확인한다. 개인정보 URL은 현재 앱 정책 미공개
상태를 명시하므로 스토어에 입력하면 안 된다.

권장 분류는 Apple 기본 `Lifestyle`, 보조 `Music`, Google Play `Lifestyle`이다.
앱은 음악 재생 서비스가 아니라 예배 일정·송리스트·공식 외부 미디어 안내가
중심이므로, Google Play의 `Music & Audio`보다 `Lifestyle`이 실제 기능에 가깝다.
최종 분류와 Google 태그는 콘솔에 제시되는 현행 선택지와 실제 공개 화면을 보고
확정한다.

## 2. Apple App Store 한국어 문구

### 앱 정보

| 필드 | 초안 | 제한 확인 |
| --- | --- | ---: |
| 이름 | 쥬빌리워십 | 5자 / 최대 30자 |
| 부제 | 예배 일정과 찬양을 한곳에서 | 15자 / 최대 30자 |
| 프로모션 문구 | 다가오는 예배 일정과 말씀, 송리스트를 확인하고 알림·캘린더·길찾기로 예배를 준비하세요. | 49자 / 최대 170자 |
| 키워드 | `예배일정,찬양집회,송리스트,성경말씀,기독교,인천예배,예배알림` | UTF-8 87바이트 / 최대 100바이트 |
| 지원 URL | `https://jubilee-worship.vercel.app/support` | 공개 페이지 최종 확인 필요 |
| 마케팅 URL | `https://jubilee-worship.vercel.app` | 선택 항목 |
| 개인정보 URL | `https://jubilee-worship.vercel.app/privacy` | 최종 정책 공개 후에만 사용 |
| 저작권 | `2026 쥬빌리 워십` | 실제 권리주체 최종 확인 필요 |

키워드는 Apple이 이미 앱 이름과 개발자명을 검색에 사용하므로 `쥬빌리워십`을
반복하지 않았다. 다른 앱·회사 이름, 순위, 가격, 과장 표현도 넣지 않았다.

### 설명

```text
쥬빌리워십은 인천 선두교회 예배사역팀 쥬빌리 워십의 공식 예배 안내 앱입니다.

다가오는 예배를 준비하고 지난 예배를 돌아볼 수 있습니다.

주요 기능
- 다가오는 예배와 지난 예배 일정 확인
- 예배별 말씀 주제, 성경 본문, 송리스트 확인
- 기기 캘린더에 예배 일정 추가
- 기본 지도, 네이버 지도, 카카오맵으로 길찾기
- 공식 YouTube 예배 영상과 예배 갤러리 보기
- 예배 리마인더, 일정 변경·취소, 송리스트 공개·변경 알림 선택
- 라이트·다크 화면 모드

일반 사용자는 회원가입이나 로그인 없이 이용합니다. 알림은 선택 사항이며, 사용자가 알림을 켤 때만 권한을 요청합니다. 앱 안에서 알림 종류별로 끄거나 이 기기의 알림 등록을 해제할 수 있습니다.

쥬빌리 워십이 검토하고 공개한 일정과 콘텐츠만 표시됩니다. 공개된 항목이 없을 때는 준비 중 안내가 표시될 수 있습니다.

문의: sundoojubileeworship@gmail.com
```

### App Review 메모 초안

```text
이 앱은 일반 이용자 계정이나 로그인이 필요하지 않습니다.

검토 경로
1. 첫 실행 후 홈에서 다음 예배 일정과 장소를 확인합니다.
2. 하단 '예배' 탭에서 다가오는 예배·지난 예배와 상세 화면을 확인합니다.
3. 예배 상세에서 송리스트, 캘린더 일정 작성 화면, 길찾기 선택창을 확인할 수 있습니다.
4. 하단 '미디어' 탭에서 공개된 예배 영상과 갤러리를 확인합니다. 영상은 외부 YouTube 앱 또는 웹으로 열립니다.
5. 하단 '안내' 탭에서 오시는 길, 외부 공식 채널, 화면 모드와 개인정보처리방침을 확인합니다.

알림은 선택 기능입니다. '안내 > 알림 설정'에서 알림 종류를 켜면 만 14세 이상 확인과 별도 동의 후에만 iOS 알림 권한을 요청합니다. 실제 예배 알림은 공개된 예배 일정과 예약 시각에 따라 발송되므로 심사 중 즉시 도착하지 않을 수 있습니다. 사용자는 같은 화면에서 종류별 알림을 끄거나 이 기기의 등록을 해제할 수 있습니다.

캘린더 버튼은 캘린더 읽기 권한을 요청하지 않고 iOS의 일정 작성 화면을 엽니다. 길찾기, YouTube, Instagram 링크는 사용자가 선택한 경우에만 외부 앱 또는 웹을 엽니다.
```

심사 시점에는 위 경로에서 실제로 볼 수 있는 owner 승인 콘텐츠가 있어야 한다.
송리스트·말씀·갤러리가 비어 있다면 비어 있는 기능을 심사 경로 또는 첫 세 장의
스크린샷에서 핵심 기능처럼 강조하지 않는다.

## 3. Google Play 한국어 문구

### 기본 스토어 등록정보

| 필드 | 초안 | 제한 확인 |
| --- | --- | ---: |
| 앱 이름 | 쥬빌리워십 | 5자 / 최대 30자 |
| 간단한 설명 | 예배 일정, 말씀, 송리스트와 공식 미디어를 한곳에서 확인하세요 | 35자 / 최대 80자 |
| 문의 이메일 | `sundoojubileeworship@gmail.com` | 필수 |
| 웹사이트 | `https://jubilee-worship.vercel.app` | 공개 상태 최종 확인 |
| 개인정보처리방침 | `https://jubilee-worship.vercel.app/privacy` | 최종 정책 공개 후에만 사용 |

간단한 설명은 한 문장이므로 끝 마침표를 쓰지 않았고, 순위·가격·다운로드 유도
문구·이모지·반복 키워드를 넣지 않았다.

### 자세한 설명

```text
쥬빌리워십은 인천 선두교회 예배사역팀 쥬빌리 워십의 공식 예배 안내 앱입니다.

예배 일정과 준비 정보를 한곳에서 확인할 수 있습니다.

주요 기능
- 다가오는 예배와 지난 예배 일정 확인
- 예배별 말씀 주제, 성경 본문, 송리스트 확인
- 기기 캘린더에 예배 일정 추가
- 기본 지도, 네이버 지도, 카카오맵으로 길찾기
- 공식 YouTube 예배 영상과 예배 갤러리 보기
- 예배 리마인더, 일정 변경·취소, 송리스트 공개·변경 알림 선택
- 라이트·다크 화면 모드

일반 사용자는 회원가입이나 로그인 없이 이용합니다. 알림은 선택 사항이며, 사용자가 알림을 켤 때만 권한을 요청합니다. 앱 안에서 알림 종류별로 끄거나 이 기기의 알림 등록을 해제할 수 있습니다.

쥬빌리 워십이 검토하고 공개한 일정과 콘텐츠만 표시됩니다. 공개된 항목이 없을 때는 준비 중 안내가 표시될 수 있습니다.

문의: sundoojubileeworship@gmail.com
```

### Play 검토 메모 초안

Play Console의 앱 액세스 항목은 `모든 기능을 별도 액세스 권한 없이 이용 가능`으로
신고한다. 로그인 정보는 없다. 심사자가 알림 설정을 확인할 때 사용할 경로와 외부
링크 동작은 위 Apple 심사 메모와 동일하게 앱 액세스 안내에 기록한다.

## 4. 연령 표기 정합성

현재 구현은 **앱 전체 이용**을 만 14세 이상으로 차단하지 않고, 종교적 관심을
추론할 수 있는 **알림 선택·등록**만 만 14세 이상 확인과 별도 동의 뒤 허용한다.
따라서 스토어 등록정보에 앱 전체가 `14세 이상 전용`이라고 쓰면 실제 동작과
불일치한다.

- Apple은 설문 응답으로 등급을 계산하며, 필요한 경우 더 높은 등급으로 override할
  수 있다. 현행 선택지에는 정확한 `14+`가 없으므로 실제 콘텐츠와 알림 gate를
  그대로 신고한 뒤 계산 결과를 확인한다.
- Google Play 대상 연령대는 `13~15세`, `16~17세`, `18세 이상`처럼 구간으로
  선택한다. 정확한 14세 단일 기준을 콘솔 대상 연령대로 표현할 수 없다.
- 앱 전체 최소 연령을 14세로 정하려면 첫 실행부터 이용을 제한하는 제품 변경과
  약관·스토어 연령 설정을 함께 재검토해야 한다. 현재 기준은 `일반 콘텐츠 이용은
  로그인 없음, 알림 등록은 만 14세 이상`이다.

## 5. 스크린샷 제작안

### 공통 장면 순서

최종 운영 빌드와 owner가 공개 승인한 실제 콘텐츠로 다음 여섯 장을 촬영한다.
첫 세 장에는 핵심 UI가 충분히 보여야 한다.

| 순서 | 화면 | 보조 문구 초안 | 필요한 사전 상태 | 대체 텍스트 초안 |
| ---: | --- | --- | --- | --- |
| 1 | 홈 | 다가오는 예배를 한눈에 | 미래 예배 1건, 확정 홈 사진 | 다음 예배의 날짜와 장소가 표시된 쥬빌리워십 홈 |
| 2 | 예배 상세 | 일정과 장소를 자세히 | 설명·말씀·장소 공개 | 예배 상세와 캘린더·길찾기 버튼 |
| 3 | 송리스트 | 이번 주 찬양을 미리 확인 | 곡·아티스트·Key가 있는 공개 송리스트 | 순서대로 공개된 이번 주 송리스트 |
| 4 | 미디어 | 예배 영상과 갤러리 | 공개 승인 영상·사진 | 예배 영상 썸네일과 예배 갤러리 |
| 5 | 안내 | 처음 방문도 편리하게 | 주소·교통 안내 공개 | 예배 장소와 지도·주소 복사 안내 |
| 6 | 알림 설정 | 원하는 소식만 알림으로 | 실제 등록 동작 검증 완료 | 예배·일정 변경·송리스트 알림 선택 화면 |

보조 문구를 이미지에 넣는다면 Google Play 권장사항에 따라 화면의 20%를 넘기지
않고, 스토어별 한국어 자산에만 넣는다. 가장 안전한 기본안은 별도 기기 프레임이나
홍보 문구 없이 실제 앱 UI만 사용하는 것이다.

### Apple iPhone

- 앱은 iPad를 지원하지 않으므로 iPhone 세트만 준비한다.
- 세로형 6.9인치 최고 해상도 세트 한 벌을 우선 제작한다. 허용 크기는
  `1260×2736`, `1290×2796`, `1320×2868` 중 캡처 기기와 일치하는 크기를 사용한다.
- 언어·기기 크기별 최소 1장, 최대 10장이다. 이번 앱은 위 6장을 사용한다.
- 형식은 JPEG/JPG/PNG이며 alpha·투명도를 제거한다.
- 6.9인치 세트를 제공하면 동일 UI의 작은 기기 크기는 App Store Connect가
  축소할 수 있다. 업로드 화면에서 요구되는 세트가 달라지면 Media Manager의
  현행 요구를 우선한다.

### Google Play 휴대전화

- 필수 최소치는 JPEG 또는 alpha 없는 24-bit PNG 2장이지만, 추천 노출 요건을
  맞추기 위해 세로 `1080×1920` 9:16 자산 6장을 준비한다.
- 휴대전화 형식별 최대 8장이다.
- 원본 요구 범위는 짧은 변 320px 이상, 긴 변 3840px 이하이며 긴 변은 짧은
  변의 2배를 넘을 수 없다.
- 상태 표시줄의 통신사명·개인 알림을 제거하고 배터리·Wi-Fi·통신 상태를 정상으로
  맞춘다. 개발 메뉴, Expo 도구, 터치 표시, 디버그 배지와 시스템 권한창은 넣지
  않는다.

## 6. Google Play Feature Graphic 제작 결과

필수 규격은 `1024×500`, JPEG 또는 alpha 없는 24-bit PNG이다.

제작 방향:

1. 공개 이용 동의가 기록된 `hero-home-stage-20260820-desktop-1280x720.webp`의
   예배 무대 사진을 1024×500 중앙 크롭한다.
2. 사진 자체를 바꾸거나 인물을 생성·삭제하지 않고, 읽기용 남색 반투명 그라데이션만
   적용한다.
3. 중앙 안전영역에 `쥬빌리워십`과 짧은 문구 `예배를 준비하는 한 화면` 중 하나만
   작게 배치한다. 앱 아이콘을 크게 반복하지 않는다.
4. 순위·수상·가격·`무료`·다운로드 유도·스토어 배지를 넣지 않는다.
5. 작은 화면에서도 식별되도록 가장자리에는 배경만 두고 핵심 인물·문구를 중앙에
   유지한다.

Feature Graphic의 대체 텍스트 초안은 `선두교회 본당 무대에서 찬양을 인도하는
쥬빌리워십 찬양팀`이며, 최종 크롭의 장면과 일치함을 시각 검토했다.

현재 생성·검증된 파일은
`outputs/store-assets/google-play-feature-graphic-1024x500.png`이며, 규격·해시와
재현 방법은 `store-assets/ASSET_MANIFEST.md`에 기록했다.

## 7. 현재 자산 감사

| 자산 | 현재 상태 | 제출 판단 |
| --- | --- | --- |
| `apps/mobile/assets/images/jubilee/app-icon-official.png` | 1024×1024, 불투명 PNG | iOS 앱 아이콘 원본으로 사용 가능 |
| `apps/web/public/images/brand/icon-512.png` | 512×512, 122,235바이트, alpha 채널 없음 | Play가 요구하는 32-bit alpha PNG로 재출력 필요 |
| `apps/mobile/assets/images/jubilee/home-stage-20260820.webp` | 1280×720, 불투명 WebP | Feature Graphic 사진 원본 후보 |
| `outputs/store-assets/google-play-icon-512.png` | 512×512, 32-bit sRGBA, 완전 불투명 | Play 업로드 후보, 검증 통과 |
| `outputs/store-assets/google-play-feature-graphic-1024x500.png` | 1024×500, 24-bit sRGB, alpha 없음 | Play 업로드 후보, 검증 통과 |
| `apps/mobile/.expo/verification-ios-release-home.png` | 1206×2622, alpha 있음, 이전 홈 사진·이전 날짜 | 스토어용 사용 금지 |
| `apps/mobile/.expo/verification-eas-ios-development-*.png` | 개발 메뉴·외부 열기 확인창 또는 개발 표시 포함 | 스토어용 사용 금지 |
| `apps/mobile/.expo/verification/android-device-*.png` | 1080×2400, 개발 도구 버튼이 보이는 캡처 포함 | Play 비율·화면 정리 기준 미충족, 사용 금지 |
| `outputs/app-demo/jubilee-worship-app-demo.mp4` | 48초 내부 시연 영상 | Apple Preview 15~30초 규격과 불일치, Play 공개 YouTube URL도 없음 |

Play 앱 아이콘은 공식 로고 모양과 배경색을 바꾸지 않고 512×512 32-bit PNG로
재출력한다. Apple App Preview는 선택 항목이므로 첫 제출에서는 생략한다. 현재
48초 내부 시연 영상은 Apple의 최대 30초 App Preview로 그대로 사용할 수 없고,
Google Play에 쓰려면 권리 정리된 음원·자막·공개 또는 미등록 YouTube URL·광고
비활성·임베드 허용 조건을 별도로 충족해야 한다.

## 8. 촬영·제작 완료 조건

- Production 빌드이며 앱 이름에 `Dev`·`Preview`가 없음
- 사용자가 확정한 새 홈 예배 사진이 실제 빌드에 표시됨
- 미래 예배, 말씀, 송리스트, 영상, 갤러리, 안내가 owner 승인 공개 상태임
- iOS·Android에서 실제 알림 등록과 해제가 검증됨
- 개발 도구·디버그 배지·개인 알림·터치 표시가 없음
- 모든 인물 사진의 공개 이용 동의 기록이 운영 위치에 보관됨
- 각 파일의 픽셀 크기, 색상 형식, alpha 부재와 해시를 별도 목록으로 검증함
- 스크린샷 문구와 실제 앱 기능이 일치하고 시점이 지난 D-day 화면을 사용하지 않음
- 지원 URL은 실제 연락처를 표시하고 개인정보 URL은 최종 정책을 공개함

## 9. 공식 확인 자료

- [Apple 앱 정보 필드와 이름·부제 제한](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)
- [Apple 버전 정보와 설명·프로모션 문구·키워드 제한](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)
- [Apple 스크린샷 업로드 수량](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots)
- [Apple iPhone 스크린샷 픽셀 규격](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Apple App Preview 15~30초 규격](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/)
- [Apple 연령 등급 설문과 상향 override](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)
- [Google Play 앱 이름·설명 제한](https://support.google.com/googleplay/android-developer/answer/9859152)
- [Google Play 아이콘·Feature Graphic·스크린샷 규격](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Google Play 스토어 등록 권장사항](https://support.google.com/googleplay/android-developer/answer/13393723)
- [Google Play 카테고리·태그](https://support.google.com/googleplay/android-developer/answer/9859673)
- [Google Play 대상 연령대 설정](https://support.google.com/googleplay/android-developer/answer/9867159)
