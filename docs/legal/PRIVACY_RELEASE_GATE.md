# 쥬빌리워십 앱 개인정보·약관 제출 전 확인서

- 기준일: 2026-08-23
- 대상: iOS·Android 앱, 공개 홈페이지 개인정보·지원 페이지, 법적 문서 공개 흐름
- 상태: **제출·공개 불가 — 법적 처리자와 국외 처리 등 필수값 미확정**
- 작업 경계: 현재 저장소의 코드와 문서만 점검했으며 원격 DB 변경, 배포, 정책 공개, 스토어 입력은 수행하지 않았다.

이 문서는 현재 구현과 정책 초안을 맞추기 위한 기술·운영 점검서이다. 법률 자문을 대신하지 않으며, 개인정보 처리자가 사실관계를 확정하고 필요한 경우 한국 개인정보 분야 법률 전문가의 검토를 받아야 한다.

## 1. 결론

현재 앱의 데이터 흐름, 정책 초안, 공개 차단 장치는 대체로 연결되어 있다. 다만 개인정보 처리자의 법적 명칭·담당자·전화번호, 최종 지원 이메일 공급자·주소·운영 증빙, 공급자별 계약과 국외 이전 근거, 일반 접속 로그의 처리 근거·보유기간, 만 14세 확인 방식이 확정되지 않았다. 따라서 다음 행위는 아직 하면 안 된다.

1. 관리자에서 개인정보 처리방침을 공개본으로 승인
2. 알림 등록 기능 활성화
3. https://jubilee-worship.vercel.app/privacy 를 스토어 개인정보 URL로 입력
4. App Store Connect App Privacy 또는 Google Play Data safety 답변 확정
5. iOS·Android 심사 제출

## 2. 실제 구현 기준 데이터 지도

| 처리 구간 | 실제 항목과 목적 | 저장·전송 | 현재 확인 상태 |
| --- | --- | --- | --- |
| 공개 콘텐츠 조회 | 예배 일정·공지·미디어·안내·공개 법적 문서를 조회한다. 통신 과정에서 IP, User-Agent, 요청 시각·경로·상태코드 등 API·보안 로그가 생길 수 있다. | Supabase Data API, 주 DB는 Seoul ap-northeast-2 | 실제 로그 항목·마스킹·보유기간·법적 근거 미확정 |
| 선택형 푸시 등록 | 무작위 설치 ID, 한 단계 더 해시한 설치 검증값, Expo 푸시 토큰·해시, 플랫폼, 앱 버전·구분, 알림 선택, 동의 버전·해시·언어·시각, 만 14세 이상 확인, 연결·발송·오류 상태 | Supabase와 Expo를 거쳐 Apple 또는 Google로 전송 | 알림 동의 후에만 등록하고 철회 경로가 구현됨. 공급자별 계약·국외 이전 근거는 미확정 |
| 종교 관련 알림 선택 | 예배·일정·송리스트 선택은 종교적 관심을 추론할 수 있으므로 민감정보로 보수적으로 취급한다. | 설치 ID와 연결되어 서버에 저장 | 별도 동의 화면은 구현됨. 민감정보 동의와 국외 이전을 한 동의 화면에서 처리하는 방식의 법률 검토 필요 |
| 남용 방지 | 요청 출처 IP를 서버 비밀키 기반 HMAC 가명값으로 바꿔 분당·일일 요청 제한에 사용한다. | 일반 창은 마지막 창 시작 후 5분과 정리 지연, 일일 창은 약 25시간 5분 뒤 삭제 | 코드·DB 기준은 반영됨. 실제 운영 로그·최초 만료 데이터 삭제 증거 확인 필요 |
| 기기 보안저장소 | 설치 비밀값 원문, 동의 기록, 철회·재설치 복구 대기 상태 | 기기 안에 저장 | 서버에는 설치 비밀값 원문을 저장하지 않음. iOS·Android 백업·앱 삭제·재설치 시 실제 잔존 동작 확인 필요 |
| 기기 일반 저장소 | 수신 알림 식별값·제목·본문·수신 시각·앱 연결 경로, 알림 선택·읽음 상태, 화면 모드, 공개 콘텐츠 캐시 | 수신 알림은 최대 50건·90일, 서버 재전송 없음 | 알림함 개별·전체 삭제 UI는 현재 없음. 제출 전 유지 여부 결정 필요 |
| 지원 이메일 | 발신 이메일·표시 이름, 문의 내용, 기기·OS·앱 버전·발생 시각, 자발적 첨부파일 | 현재 표시된 Gmail 주소는 후보·임시 채널이며 최종 공급자·주소가 아님 | 90일 삭제 기준만 설정됨. 공급자·확정 주소·계약·역할·처리 국가·관리 설정·삭제 운영 증빙 미확정 |
| 공개 홈페이지 | Vercel 접속 로그가 처리될 수 있다. YouTube는 사용자가 재생을 선택할 때만 youtube-nocookie 도메인을 불러온다. 외부 SNS·지도 링크는 선택 시 이동한다. | Vercel과 사용자가 선택한 외부 서비스 | 실제 Vercel 플랜·로그 보유·DPA 적용 범위 미확정 |
| 사용하지 않는 항목 | 일반 이용자 계정, 결제, 이용자 게시물, 광고 SDK, 마케팅 분석, 위치·카메라·마이크, 광고 식별자 | 해당 없음 | 저장소 기준 확인. 제출 빌드의 네이티브 권한·SDK 목록과 다시 대조해야 함 |

