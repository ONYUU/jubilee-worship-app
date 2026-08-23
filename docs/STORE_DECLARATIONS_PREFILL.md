# 쥬빌리워십 스토어 선언 사전입력표

- 기준일: 2026-08-24 (Asia/Seoul)
- 대상 버전: iOS·Android `1.0.0`
- 용도: App Store Connect와 Google Play Console을 열었을 때 현재 코드·데이터 흐름에서 확인된 답을 옮기기 위한 사전입력표
- 범위: 스토어 콘솔 입력·제출을 수행했다는 증빙이 아니며, 선택한 제출 빌드와 최종 공개 정책을 기준으로 다시 확인해야 한다.

> `BLOCKED` 항목은 임시값을 추측하여 입력하지 않는다. 해당 값의 권한자나 법률 검토자가 증빙과 함께 확정한 후에만 콘솔에 입력한다.

## 1. 상태 표기

| 상태 | 의미 | 콘솔 입력 |
| --- | --- | --- |
| `READY` | 현재 코드·저장소에서 확인됨 | 최종 빌드와 일치하면 입력 가능 |
| `VERIFY-BUILD` | 코드 상 예정값은 확인됨 | 제출할 IPA/AAB의 SDK·권한·네이티브 메니페스트 확인 후 입력 |
| `BLOCKED-OWNER` | 제품·운영 권한자의 선택이 필요함 | 확인 전 입력 금지 |
| `BLOCKED-LEGAL` | 법적 처리자·계약·국외 처리·민감정보 검토가 필요함 | 검토 전 입력 금지 |
| `CONDITIONAL` | 최종 빌드나 콘솔의 후속 문항에 따라 필요 여부가 바뀜 | 해당 문항이 나타난 경우만 입력 |

## 2. 공통 실제 기능·데이터 기준

| 항목 | 사전입력값 | 상태 | 근거 |
| --- | --- | --- | --- |
| 앱 이름 | `쥬빌리워십` | `READY` | 앱 설정·스토어 문구 초안 |
| 마케팅 버전 | `1.0.0` | `READY` | 앱 설정 |
| iOS Bundle ID | `org.sundoo.jubileeworship` | `READY` | `apps/mobile/app.config.ts` |
| Android package | `org.sundoo.jubileeworship` | `READY` | `apps/mobile/app.config.ts` |
| 일반 이용자 계정 | 없음 | `READY` | 회원가입·로그인 흐름 없음 |
| 결제·인앱결제 | 없음 | `READY` | 결제 기능·SDK 없음 |
| 광고·마케팅 분석 | 없음 | `VERIFY-BUILD` | 저장소에 광고·마케팅 분석 SDK 없음. 최종 IPA/AAB 재확인 필요 |
| 앱 전체 만 14세 제한 | 아니요 | `READY` | 공개 콘텐츠는 연령 제한 없음 |
| 알림 등록 만 14세 확인 | 예 | `READY` | 알림 선택 전 자기확인·별도 동의·OS 권한 흐름 구현 |
| 앱 밖으로 전송되는 알림 정보 | Supabase: 무작위 설치 ID, 설치 검증값 해시, Expo 푸시 토큰·해시, 플랫폼, 앱 버전·구분, 알림 선택, 동의 버전·해시·언어·시각, 만 14세 이상 확인, 알림 제목·본문·딥링크, 대상 종류·관련 예배 일정, 발송 승인·대기 상태, 설치별 발송 시도, Expo 티켓·영수증, 전달·오류 상태. Expo: 운영체제 기기 푸시 토큰, Expo 앱 설치 ID, 프로젝트·앱 ID, 푸시 서비스 종류·개발/운영 구분, Expo 푸시 토큰, 알림 payload·티켓·영수증·오류. Apple·Google: 운영체제 기기 푸시 토큰, 앱 ID, 알림 payload·전달 메타데이터 | `READY` | 설치된 Expo SDK, `docs/legal/PRIVACY_RELEASE_GATE.md`, Supabase notification migrations |
| 종교 관련 관심 추론 | 예. 예배·일정·송리스트 알림 선택 | `READY` | 설치 ID와 연결해 서버 저장, 민감정보로 보수적 분류 |
| 위치·카메라·마이크·광고 ID | 수집하지 않음 | `VERIFY-BUILD` | 코드·권한 설정 기준. 최종 IPA/AAB 재확인 |
| 제3자 독립 목적 제공 | 현재 코드에서 확인되지 않음 | `BLOCKED-LEGAL` | Supabase·Expo·Apple·Google의 서비스 제공자 예외는 실제 계약·처리 지시 확인 필요 |
| 공개 개인정보처리방침 URL | `https://jubilee-worship.vercel.app/privacy` | `BLOCKED-LEGAL` | 현재 페이지는 “공개 전” 상태이므로 스토어에 입력하지 않음 |
| 지원·개인정보 연락처 | `[확인 필요: 최종 운영 이메일·전화번호]` | `BLOCKED-OWNER` | 현재 문서의 이메일은 후보값일 뿐 최종 확정값이 아님 |

## 3. Apple App Store Connect

