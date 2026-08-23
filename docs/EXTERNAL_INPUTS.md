# 남은 외부 입력

- 기준일: 2026-08-24 KST

스토어 제출 직전 상태까지 진행하는 데 필요한 외부 입력과 확인만 정리한
목록입니다. 아래 미제공·미확정 값은 문서에서 임의로 확정하지 않습니다.

| 우선순위 | 입력 | 필요한 이유 | 현재 상태 |
|---|---|---|---|
| 1 | 최초 관리자 이메일 | 공개 가입 없이 Auth 사용자 생성 | 미제공 |
| 1 | 최초 Auth 사용자 UUID | `admin_users` owner 등록 | 계정 생성 후 확인 |
| 1 | 개인정보 처리자의 정확한 법적 성명·명칭, 책임자·담당부서·전화번호 | 개인정보처리방침과 스토어 심사 정보 | 미확정 |
| 1 | 최종 지원·개인정보 문의 이메일 | 지원 URL과 스토어 연락처 | `sundoojubileeworship@gmail.com` 후보, 최종 확정 대기 |
| 1 | 만 14세 제한 범위 | 알림 기능만 제한할지 앱 전체를 제한할지 확정 | 현재 개발본은 알림 기능만 제한, 사용자 최종 확정 대기 |
| 1 | 2026-09-04 예배 최종 확인 | 공개 직전 일정 오류 방지 | 2026-08-15 공식 Instagram·교회 페이지 재확인, 공개 직전 한 번 더 확인 필요 |
| 2 | Firebase Production Android 앱 생성 확인 | 운영 `google-services.json`과 FCM 연결 | 등록 폼만 준비, 외부 생성 확인 대기 |
| 2 | Google Play Console 앱 생성·필수 선언 확인 | 내부 테스트 트랙과 스토어 메타데이터 연결 | 폼 기본값만 준비, 외부 선언·생성 확인 대기 |
| 2 | 유료 `.com` 또는 `.org` 도메인 선택 | 정식 운영 URL 확정 | 완성 후 구매 예정 |
| 2 | DNS 담당자 | 승인 후 레코드 생성 | 확인 필요 |
| 2 | Play App Signing 앱 서명 인증서 SHA-256 | Play 설치본의 App Link 검증 | EAS 운영 keystore 지문은 확보, Play 앱 서명 지문은 앱 생성·업로드 후 확인 |
| 2 | APNs·FCM 자격 증명 | 실제 기기 푸시 토큰과 원격 알림 검증 | iOS 배포 인증서·profile·APNs·ASC API key 없음, Firebase Production 앱 미생성 |
| 2 | Google Play 비공개 테스터 12명 | 2025년 생성 개인 개발자 계정의 Production access 조건 | 14일 연속 참여자 확보 필요 |
| 2 | Play Console Android 실제 기기 검증 상태 | 신규 개인 개발자 계정의 공개 전 필수 절차 여부 확인 | 개발자 연락처 이메일·전화번호 인증은 확인, 실제 기기 인증은 확인 필요 |
| 2 | Android 개발자 인증 package 등록 | 2026-09-30 적용 전 package 소유권 등록 | 새 Play 앱 생성 시 자동 등록 예정 |
| 2 | iPhone 실기기 연결 | iOS 서명 빌드·APNs·Universal Link 검증 | 등록 기기는 있으나 현재 Mac에 미연결 |
| 3 | 최종 스토어 제출 승인 | 실제 심사 제출 권한 | 제출 직전에 별도 요청 |

## 이미 확보된 항목

- 프로젝트 요청자(쥬빌리워십 팀원)가 공식 로고와 선두교회 소개 사진의 홈페이지·앱 사용 권한을 확인
- 앱명 `쥬빌리워십`, 앱 내부 운영주체 `쥬빌리 워십`
- `Jubilee Worship` 조직의 Free `쥬빌리` Supabase 프로젝트(Seoul), 저장소 link, 동의 v5까지 원격 migration 21/21개·Edge Function 8개 적용·활성 및 fail-closed 재검증
- 원격 retention cron 활성화와 외부 push 발송 비활성(`PUSH_EXTERNAL_SEND_ENABLED=false`)
- Supabase Edge secret `TEST_PUSH_PAIRING_PEPPER` 설정(값은 문서·저장소에 미기록)
- Vercel Production 서버 전용 `SUPABASE_SECRET_KEY` 설정(값은 문서·저장소에 미기록)
- 예배 전날 19:30 KST·당일 1시간 전 리마인더, 일정 변경·취소, 송리스트 공개·변경의 네 알림 유형
- 알림은 예약 시각부터 15분 이내만 발송하고 이후 만료하는 운영 기준
- Apple 개발자 계정 유형은 개인
- Apple 개인 계정의 스토어 판매자·개발자명은 계정 소유자의 법적 이름으로 표시
- Google Play 개발자 계정은 개인 유형이며 2025년에 등록
- Apple Team ID `N84F73NX4K`, Production Bundle ID `org.sundoo.jubileeworship`
- Android Production EAS keystore와 인증서 지문(`docs/APP_LINK_ASSOCIATION.md` 참조)
- Samsung SM-G991N(Android 15) 실기기 연결 확인
- Expo/EAS `jubilee-worship` 프로젝트와 앱 연결, Preview·Production용 Supabase 공개 환경변수
- Vercel 프로젝트 연결과 기본 Production URL `https://jubilee-worship.vercel.app`
- Universal Link·App Link association 파일 Production 배포·HTTPS 응답 검증 완료(운영 서명 실기기 검증 대기)
- 알림 토큰 원문 24시간, 180일 미활동 비활성화, 비활성 정보 30일, 발송 상세기록 90일, 매일 자동 정리 기준
- 웹용 Hero, 갤러리, 영상 커버, OG, 아이콘
- 현행 운영 YouTube 채널 URL과 channel ID
- 공식 Instagram, 선두교회 소개·오시는 길 URL
- 주소, 전화, 지도 place ID

2026-08-24 기준 스토어 서명 EAS Production build는 iOS·Android 모두 0건이다. iOS `production-simulator` 검증본은 서명 IPA·TestFlight 증거가 아니다. 실제 push,
스토어 내부 테스트, 정책 공개와 최종 스토어 스크린샷도 완료되지 않았다.

`jubilee.sundoo.org`와 `worship.sundoo.org`는 등록 대상 독립 도메인이 아니라 선두교회가 생성 권한을 가진 하위 도메인 후보입니다. 현재 DNS에 생성되지 않았으므로 “사용 가능” 또는 “확정 주소”로 표시하지 않습니다.