## 3. 법적 문서와 공개 차단 흐름

현재 흐름은 다음과 같다.

1. editor 또는 owner가 legal_documents에 초안을 저장한다.
2. owner만 공개 RPC를 실행할 수 있다.
3. 웹 공개 액션은 [[오너 확인 필요]] 표식, 운영주체·문의처 누락, 필수 알림 공개 항목 누락, 비어 있거나 미정인 운영값을 차단한다.
4. 공개 시 같은 문서 종류의 기존 공개본은 철회되고, public_legal_documents 뷰에는 현재 시행 중인 공개본만 노출된다.
5. 웹 /privacy와 모바일 앱은 공개본이 store-ready 검사를 통과할 때만 앱 정책으로 표시한다.
6. 알림 등록은 정책 공개 여부와 별도의 registration_enabled 게이트를 모두 통과해야 한다.

이 구조는 실수로 초안을 공개하거나 정책 없이 알림을 등록하는 위험을 낮춘다. 다만 문구 포함 여부와 항목값 형식을 검사하는 장치일 뿐, 공급자 계약·법적 근거·연락처의 진실성이나 법률 적합성을 자동 검증하지 않는다. owner의 증빙 확인과 법률 검토를 생략할 수 없다.

법적 문서 gate는 신규 비파괴 전진형 migration 3개(`20260823130815`, `20260823132500`, `20260823143000`)로 공급자 중립화, 웹·DB 필수문구·운영라벨 parity, 필드별 형식 검증, 앱·DB 연락처 exact lock을 반영했다. 로컬에서 migration 18개 전체 reset, pgTAP 720/720, DB lint 0건을 통과했다. 다만 이 3개는 원격 Supabase에 아직 적용하지 않았으므로, 원격 반영과 migration 이력·직접 공개 RPC·runtime·알림 등록 fail-closed 재검증 전에는 정책을 공개하거나 알림 등록을 활성화하면 안 된다.

## 4. 이번 초안에 반영한 사항

개인정보 처리방침 초안에는 다음 내용을 보완했다.

- 공개 콘텐츠 조회 시 발생할 수 있는 API·보안 로그와 미확정 법적 근거·보유기간
- 알림 처리의 개인정보 보호법 제15조 및 민감정보 제23조 동의 근거 초안
- 기기 안에 저장되는 받은 알림 내역 최대 50건·90일과 서버 재전송 없음
- Supabase 계약 주체를 싱가포르 법인으로 단정하던 문구 제거
- 공급자별 수신자 연락처와 실제 계약·재위탁 구조 확인 게이트
- 권리행사 접수·본인 확인·처리 방법, 지원 문의 법적 근거 확인 게이트
- 제3자 독립 목적 제공 없음, 자동화된 결정·광고·추적·프로파일링 없음
- 권익침해 구제기관