### 3.1 앱 레코드·가격·배포 권장 사전입력

아래 값은 콘솔 입력을 위한 **권장안**이며 사용자 확정값이 아니다. 특히 SKU는 앱 레코드를 만든 뒤 변경할 수 없으므로, `BLOCKED-OWNER`가 해제되기 전에는 앱 레코드 생성·가격·배포 설정을 저장하지 않는다.

| App Store Connect 항목 | 권장 사전입력값 | 상태 | 확인 사항 |
| --- | --- | --- | --- |
| Platform | `iOS` | `READY` | 현재 앱 대상 플랫폼 |
| Primary Language | `Korean` | `READY` | 현재 스토어 문구의 기준 언어 |
| SKU | `JUBILEE-WORSHIP-IOS` | `BLOCKED-OWNER` | 사용자 확정 후 입력. 앱 레코드 생성 뒤 변경 불가 |
| User Access | `Full Access` | `BLOCKED-OWNER` | 권장안. App Store Connect 사용자 전체에 앱 접근을 허용할지 계정 소유자가 확정 |
| Price | `0 (Free)` | `BLOCKED-OWNER` | 권장안. 유료 판매·인앱결제 없음과 일치하는지 사용자 확정 |
| Distribution Method | `Public` | `BLOCKED-OWNER` | 권장안. 비공개·Unlisted 배포가 아닌 공개 배포 의도 확인 |
| Availability | `South Korea first` | `BLOCKED-OWNER` | 권장안. 1차 공개 국가를 대한민국으로 제한할지, 이후 국가를 추가할지 사용자 확정 |
| Version Release | `Manually release this version` | `BLOCKED-OWNER` | 권장안. 심사 통과 뒤 자동 공개하지 않고 별도 승인 후 수동 출시 |
| Apple silicon Mac availability | `Exclude` | `BLOCKED-OWNER` | 권장안. Mac 전용 검증 전에는 제공하지 않도록 선택 해제 여부 확정 |
| Apple Vision Pro availability | `Exclude` | `BLOCKED-OWNER` | 권장안. Vision Pro 전용 검증 전에는 제공하지 않도록 선택 해제 여부 확정 |
| Tax Category | `[현재 콘솔의 무료 앱·소프트웨어 분류 확인]` | `BLOCKED-OWNER` | 계정 소유자가 콘솔의 현행 선택지와 세무 적용 범위를 확인해 확정 |

### 3.2 App Privacy 사전입력

#### 전체 문항

| App Store Connect 문항 | 사전입력값 | 상태 | 비고 |
| --- | --- | --- | --- |
| 앱 또는 제3자 파트너가 데이터를 수집하는가 | `Yes` | `READY` | 푸시 등록 시 설치 ID·푸시 토큰·알림 선택을 기기 밖으로 전송·저장 |
| 수집 데이터를 추적에 사용하는가 | `No` | `READY` | 광고·데이터 브로커·타사 데이터 결합 없음 |
| 제3자 광고 목적 | 선택하지 않음 | `READY` | 해당 기능 없음 |
| 개발자 광고·마케팅 목적 | 선택하지 않음 | `READY` | 해당 기능 없음 |
| 분석·제품 개인화 목적 | 선택하지 않음 | `VERIFY-BUILD` | 최종 빌드에 추가 SDK가 없는지 확인 |
| Privacy Policy URL | `https://jubilee-worship.vercel.app/privacy` | `BLOCKED-LEGAL` | 최종 처리자·국외 처리·보유·연락처 확정과 공개 후에만 입력 |
| Privacy Choices URL | 빈칸 | `CONDITIONAL` | Apple 선택 항목. 알림 철회·데이터 삭제 안내 URL을 별도 공개할 경우만 입력 |

#### 데이터 유형별 답변

