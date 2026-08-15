# 남은 외부 입력

개발이 끝난 뒤 실제 운영 연결에 필요한 정보만 정리한 목록입니다.

| 우선순위 | 입력 | 필요한 이유 | 현재 상태 |
|---|---|---|---|
| 1 | 최초 관리자 이메일 | 공개 가입 없이 Auth 사용자 생성 | 미제공 |
| 1 | 최초 Auth 사용자 UUID | `admin_users` owner 등록 | 계정 생성 후 확인 |
| 1 | 2026-09-04 예배 최종 확인 | 공개 직전 일정 오류 방지 | 2026-08-15 공식 Instagram·교회 페이지 재확인, 공개 직전 한 번 더 확인 필요 |
| 2 | Vercel 개발 프로젝트와 무료 주소 | 웹 관리자·개인정보 URL Preview | 미연결 |
| 2 | 유료 `.com` 또는 `.org` 도메인 선택 | 정식 운영 URL 확정 | 완성 후 구매 예정 |
| 2 | DNS 담당자 | 승인 후 레코드 생성 | 확인 필요 |
| 2 | Apple Team ID와 Android 앱 서명 인증서 SHA-256 | 공식 웹 주소의 Universal Link·App Link 검증 파일 생성 | Apple 개인 계정 준비 완료, 식별자·서명값 확인 필요 |
| 2 | APNs·FCM 자격 증명 | 실제 기기 푸시 토큰과 원격 알림 검증 | EAS 프로젝트 연결 완료, 알림 자격 증명은 미설정 |
| 2 | Google Play 비공개 테스터 12명 | 2025년 생성 개인 개발자 계정의 Production access 조건 | 14일 연속 참여자 확보 필요 |
| 2 | Play Console Android 기기·연락처 검증 상태 | 신규 개인 개발자 계정 필수 절차 여부 확인 | Console Dashboard에서 확인 필요 |
| 3 | Production 공개 승인 | 외부 공개·DNS 변경 권한 | 개발 검수 후 요청 |

## 이미 확보된 항목

- 프로젝트 요청자(쥬빌리워십 팀원)가 공식 로고와 선두교회 소개 사진의 홈페이지·앱 사용 권한을 확인
- 앱명 `쥬빌리워십`, 앱 내부 운영주체 `쥬빌리 워십`
- 문의·개인정보 이메일 `sundoojubileeworship@gmail.com`
- `Jubilee Worship` 조직의 Free `쥬빌리` Supabase 프로젝트(Seoul), 저장소 link, 원격 migration 9개, Edge Function 6개
- 원격 retention cron 활성화와 외부 push 발송 비활성(`PUSH_EXTERNAL_SEND_ENABLED=false`)
- 예배 전날 19:30 KST 및 예배 당일 1시간 전 알림 일정
- 알림은 예약 시각부터 15분 이내만 발송하고 이후 만료하는 운영 기준
- Apple 개발자 계정 유형은 개인
- Apple 개인 계정의 스토어 판매자·개발자명은 계정 소유자의 법적 이름으로 표시
- Google Play 개발자 계정은 개인 유형이며 2025년에 등록
- Apple·Google 개발자 계정과 iOS·Android 실제 테스트 기기 준비
- Expo/EAS `jubilee-worship` 프로젝트와 앱 연결, Preview·Production용 Supabase 공개 환경변수
- 알림 토큰 원문 24시간, 180일 미활동 비활성화, 비활성 정보 30일, 발송 상세기록 90일, 매일 자동 정리 기준
- 웹용 Hero, 갤러리, 영상 커버, OG, 아이콘
- 현행 운영 YouTube 채널 URL과 channel ID
- 공식 Instagram, 선두교회 소개·오시는 길 URL
- 주소, 전화, 지도 place ID

`jubilee.sundoo.org`와 `worship.sundoo.org`는 등록 대상 독립 도메인이 아니라 선두교회가 생성 권한을 가진 하위 도메인 후보입니다. 현재 DNS에 생성되지 않았으므로 “사용 가능” 또는 “확정 주소”로 표시하지 않습니다.