이용약관 초안에는 법적 서비스 제공자·주소·전화번호 확인 게이트, 계정·결제·이용자 게시물 미제공, 알림과 외부 서비스, 콘텐츠 권리, 개인정보 처리방침과 이용 종료 방법을 보완했다.

## 5. 제출 전 반드시 받아야 할 확정값과 증빙

다음 값은 추측하거나 쥬빌리 워십이라는 표시명만으로 대체하면 안 된다.

1. 개인정보 처리자·서비스 제공자의 정확한 법적 성명 또는 단체 명칭
2. 위 명칭이 Apple 개발자 판매자명과 Google Play 개발자 표시·연락정보에 어떻게 대응하는지
3. 개인정보 보호책임자 또는 고충처리 담당부서·담당자
4. 국내에서 실제 응대 가능한 전화번호와 확정 지원 이메일
5. 최종 지원 이메일 공급자·확정 주소·계정 관리자, 적용 계약·처리자 역할, 2단계 인증·접근권한·90일 삭제 절차와 실행 증거, 처리 국가
   - 주소 확정 시 `packages/domain` 상수, 잠긴 `site_settings(id=1).contact_email` corrective migration, 웹·앱 지원/개인정보 표시, 정책·약관 템플릿·공개본, App Store·Google Play 메타데이터를 동일한 확정값으로 한 번에 변경한다.
6. 실제 Supabase 계정에 적용되는 계약 당사자, DPA·하위처리자, 지원 접근 국가·연락 경로, API·보안 로그 항목과 보유기간
7. Expo·Apple·Google의 실제 수신자 명칭·연락 경로, 이전 국가, 이전 항목·시점·방법·보유기간
8. 개인정보 보호법 제28조의8에 따른 공급자별 국외 이전 법적 근거와 거부 방법·효과
9. 공개 콘텐츠·보안 로그와 지원 문의 처리의 법적 근거·보유기간
10. 기기 저장 자료의 삭제 방법, iOS·Android 백업·앱 삭제·재설치 결과, 알림함 삭제 UI 유지 여부
11. 만 14세 이상 자기확인만으로 제한하는 방식의 충분성, 스토어 대상 연령과의 정합성
12. 민감정보 별도 동의와 국외 이전 동의를 하나의 화면·체크박스로 받는 방식의 적법성
13. 실제 시행일, owner 사실확인 기록, 법률 전문가 검토 상태

## 6. 스토어 개인정보 답변 준비안

이 항목은 콘솔에 바로 입력할 확정 답변이 아니다. 제출할 정확한 바이너리, 공급자 SDK·계약, 최신 콘솔 문항을 함께 열어 최종 확정한다.

### Apple App Privacy

- 앱과 제3자 파트너가 푸시 토큰, 설치 ID, 알림 선택을 기기 밖으로 전송하고 보관하므로 “수집하지 않음”으로 답하면 안 된다.
- 우선 검토 데이터 유형: Identifiers > Device ID, Sensitive Info. 종교적 관심을 추론할 수 있는 알림 선택 때문에 Sensitive Info를 제외하려면 명확한 근거가 필요하다.
- 목적 우선안: App Functionality. 광고, 타사 광고, 마케팅, 추적 목적은 현재 구현에서 확인되지 않았다.
- Apple은 데이터가 계정뿐 아니라 기기 또는 다른 정보로 연결되는지도 묻는다. 알림 선택이 설치 ID·푸시 토큰에 연결되므로 “Data Not Linked to You”를 자동 선택하면 안 된다.
- 앱에 포함한 모든 제3자 파트너의 처리도 함께 답해야 한다.

### Google Play Data safety