| Apple 데이터 유형 | Collected | 목적 | Linked to User | Tracking | 상태 | 입력 근거 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Sensitive Info` | `Yes` | `App Functionality` | `Yes` | `No` | `READY` | 종교적 관심을 추론할 수 있는 알림 선택이 설치 ID·푸시 토큰과 연결됨 |
| `Identifiers > Device ID` | `Yes` | `App Functionality` | `Yes` | `No` | `READY` | 무작위 설치 ID, Expo 앱 설치 ID, 운영체제 기기 푸시 토큰, Expo 푸시 토큰·해시, 설치 검증 해시 |
| `Usage Data > Product Interaction` | `Yes` | `App Functionality` | `Yes` | `No` | `READY` | 사용자가 선택한 예배·일정변경·송리스트 알림 종류와 동의 선택을 설치 ID에 연결해 알림 기능을 제공 |
| `Other Data > Other Data Types` | `Yes` | `App Functionality` | `Yes` | `No` | `READY` | 플랫폼·앱 버전, 동의 버전·언어·시각, 만 14세 이상 확인 여부·서버 확인 시각을 설치 ID에 연결해 기능·동의 상태를 관리 |

입력 전 추가 확인:

| 확인 항목 | 상태 | 처리 기준 |
| --- | --- | --- |
| API·보안 로그의 IP, User-Agent, 요청 경로·시각·상태코드 | `BLOCKED-LEGAL` | 실제 수집·마스킹·보유·사용 목적을 확정하고 Apple 데이터 유형을 추가할지 판단 |
| Supabase·Expo·Apple·Google이 처리하는 추가 데이터 | `BLOCKED-LEGAL` | 설치된 Expo SDK에서 확인한 운영체제 기기 푸시 토큰·Expo 앱 설치 ID·프로젝트/앱 ID·서비스 구분·알림 payload와 각 공급자 정책상 IP·운영체제·오류·성능 정보를 기준으로, 실제 계약·하위처리자 확인 후 필요한 유형을 추가 |
| 크래시·진단 SDK | `VERIFY-BUILD` | 제출 IPA의 SDK·Privacy Manifest를 확인하고 `Diagnostics`·`Usage Data` 추가 여부 판단 |
| 외부 메일 앱으로 보내는 지원 문의 | `BLOCKED-LEGAL` | 앱은 `mailto:`만 열고 문의는 사용자가 외부 메일 앱에서 직접 전송한다. Apple의 선택적 공개 예외 충족 여부 또는 `Contact Info`·`Customer Support` 공개 여부를 최종 지원 절차와 함께 판단 |

### 3.3 App Content·연령등급 설문

Apple의 등급은 아래 설문 답을 바탕으로 콘솔이 계산한다. 알림만 만 14세 이상으로 제한하는 현재 구조를 앱 전체 `14+` 등급으로 임의 표시하지 않는다.

| 현행 설문 카테고리 | 사전입력값 | 상태 | 근거·주의 |
| --- | --- | --- | --- |
| `Parental Controls` | `No` | `READY` | 부모·법정대리인용 제어 기능 없음 |
| `Age Assurance` | `Yes` | `READY` | 알림 기능 접근 전 만 14세 이상 자기확인 구현. 신분증 검증은 아님 |
| `Unrestricted Web Access` | `No` | `READY` | 허용된 공식 외부 링크만 열며 앱 안에서 자유롭게 웹을 탐색할 수 없음 |
| `User-Generated Content` | `No` | `READY` | 일반 이용자 게시·업로드 기능 없음 |
| `Social Media` | `No` | `READY` | 외부 Instagram·YouTube 링크만 있고 앱 내 소셜 피드·재배포·반응 기능 없음 |
| `Social Media Disabled for Users Under 13` | `No` | `READY` | 앱 내 소셜 미디어 기능이 없으므로 해당 없음 |
| `Messaging and Chat` | `No` | `READY` | 이용자 간 통신 없음 |
| `Advertising` | `No` | `VERIFY-BUILD` | 저장소 기준 없음. 최종 IPA 확인 |
| 욕설·저속한 유머 | `None` | `BLOCKED-OWNER` | 심사에 노출되는 최종 공개 영상·갤러리·본문까지 오너 검수 후 확정 |
| 공포·두려움 | `None` | `BLOCKED-OWNER` | 최종 공개 콘텐츠 검수 필요 |
| 알코올·담배·약물 | `None` | `BLOCKED-OWNER` | 최종 공개 콘텐츠 검수 필요 |
| 의료·치료 정보 | `None` | `READY` | 의료·진단·치료 기능 없음 |
| 건강·웰니스 주제 | `None` | `READY` | 건강 관리·자기관리 추천 기능 없음 |
| 성적·선정적 주제·노출 | `None` | `BLOCKED-OWNER` | 최종 공개 콘텐츠 검수 필요 |
| 만화·판타지 폭력 | `None` | `BLOCKED-OWNER` | 최종 공개 콘텐츠 검수 필요 |
| 현실적·그래픽 폭력·무기 | `None` | `BLOCKED-OWNER` | 최종 공개 콘텐츠 검수 필요 |
| 도박·모의 도박·루트박스·경연 | `None` | `READY` | 해당 기능 없음 |
| 계산 등급 | `[콘솔 계산값 확인]` | `CONDITIONAL` | 콘솔 계산 결과를 임의로 바꾸지 않는다. 예상은 전 세계 `4+`, 한국 `전체 이용가`이지만 실제 콘솔 결과가 우선이다. |
| 수동 상향 override | `No` 후보 | `BLOCKED-OWNER` | 앱 전체 연령을 상향할 제품·법무 근거가 있는 경우만 변경 |

### 3.4 Export Compliance

| 문항 | 사전입력값 | 상태 | 근거·조치 |
| --- | --- | --- | --- |
| 비면제 암호화를 사용하는가 | `No` | `VERIFY-BUILD` | `ITSAppUsesNonExemptEncryption=false` 설정. OS·표준 HTTPS 외 독자 암호 알고리즘 구현은 확인되지 않음 |
| 독자·표준이 아닌 암호 알고리즘 | `No` | `VERIFY-BUILD` | 제출 IPA와 네이티브 SDK 재확인 |
| 수출 승인 문서 업로드 | `Not expected` | `CONDITIONAL` | App Store Connect가 후속 문항을 표시하면 그 문항의 현행 정의로 재판단 |

`ITSAppUsesNonExemptEncryption=false`는 “암호화를 전혀 사용하지 않는다”는 일반 선언이 아니라, Apple 수출규정상 비면제 암호화를 사용하지 않는다는 앱 설정값이다.

### 3.5 EU Digital Services Act

| 문항 | 사전입력값 | 상태 | 확인 사항 |
| --- | --- | --- | --- |
| Apple Developer 계정 유형 | `Individual` | `READY` | 현재 운영 문서 기준 |
| EU에 앱을 배포할 것인가 | `[확인 필요]` | `BLOCKED-OWNER` | 최종 배포 국가 선택 |
| DSA trader status | `[Trader / Not a trader 선택 필요]` | `BLOCKED-LEGAL` | 무료·무광고만으로 `Not a trader`를 자동 선택하지 않음. 직업·사업·공예 목적과의 연관성 검토 필요 |
| Trader 개인의 공개 주소·사서함 | `[실제 증빙 가능한 값]` | `BLOCKED-LEGAL` | Trader로 선택하는 경우 필수 |
| Trader 전화번호 | `[인증 가능한 국제형 번호]` | `BLOCKED-LEGAL` | Trader로 선택하는 경우 필수 |
| Trader 이메일 | `[인증 가능한 운영 이메일]` | `BLOCKED-LEGAL` | Trader로 선택하는 경우 필수 |
| 지불 계좌·EU 법령 준수 확약 | `[확인 필요]` | `BLOCKED-LEGAL` | Trader로 선택하는 경우 Apple 안내에 따라 완료 |

EU에 배포하지 않더라도 trader status 선언 자체는 요구된다. Apple은 개발자 대신 상인 여부를 판단하지 않으므로 오너·법무가 결정한다.

### 3.6 대한민국 스토어 규정 정보

대한민국에서 앱을 제공하려면 App Store Connect의 대한민국 규정 정보에 계정 유형별 필수 정보를 제출하고, 표시되는 확인 상태를 완료해야 한다. 실제 개인정보는 이 문서에 적지 않고 콘솔의 보안 입력란과 별도 증빙에만 보관한다.

| 확인 항목 | 사전입력값 | 상태 | 필요 증빙·조치 |
| --- | --- | --- | --- |
| Apple Developer 계정의 대한민국 개인·조직 구분 | `[현재 계정 정보 확인]` | `BLOCKED-OWNER` | App Store Connect의 실제 계정 유형과 대한민국 규정 정보 화면 일치 확인 |
| 대한민국 표시용 이메일 | `[실제 응답 가능한 공개 이메일]` | `BLOCKED-OWNER` | 계정 소유자가 사용할 주소 확정 후 Apple 인증 완료 |
| 대한민국 표시용 전화번호 | `[실제 응답 가능한 번호]` | `BLOCKED-OWNER` | 계정 소유자가 사용할 번호 확정 후 Apple 인증 완료 |
| 사업자등록번호(BRN) 적용 여부 | `[해당 여부 확인]` | `BLOCKED-OWNER` | 개인·조직 및 실제 사업자등록 상태에 따라 입력 필요 여부 판단 |
| 규정 정보 저장·인증 상태 | `[App Store Connect에서 확인]` | `BLOCKED-OWNER` | 대한민국 배포 선택 전 필수값의 저장·인증 완료 화면을 제출 증빙으로 보관 |

### 3.7 Content Rights

| 문항 | 사전입력값 | 상태 | 근거·필요 증빙 |
| --- | --- | --- | --- |
| 앱이 제3자 콘텐츠를 포함·표시·접근하는가 | `Yes` | `READY` | 예배 사진·갤러리, 곡명·아티스트 정보, 외부 YouTube·Instagram 콘텐츠에 접근 |
| 표시·접근할 권리가 있는가 | `[확인 필요]` | `BLOCKED-OWNER` | 홈·Feature Graphic 사진의 공개 동의는 기록되었지만, 심사 빌드의 모든 사진·영상·음원·썸네일·곡 정보의 소유·허락·인물 동의 증빙 필요 |
| `쥬빌리워십`·`선두교회` 명칭, 공식 로고와 “공식 앱” 표방 권리가 있는가 | `[권리자 승인 문서 확인 필요]` | `BLOCKED-OWNER` | 정확한 앱 이름·로고, Bundle ID·package `org.sundoo.jubileeworship`, Apple·Google 게시자 계정 및 공개 배포 범위를 포함한 권리자 승인 필요 |

명칭·로고·공식 앱 표방 권한은 사진 속 인물 공개 동의와 제3자 미디어 이용 권한과 별개의 증빙으로 관리한다.

### 3.8 App Review 연락처·접근 정보

| 필드 | 사전입력값 | 상태 |
| --- | --- | --- |
| First name | `[확인 필요: 실제 심사 담당자 이름]` | `BLOCKED-OWNER` |
| Last name | `[확인 필요: 실제 심사 담당자 성]` | `BLOCKED-OWNER` |
| Phone number | `[확인 필요: +82 국제형 응답 가능 번호]` | `BLOCKED-OWNER` |
| Email | `[확인 필요: 심사 중 응답 가능 이메일]` | `BLOCKED-OWNER` |
| Sign-in required | `No` | `READY` |
| Demo account required | `No` | `READY` |
| User name | 빈칸 | `READY` |
| Password | 빈칸 | `READY` |

App Review Notes 붙여넣기 초안:

```text
이 앱은 일반 이용자 계정이나 로그인이 필요하지 않습니다.

