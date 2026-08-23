# 쥬빌리워십 스토어·운영 메타데이터

상태 기준일: 2026-08-24 (Asia/Seoul)

## 확정값 및 확인 대기 값

| 항목 | 값 |
| --- | --- |
| 앱 표시 이름 | 쥬빌리워십 |
| 첫 공개 마케팅 버전 | `1.0.0` |
| 앱 내부 운영주체 표시 | 쥬빌리 워십 |
| 문의 이메일 | `sundoojubileeworship@gmail.com` 후보, 사용자 최종 확정 대기 |
| 개인정보 문의 이메일 | `sundoojubileeworship@gmail.com` 후보, 사용자 최종 확정 대기 |
| 예배 리마인더 1 | 예배 전날 19:30 KST |
| 예배 리마인더 2 | 예배 당일 시작 1시간 전 |
| 일정 변경·취소 알림 | 오너가 문구·대상·딥링크를 확인하고 승인한 경우 |
| 송리스트 공개·변경 알림 | 오너가 문구·대상·딥링크를 확인하고 승인한 경우 |
| 알림 지연 처리 | 예약 시각부터 15분 이내만 발송, 이후 만료 |
| Apple 개발자 계정 유형 | 개인 |
| Google Play 개발자 계정 유형 | 개인, 2025년 등록 |
| 푸시 토큰 원문 | 알림 해제·무효 판정 후 최대 24시간 |
| 비활성 설치 정보 | 180일 미활동 시 비활성화, 이후 30일이 경과한 항목을 다음 일일 cleanup에서 삭제 |
| 발송 상세기록 | 90일이 경과한 항목을 다음 일일 cleanup에서 삭제 |
| 자동 정리 | 매일 1회 |

위 네 유형의 알림은 사용자가 해당 선택을 직접 켠 경우에만 발송한다. 예배
리마인더는 전날·당일 문구를 한 번에 오너가 승인하며, 나머지 알림도 오너가
문구와 대상을 수동 승인한 뒤 scheduler와 발송 worker가 처리한다.

현재 개발본은 알림 기능에만 만 14세 자기확인 gate를 적용한다. 이 제한을
앱 전체로 확대할지는 사용자 최종 확정 전이므로 스토어 연령 정보를 확정하지
않는다.

## 이름 확인

- 2026-08-15 기준 한국 App Store 공개 검색과 Google Play 공개 검색에서
  정확히 `쥬빌리워십`이라는 앱은 확인되지 않았다.
- 공개 검색은 이름 확보를 보장하지 않는다. Apple 이름은 App Store Connect
  앱 레코드를 생성할 때 최종 확인하며, Google Play도 앱 생성·검토 시
  사칭 또는 혼동 가능성이 없는지 다시 확인한다.
- 영문 `Jubilee Worship`은 해외 음원·교회 명칭으로 이미 사용되고 있으므로,
  한국어 스토어 기본 이름은 `쥬빌리워십`으로 유지한다.

공식 참고:

- Apple App Store Connect 앱 레코드: https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/
- Apple 개인 계정 개발자명 기준: https://developer.apple.com/help/app-store-connect/create-an-app-record/set-your-developer-name/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play 스토어 등록 권장사항: https://support.google.com/googleplay/android-developer/answer/13393723
- Google Play 개인 계정 테스트 요건: https://support.google.com/googleplay/android-developer/answer/14151465
- Google Play target API 일정: https://support.google.com/googleplay/android-developer/answer/11926878
- Google Play package 등록: https://support.google.com/googleplay/android-developer/answer/16984799

## 스토어 개인정보 공개 초안

- 공통: 일반 이용자 계정, 이름, 이메일, 전화번호, 위치, 광고 식별자는 수집하지 않는다. 알림은 선택 기능이며 광고·추적·프로파일링에 사용하지 않는다.
- Apple App Privacy: 무작위 설치 ID와 푸시 토큰은 `Identifiers > Device ID`, 목적은 `App Functionality`, 추적은 `아니요`로 신고하는 보수안을 사용한다. 예배 알림 선택은 종교적 관심을 추론할 여지가 있으므로 `Sensitive Info` 해당 여부도 App Store Connect 최신 문항에서 보수적으로 재확인한다.
- Google Play Data safety: `Device or other IDs`, 선택적 수집, 목적은 `App functionality`와 알림 제공을 위한 `Developer communications`, 광고·추적 목적은 없음으로 준비한다. 예배 알림 선택의 종교 관련 민감정보 분류와 Expo·Supabase의 서비스 제공자 예외는 제출 직전 최신 문항과 계약 기준으로 재확인한다.
- 알림 해제와 토큰 무효 판정 시 원문 토큰을 최대 24시간 이내 삭제하고, 앱 안에서 알림 종류별 해제와 전체 등록 해제를 제공한다.