- 우선 검토 데이터 유형: Device or other IDs, Personal info > Political or religious beliefs.
- 수집은 알림을 선택한 사용자에게만 발생하므로 optional 후보이며 목적은 App functionality와 Developer communications 후보이다.
- Supabase, Expo, Apple, Google이 정책상 service provider에 해당하는지와 “shared” 예외 적용 여부는 실제 계약과 Google의 최신 정의로 판단한다.
- 모든 전송 구간의 HTTPS 적용, 앱 안의 철회·삭제 요청 경로, 지원 이메일 삭제 요청 경로를 실제 빌드에서 검증한다.
- 일반 이용자 계정 생성 기능이 없으므로 Google의 계정 삭제 URL 의무는 현재 구조에는 직접 적용되지 않는 것으로 보인다. Data safety의 일반 데이터 삭제 문항과 요청 경로는 별도로 답해야 한다.

## 7. 공개·제출 순서

1. 제5항의 값과 공급자 증빙을 owner가 확정한다.
2. 법률 전문가가 민감정보·만 14세·국외 이전·지원 이메일 근거를 검토한다.
3. 개인정보 처리방침과 약관의 모든 [[오너 확인 필요]] 값을 실제 값으로 교체하고, 후보·임시·미확정·공개 금지·미래형 계약·법률검토 문구를 확정된 공급자·주소·운영 증빙 설명으로 교체한다. 최종 문의 이메일은 앱 상수·잠긴 DB 설정·웹·앱·스토어 표시값을 대소문자까지 일치시킨다.
4. 정책 단위 테스트, 웹 lint·typecheck·build, 모바일 lint·typecheck·테스트를 통과시킨다.
5. 실제 운영 환경의 로그 마스킹·보유 설정과 만료 데이터 삭제를 확인한다.
6. owner가 정책 공개를 승인한다.
7. 공개 /privacy가 HTTP 200, 인증·지역 제한 없음, HTML 페이지, 정확한 앱명·처리자·문의처·시행일·철회 방법 표시, placeholder 없음 상태인지 확인한다.
8. 모바일 앱에서 안내 → 개인정보 처리방침 접근과 알림 동의·철회·재시도를 iOS·Android 실기기에서 확인한다.
9. 알림 등록을 제한된 시험 구간에서만 활성화하고 APNs·FCM 실제 발송·철회 후 미발송·토큰 무효화·삭제를 확인한다.
10. 같은 최종 빌드를 기준으로 Apple App Privacy와 Google Data safety 답변을 확정한다.
11. 사용자의 제출 승인 후에만 각 스토어에 제출한다.

## 8. 공식 1차 출처

### 대한민국

- 개인정보보호위원회, 개인정보 처리방침 작성지침 2026.4: https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=&nttId=12018
- 개인정보 보호법 제30조 개인정보 처리방침: https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1020398435
- 개인정보 보호법 제23조 민감정보: https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1032057123
- 개인정보 보호법 제22조의2 만 14세 미만 아동: https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029334761
- 개인정보 보호법 제28조의8 국외 이전: https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1033215841
- 개인정보 보호법 시행령 제31조 처리방침 내용·공개: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=900079801

### Apple·Google

- Apple App Review Guidelines 5.1 Privacy: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple App Store Connect 개인정보 관리: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Google Play User Data 정책: https://support.google.com/googleplay/android-developer/answer/10144311?hl=en
- Google Play Data safety 작성 지침: https://support.google.com/googleplay/android-developer/answer/10787469?hl=en
- Google Play 앱 계정 삭제 요건: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en

### 처리 공급자

- Supabase 리전: https://supabase.com/docs/guides/platform/regions
- Supabase 공개 다운로드 DPA(2023-12-11 자료이며 실제 계정의 최신 계약 우선): https://supabase.com/downloads/docs/Supabase%2BDPA%2B231211.pdf
- Expo 개인정보 처리방침: https://expo.dev/privacy
- Expo 하위처리자 목록: https://expo.dev/privacy/subprocessors
- Expo Push FAQ: https://docs.expo.dev/push-notifications/faq/
- Vercel DPA: https://vercel.com/legal/dpa