홈에서 다음 예배를 확인하고, '예배' 탭에서 상세·송리스트·캘린더·길찾기를 확인할 수 있습니다. '미디어' 탭은 공식 YouTube 영상과 갤러리를 표시하며, 영상은 외부 YouTube 앱 또는 웹에서 열립니다. '안내' 탭에서 오시는 길, 외부 공식 채널, 화면 모드와 개인정보처리방침에 접근할 수 있습니다.

알림은 선택 기능입니다. '안내 > 알림 설정'에서 만 14세 이상 확인과 별도 동의를 마친 후에만 iOS 알림 권한을 요청합니다. 실제 예배 알림은 예약 시각에 따라 발송되므로 심사 중 즉시 도착하지 않을 수 있습니다. 같은 화면에서 알림 선택을 끄거나 이 기기의 등록을 해제할 수 있습니다.
```

심사 시점의 실제 공개 콘텐츠와 위 경로가 다르면 실제 빌드에 맞게 수정한다.

## 4. Google Play Console

### 4.1 Data Safety 전체 문항

| Play Console 문항 | 사전입력값 | 상태 | 근거·조치 |
| --- | --- | --- | --- |
| 앱이 필수 사용자 데이터 유형을 수집하거나 공유하는가 | `Yes` | `READY` | 알림 동의 시 설치 ID·푸시 토큰·알림 선택을 기기 밖으로 전송 |
| 모든 수집 데이터가 전송 중 암호화되는가 | `Yes` 후보 | `VERIFY-BUILD` | 앱·Supabase·Expo 통신은 HTTPS 기준. 최종 빌드의 모든 데이터 경로를 재확인 |
| 사용자가 데이터 삭제를 요청할 수 있는가 | `Yes` 후보 | `VERIFY-BUILD` | 앱 내 알림 등록 해제로 토큰 원문을 삭제·비활성화. 최종 공개 정책의 요청 경로·보유기간과 실기기 동작 확인 |
| 사용자 계정을 생성할 수 있는가 | `No` | `READY` | 일반 이용자 계정 없음. 계정 삭제 URL 의무는 현재 구조에 직접 적용되지 않음 |
| Privacy policy URL | `https://jubilee-worship.vercel.app/privacy` | `BLOCKED-LEGAL` | 공개 전 페이지를 입력하지 않음 |

