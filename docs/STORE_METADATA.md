# 쥬빌리워십 스토어·운영 메타데이터

확정일: 2026-08-15 (Asia/Seoul)

## 확정값

| 항목 | 값 |
| --- | --- |
| 앱 표시 이름 | 쥬빌리워십 |
| 앱 내부 운영주체 표시 | 쥬빌리 워십 |
| 문의 이메일 | sundoojubileeworship@gmail.com |
| 개인정보 문의 이메일 | sundoojubileeworship@gmail.com |
| 예배 알림 1 | 예배 전날 19:30 KST |
| 예배 알림 2 | 예배 당일 시작 1시간 전 |
| 알림 지연 처리 | 예약 시각부터 15분 이내만 발송, 이후 만료 |
| Apple 개발자 계정 유형 | 개인 |

두 예배 알림은 사용자가 예배 알림을 직접 켠 경우에만 발송한다. 오너가
문구와 대상을 수동 승인한 뒤 scheduler와 발송 worker가 처리한다.

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

## 계정·인프라 준비 상태

- Apple 개발자 계정: 개인 계정으로 준비 완료
- Google Play Console 계정: 사용자 준비 완료
- iOS·Android 실제 테스트 기기: 사용자 준비 완료
- Supabase 계정: 기존 프로젝트 정리 완료, 현재 프로젝트 0개
- 이 저장소의 Supabase 원격 연결: 미설정, 신규 무료 프로젝트 생성·link 필요
- Vercel 프로젝트와 홈페이지 주소: 미연결
- 최초 오너 이메일: 운영 DB 연결 시 사용자에게 요청

개발·검수 단계에서는 Supabase Free와 Vercel의 `*.vercel.app` 주소를 사용할
수 있다. Supabase Free는 장기간 미사용 시 프로젝트가 일시 정지될 수 있고,
Vercel Hobby는 개인·비상업용으로 제한되므로 공식 운영 전 실제 사용 형태에
맞는 요금제를 다시 확인한다.

- Supabase 요금제: https://supabase.com/pricing
- Vercel Hobby: https://vercel.com/docs/plans/hobby

## 정식 공개 전 남은 확정사항

1. Apple 개인 계정의 스토어 개발자명은 법적 이름으로 표시되므로 실제 표시명을 App Store Connect에서 확인
2. 개인정보처리방침의 보유 기간·국외 처리 내용 검토 및 오너 공개 승인
3. 쥬빌리워십 신규 Supabase 프로젝트를 생성한 뒤 link·migration 사전검증
4. Vercel Preview 배포 후 개인정보처리방침·고객지원 URL 등록
5. `.com` 또는 `.org` 후보의 권리·가격·갱신 조건을 구매 시점에 재확인

비밀번호, Supabase secret key, Apple·Google 인증서와 서명키는 문서·채팅·
공개 GitHub에 기록하지 않는다. 각 서비스의 보안 저장소와 환경변수에만 둔다.