공식 참고:

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Firebase 토큰 관리: https://firebase.google.com/docs/cloud-messaging/manage-tokens

## 계정·인프라 준비 상태

- Apple 개발자 계정: 개인 계정으로 준비 완료
- Apple 스토어 판매자·개발자명: 개인 계정 소유자의 법적 이름으로 표시
- Google Play Console 계정: 개인 계정, 2025년 등록
- Google Play 정식 공개 게이트: 12명 이상이 14일 연속 참여하는 비공개 테스트 후 Production access 신청 필요
- Google Play 개발자 연락처 이메일·전화번호: Console에서 인증 표시 확인; Android 실제 기기 인증 상태는 별도 확인 필요
- Android 개발자 인증: 현재 등록 package 없음; 새 Play 앱 생성 시 `org.sundoo.jubileeworship` 자동 등록 예정
- Google Play 공개 개발자명: `쥬빌리 워십` 예정, Console 검토 필요
- 테스트 기기: Samsung SM-G991N(Android 15) 연결, 등록된 iPhone은 현재 Mac에 미연결
- Supabase: `Jubilee Worship` 조직의 Free `쥬빌리` 프로젝트, Seoul 리전으로 생성 확인
- 이 저장소의 Supabase 원격 연결: 완료. 2026-08-24 확인 시점에 동의 v5까지 원격 migration 21/21개·Edge Function 8개·retention cron 적용·활성 확인
- Supabase Edge secret `TEST_PUSH_PAIRING_PEPPER`: 설정 완료, 값은 문서·저장소에 미기록
- 실제 push 외부 발송: 비활성(`PUSH_EXTERNAL_SEND_ENABLED=false`), 실기기 통합검증 후 별도 승인 필요
- Vercel 프로젝트와 홈페이지 주소: Production 연결 완료, 기본 URL `https://jubilee-worship.vercel.app`
- Vercel Production `SUPABASE_SECRET_KEY`: 설정 완료, 값은 문서·저장소에 미기록
- Universal Link·App Link association 파일: Production 배포와 HTTPS 200·JSON 응답 검증 완료, 운영 서명 실기기 검증 대기
- Android Production EAS keystore: 생성 완료, 지문은 `docs/APP_LINK_ASSOCIATION.md` 참조
- 스토어 서명 EAS Production build: 2026-08-24 기준 iOS 0건·Android 0건. iOS `production-simulator` 검증본 1건은 서명 IPA·TestFlight 증거가 아님
- Firebase Production Android 앱: 미생성, 등록 폼만 준비하고 외부 생성 확인 대기
- Google Play 앱: 미생성, 폼 기본값만 준비하고 외부 선언·생성 확인 대기
- iOS 서명 자격 증명: Distribution Certificate·Provisioning Profile·APNs key·App Store Connect API key 없음
- 최초 오너 이메일: 운영 DB 연결 시 사용자에게 요청

개발·검수 단계에서는 Supabase Free와 Vercel의 `*.vercel.app` 주소를 사용할
수 있다. Supabase Free는 장기간 미사용 시 프로젝트가 일시 정지될 수 있고,
Vercel Hobby는 개인·비상업용으로 제한되므로 공식 운영 전 실제 사용 형태에
맞는 요금제를 다시 확인한다.

- Supabase 요금제: https://supabase.com/pricing
- Vercel Hobby: https://vercel.com/docs/plans/hobby

## 정식 공개 전 남은 확정사항

1. Apple 개인 계정의 스토어 개발자명은 법적 이름으로 표시되므로 실제 표시명을 App Store Connect에서 확인
2. 원격 cleanup cron 성공 이력 4회는 확인했으며, 실제 만료정보 삭제를 확인한 뒤 국외 처리 내용까지 오너 승인
3. Google Play 비공개 테스터 12명 확보 및 14일 연속 테스트·Production access 신청
4. 개인정보 처리자의 법적 성명·명칭, 책임자·연락처, 최종 지원 이메일, 만 14세 제한 범위를 확정하고 정책 공개
5. 운영 서명 iOS·Android 앱으로 Universal Link·App Link 실기기 검증
6. Firebase Production 앱·Google Play 앱을 외부 확인 후 생성하고 APNs·FCM과 내부 테스트 트랙 연결
7. 최종 스토어 스크린샷·설명·지원 URL·개인정보 URL·연령등급 확정
8. `.com` 또는 `.org` 후보의 권리·가격·갱신 조건을 구매 시점에 재확인

실제 push, 스토어 내부 테스트, 정책 공개와 최종 스토어 스크린샷은 아직
완료되지 않았다.

비밀번호, Supabase secret key, Apple·Google 인증서와 서명키는 문서·채팅·
공개 GitHub에 기록하지 않는다. 각 서비스의 보안 저장소와 환경변수에만 둔다.