### 4.2 Data Safety 데이터 유형별 사전입력

| Google 데이터 유형 | Collected | Shared | Ephemeral | Required/Optional | 목적 | 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Personal info > Political or religious beliefs` | `Yes` | `[확인 필요]` | `No` | `Optional` | `App functionality`, `Developer communications` | 수집·선택성·목적은 `READY`; 공유 여부는 `BLOCKED-LEGAL` |
| `Personal info > Other info` | `Yes` | `[확인 필요]` | `No` | `Optional` | `App functionality` | 만 14세 이상 확인 여부와 동의 메타데이터. 수집·선택성·목적은 `READY`; 공유 여부는 `BLOCKED-LEGAL` |
| `App activity > App interactions` | `Yes` | `[확인 필요]` | `No` | `Optional` | `App functionality`, `Developer communications` | 사용자가 켠 알림 종류와 동의 선택. 수집·선택성·목적은 `READY`; 공유 여부는 `BLOCKED-LEGAL` |
| `Device or other IDs` | `Yes` | `[확인 필요]` | `No` | `Optional` | `App functionality`, `Developer communications` | 수집·선택성·목적은 `READY`; 공유 여부는 `BLOCKED-LEGAL` |

입력 방법:

- 알림을 켜지 않아도 앱의 공개 콘텐츠를 이용할 수 있으므로 네 유형 모두 `Optional`로 선택한다.
- 서버에 저장되고 즉시 폐기되지 않으므로 `Ephemeral processing`으로 선택하지 않는다.
- Supabase·Expo·Apple·Google이 Google의 현행 정의상 개발자의 지시만 따르는 service provider인지 실제 계약으로 확인하기 전에 `Shared = No`를 확정하지 않는다.
- IP HMAC, API·보안 로그, 발송 이력의 실제 필드·목적·보유기간을 확정한 후 `Approximate location`, `App activity`, `App info and performance` 등을 추가해야 하는지 다시 판단한다.
- 지원 문의는 앱이 외부 메일 앱의 `mailto:` 작성 화면만 열고 사용자가 직접 전송한다. Google의 사용자 주도 전송·외부 앱 범위에서 Data Safety 공개 대상인지, 최종 지원 공급자·보관 절차와 함께 `BLOCKED-LEGAL`로 판정한다.

### 4.3 대상 연령대·콘텐츠

| 문항 | 사전입력값 | 상태 | 근거·주의 |
| --- | --- | --- | --- |
| Target audience age groups | `13–15`, `16–17`, `18 and over` 후보 | `BLOCKED-OWNER` | Google에는 정확한 `14+` 단일 선택지가 없음. 공개 콘텐츠는 14세 미만에게도 차단되지 않고 알림 등록만 만 14세 이상이다. 최종 의도 확정 필요 |
| 앱이 주로 아동을 대상으로 하는가 | `No` 후보 | `BLOCKED-OWNER` | `12 and under` 연령대를 선택하지 않는 현재 후보안 기준 |
| 스토어 문구에 “앱 전체 14세 이상” 표시 | `No` | `READY` | 실제 앱 동작과 다름 |

### 4.4 IARC 콘텐츠 등급 사전답변

IARC는 답변에 따라 등급을 발급하므로 예상 등급을 직접 입력하지 않는다. 콘솔의 실제 한국어 문항이 다르면 아래 기능 사실에 맞게 대응시킨다.

| IARC 항목 | 사전입력값 | 상태 | 근거·주의 |
| --- | --- | --- | --- |
| 설문 연락 이메일 | `[확인 필요: 등급 연락 수신자]` | `BLOCKED-OWNER` | 실제 응답 가능 이메일 |
| 폭력·무기 | `No` 후보 | `BLOCKED-OWNER` | 최종 공개 영상·갤러리·본문 검수 후 확정 |
| 성적 콘텐츠·노출 | `No` 후보 | `BLOCKED-OWNER` | 최종 공개 콘텐츠 검수 후 확정 |
| 욕설·저속한 언어 | `No` 후보 | `BLOCKED-OWNER` | 최종 공개 콘텐츠 검수 후 확정 |
| 공포·약물·음주·흡연 | `No` 후보 | `BLOCKED-OWNER` | 최종 공개 콘텐츠 검수 후 확정 |
| 현금 또는 모의 도박 | `No` | `READY` | 해당 기능 없음 |
| 사용자 간 상호작용·콘텐츠 공유 | `No` | `READY` | 계정·채팅·게시·UGC 없음 |
| 정밀한 위치 공유 | `No` | `VERIFY-BUILD` | 위치 권한·수집 코드 없음. 최종 AAB 확인 |
| 무제한 인터넷 접근 | `No` | `READY` | 허용된 공식 링크만 외부 앱·웹으로 열림 |
| 앱 내 구매·디지털 상품 | `No` | `READY` | 결제·인앱결제 없음 |
| 등급 결과 | `[콘솔이 발급한 IARC 결과 검토]` | `CONDITIONAL` | 실제 결과가 앱 콘텐츠와 다르면 선택 답변을 재검토 |

### 4.5 App Content·정책 선언 종합표

| Play Console 선언 | 사전입력값 | 상태 | 콘솔 메모 |
| --- | --- | --- | --- |
| Ads | `No, my app does not contain ads` | `VERIFY-BUILD` | 저장소에 광고 SDK·광고 UI 없음. 최종 AAB 재확인 |
| App access | `All functionality is available without special access` | `READY` | 로그인 없음. 알림의 만 14세 확인·동의·OS 권한은 심사자 계정 접근 제한이 아님 |
| Target audience and content | `13–15`, `16–17`, `18+` 후보 | `BLOCKED-OWNER` | 제4.3절의 연령 범위 확정 후 입력 |
| Content rating | `Complete IARC questionnaire` | `CONDITIONAL` | 제4.4절 답변 사용 |
| Data safety | `Collects data` | 부분 `BLOCKED-LEGAL` | 제4.1–4.2절 사용. 공유·추가 로그 유형 확정 필요 |
| Health apps | `My app doesn't provide any health features` | `READY` | 건강·의료 기능 및 건강 데이터 접근 없음 |
| Financial features | `My app doesn't provide any financial features` | `READY` | 금융·결제·대출·투자·보험 기능 없음 |
| Government apps | `No, this is not a government app` | `READY` | 교회 예배 안내 앱으로 정부 소유·정부 정보·정부 서비스 없음 |
| News and magazine apps | `No` | `READY` | 뉴스·잡지 앱이 아님 |
| COVID-19 contact tracing/status | `No` | `CONDITIONAL` | 콘솔에 문항이 나타나는 경우. 코로나19 추적·상태 기능 없음 |
| Advertising ID | `No` | `VERIFY-BUILD` | 광고 ID 사용 코드·SDK 없음. 최종 AAB에 `com.google.android.gms.permission.AD_ID`가 없는지 확인 |
| Account deletion | `Not applicable — users cannot create accounts` | `READY` | 계정 생성 기능 없음. Data Safety의 일반 데이터 삭제 문항은 별도 처리 |
| High-risk or sensitive permissions | `None expected` | `VERIFY-BUILD` | 최종 AAB 업로드 후 Play가 선언을 요구하는 권한이 있는지 확인 |

#### App access 심사 안내 붙여넣기 초안

```text
일반 이용자 계정이나 로그인이 없으며 모든 핵심 화면에 별도 자격 증명 없이 접근할 수 있습니다.

1. 홈에서 다음 예배 일정을 확인합니다.
2. '예배' 탭에서 예배 상세, 송리스트, 캘린더, 길찾기를 확인합니다.
3. '미디어' 탭에서 공식 영상과 갤러리를 확인합니다.
4. '안내' 탭에서 오시는 길, 외부 공식 채널, 화면 모드, 개인정보처리방침을 확인합니다.
5. '안내 > 알림 설정'에서 알림 종류를 켜면 만 14세 이상 확인과 별도 동의 후 Android 알림 권한을 요청합니다. 이는 로그인이나 심사 접근 제한이 아니며, 같은 화면에서 알림 선택을 끄거나 이 기기의 등록을 해제할 수 있습니다.

예약된 실제 알림은 심사 중 즉시 도착하지 않을 수 있습니다.
```

### 4.6 대화면 스토어 자산 선택 항목

| 항목 | 권장 처리 | 상태 | 제출 기준 |
| --- | --- | --- | --- |
| 7-inch tablet screenshots | `[사용 여부 선택]` | `CONDITIONAL` | 휴대전화 스크린샷과 별도 선택 항목. 사용 시 최종 Production 빌드의 실제 태블릿 화면을 현행 Play Console 규격에 맞춰 준비 |
| 10-inch tablet screenshots | `[사용 여부 선택]` | `CONDITIONAL` | 사용 시 최종 Production 빌드·지원 방향·레이아웃과 일치하는 자산만 업로드 |
| Chromebook screenshots | `[사용 여부 선택]` | `CONDITIONAL` | 실제 Chromebook 지원·검증 범위에 포함할 때만 준비 |

태블릿·Chromebook 스크린샷은 현재 휴대전화용 기본 게시 자산의 완료 여부와 분리한다. 해당 폼팩터 자산을 사용하기로 확정한 경우에만 Play Console이 표시하는 최신 수량·비율·해상도 조건을 적용하고, 실제 기기 화면과 다른 목업은 제출하지 않는다.

### 4.7 Android 개발자 인증·패키지 등록

현재 Play Console은 개인 개발자 계정의 Android 개발자 인증 메뉴에서 패키지 이름 등록 상태를 관리한다. Google Play 배포 앱은 대부분 자동 등록되므로 앱 생성·첫 AAB 처리 뒤 실제 상태를 확인하고, 자동 등록되지 않은 경우에만 콘솔 안내에 따라 수동 등록한다.

| 확인 항목 | 상태 | 제출 전 증빙 |
| --- | --- | --- |
| 개발자 신원 인증 상태 | `BLOCKED-OWNER` | Play Console Android 개발자 인증의 ID 상태 |
| `org.sundoo.jubileeworship` 패키지 등록 | `CONDITIONAL` | 앱 생성·AAB 처리 뒤 자동 등록 여부; 미등록 시 수동 등록 결과 |
| Play App Signing 키 연결 | `VERIFY-BUILD` | 최종 AAB 업로드 후 Play App Signing 인증서와 package 연결 |

2026년 9월 30일부터 브라질·인도네시아·싱가포르·태국의 참여 스토어에서 지역 적용이 시작되고 2027년 이후 전 세계 확대가 예정되어 있으므로, 대한민국 우선 출시라도 제출 전 등록 상태를 확인한다.

## 5. 제출 전 BLOCKED 해제표

| 우선순위 | 해제할 항목 | 확정 권한자 | 필요 증빙·결과 |
| ---: | --- | --- | --- |
| 1 | 개인정보 처리자·서비스 제공자의 법적 성명·단체명 | 오너·법무 | 스토어 판매자명·앱 표시·정책과 일치하는 실제 값 |
| 2 | 지원·개인정보 이메일, 전화번호, 담당자 | 오너 | 실제 응답·인증·삭제 운영 가능한 연락처 |
| 3 | Supabase·Expo·Apple·Google·Vercel·지원 이메일의 계약 역할·국외 처리·하위처리자 | 오너·법무 | 실제 계약, DPA, 처리 국가·항목·시점·방법·보유·거부 효과 |
| 4 | API·보안·Vercel·Supabase 로그 항목·마스킹·보유·법적 근거 | 운영자·법무 | 실제 운영 설정과 최초 만료 자료 삭제 증거 |
| 5 | 종교 관련 알림 선택의 민감정보 동의·국외 처리·만 14세 확인 방식 | 오너·법무 | 동의 문구·방식·철회·법정대리인 요건 검토 |
| 6 | 알림함·토큰·비활성 설치·발송 기록의 보유·삭제 | 오너·운영자 | iOS·Android 실기기 등록·철회·만료 삭제 증거 |
| 7 | 앱 내·스토어 사진·영상·음원·썸네일·곡 정보 권리 | 콘텐츠 오너 | 소유·허락·인물 공개 동의·제3자 이용 조건 기록 |
| 8 | 공식 명칭·로고·“공식 앱” 표방 권한 | 권리자·계정 소유자 | 정확한 앱 이름·로고·게시자 계정·Bundle ID·package·두 스토어 공개 배포를 포함한 승인 문서 |
| 9 | Apple 앱 레코드·가격·공개 범위·출시 방식·Mac/Vision 제공 여부 | 계정 소유자 | SKU·User Access 및 무료·공개·한국 우선·수동 출시·Mac/Vision 제외 권장안의 사용자 확정 기록 |
| 10 | Apple 대한민국 규정 정보 | 계정 소유자 | 계정 유형, 이메일·전화 인증, BRN 적용 여부 및 콘솔 완료 상태 |
| 11 | Apple DSA trader status·EU 배포 여부 | 계정 소유자·법무 | Trader 판단 근거와 필요한 주소·전화·이메일 증빙 |
| 12 | Google 대상 연령대 | 제품 오너 | 공개 콘텐츠 대상과 알림만 14세 제한하는 현재 동작의 정합성 확정 |
| 13 | Apple Review·IARC 연락 담당자 | 오너 | 실제 응답 가능한 성명·국제형 전화·이메일 |
| 14 | Android 개발자 인증·패키지 등록 | 계정 소유자 | 개발자 ID 인증, package 등록, Play App Signing 키 연결 상태 |

## 6. 입력 직전 최종 검증 순서

1. 제출할 IPA·AAB의 실제 SDK, 권한, 암호화, 광고 ID, 데이터 전송 경로를 재검토한다.
2. 제5절의 `BLOCKED` 항목을 권한자 증빙으로 해제한다.
3. SKU·User Access와 가격·배포·출시·Mac/Vision 권장안을 사용자가 확정한 뒤에만 Apple 앱 레코드와 배포 설정을 저장한다.
4. Apple 대한민국 규정 정보의 이메일·전화 인증과 BRN 적용 여부를 확인하고 완료 증빙을 보관한다.
5. 공식 명칭·로고·“공식 앱” 표방 및 두 스토어 게시 권한 증빙을 확인한다.
6. 최종 개인정보처리방침을 공개하고 URL에 공개 전·미정·후보·검토 표식이 없는지 확인한다.
7. 공개 정책과 실제 빌드를 기준으로 Apple App Privacy·Google Data Safety의 공유·로그 항목을 확정한다.
8. Apple 연령등급·Google IARC 결과가 최종 공개 콘텐츠와 일치하는지 확인한다.
9. Google 태블릿·Chromebook 자산을 사용하기로 한 경우에만 최종 Production 빌드로 현행 콘솔 규격에 맞춰 준비한다.
10. 실제 심사 담당자·운영 연락처를 입력하고, 저장 후 미완료 항목 표시가 없는지 확인한다.

## 7. 검증 근거

### 저장소

- `apps/mobile/app.config.ts`
- `docs/STORE_LISTING_DRAFT.md`
- `docs/STORE_METADATA.md`
- `docs/legal/PRIVACY_RELEASE_GATE.md`
- `supabase/migrations/20260815092136_add_notification_retention_cleanup.sql`
- `supabase/migrations/20260820063524_add_sensitive_interest_notification_consent.sql`
- `supabase/migrations/20260820095834_require_notification_age_14_confirmation.sql`
- `supabase/migrations/20260823132500_align_privacy_operational_gates.sql`
- `supabase/migrations/20260823143000_lock_legal_contact_to_site_settings.sql`
- `supabase/migrations/20260823150748_require_sensitive_interest_consent_v3.sql`
- `supabase/migrations/20260823152830_require_sensitive_interest_consent_v4.sql`
- `supabase/migrations/20260823154935_require_sensitive_interest_consent_v5.sql`

### Apple 공식 문서

- App Privacy data types, linked data, tracking: https://developer.apple.com/app-store/app-privacy-details/
- App Privacy management: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Age rating categories and values: https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/
- Export compliance: https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance
- Add a new app: https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/
- Pricing, availability, tax category and release: https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/overview-of-publishing-your-app-on-the-app-store
- iPhone·iPad app availability on Mac with Apple silicon: https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-macs-with-apple-silicon
- iPhone·iPad app availability on Apple Vision Pro: https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-apple-vision-pro
- 대한민국 규정 정보: https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-korea-compliance-information
- App Review Guidelines 5.2 Intellectual Property: https://developer.apple.com/app-store/review/guidelines/
- EU DSA trader requirements: https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/
- App Review information fields: https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-details

### Google 공식 문서

- Store listing preview asset requirements: https://support.google.com/googleplay/android-developer/answer/9866151
- Impersonation policy: https://support.google.com/googleplay/android-developer/answer/9888374
- Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469?hl=en
- Android developer verification: https://developer.android.com/developer-verification
- Target audience and content: https://support.google.com/googleplay/android-developer/answer/9867159?hl=en
- Content ratings/IARC: https://support.google.com/googleplay/android-developer/answer/9898843?hl=en
- App access and App Content preparation: https://support.google.com/googleplay/android-developer/answer/9859455?hl=en
- Health apps declaration: https://support.google.com/googleplay/android-developer/answer/14738291?hl=en
- Financial features declaration: https://support.google.com/googleplay/android-developer/answer/13849271?hl=en
- Government apps declaration: https://support.google.com/googleplay/android-developer/answer/9514050?hl=en
- Advertising ID: https://support.google.com/googleplay/android-developer/answer/6048248?hl=en
