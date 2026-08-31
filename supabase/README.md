# 쥬빌리워십 Supabase 운영·부트스트랩

기준일: 2026-08-20 (Asia/Seoul)

이 디렉터리는 로컬·검수 환경을 재현하고, 검증된 migration만 원격 환경에 적용하기 위한 기준이다. `reference/`의 SQL은 참고 초안이며 배포 대상으로 사용하지 않는다.

## 1. 구현된 보안 경계

- 공개 앱의 표준 읽기 대상은 다음 `security_invoker` DTO view 열 개다.
  - `public_site_settings`
  - `public_events`
  - `public_announcements`
  - `public_media_items`
  - `public_team_members`
  - `public_event_setlists`
  - `public_setlist_items`
  - `public_gallery_items`
  - `public_guide_sections`
  - `public_legal_documents`
- DTO에는 `contact_email`, 감사·승인 UUID, 초안·검수 요청 정보와 내부 검증 상태를 포함하지 않는다.
- `anon`과 `authenticated`에는 원본 테이블의 table-level `SELECT`를 부여하지 않는다.
- PostgreSQL의 `security_invoker` view는 호출자의 원본 열 권한을 요구하므로, view가 사용하는 공개 열에만 column-level `SELECT`가 있다. 따라서 애플리케이션은 원본 테이블의 공개 열을 직접 조회하지 말고 DTO view만 사용한다.
- 원본 테이블의 감사 열은 trigger가 `auth.uid()`로 강제 기록하며 클라이언트 역할은 직접 쓰거나 읽지 못한다.
- 설교와 송리스트는 개정본 단위로 `draft → review_requested → published → withdrawn` 상태를 사용한다. editor는 초안 저장·검수 요청만 가능하고, owner 전용 RPC만 공개·교체·철회·초안 반려를 수행한다.
- 송리스트의 전체 재생목록과 곡별 YouTube 링크는 owner가 각각 검증 RPC를 실행해야 공개할 수 있다. URL 변경 시 검증 기록은 자동 초기화된다. `is_changed`는 초안 개정 번호가 아니라 실제 공개 순번으로 계산한다.
- 갤러리와 안내의 `published` 열은 직접 쓸 수 없다. owner 전용 RPC만 공개 상태를 바꾸며, 갤러리는 인물·사용 동의 확인 기록이 없으면 공개가 거부된다.
- 개인정보 처리방침·이용약관은 `draft → published → withdrawn` 버전으로 관리하며 owner 공개 RPC가 기존 공개본 철회와 새 공개본 교체를 한 트랜잭션에서 처리한다.
- 앱 설치, 알림 선택, Expo token, 캠페인·outbox·delivery는 `private` schema에만 있고 `anon`/`authenticated`의 직접 table 권한은 없다. 설치 비밀값 `S`는 앱이 비동기 안전 난수로 만들어 SecureStore에만 보관한다. 등록은 `H2=SHA256(SHA256(S))`, 후속 요청은 `V=SHA256(S)`를 사용하고 DB는 `SHA256(V)=H2`를 비교한다.
- 캠페인은 editor가 초안을 만들 수 있지만 owner만 승인·queue할 수 있다. 캠페인과 outbox 양쪽의 dedupe key가 중복 작업을 차단한다.
- 새 개정본을 편집하거나 검수하는 동안 기존 공개본은 그대로 유지된다. 설교 주제·말씀 구절은 함께 승인되며, 빈 송리스트는 검수 요청할 수 없다.
- 공지는 `published`, `starts_at`, `expires_at`을 RLS와 DTO view 양쪽에서 확인한다.
- 공개 미디어는 검토된 YouTube 영상만 허용한다. Instagram, 내부 이미지, YouTube playlist와 미등록 영상은 DB 제약·RLS·DTO view에서 공개할 수 없다.
- YouTube 채널 허용 목록과 별도로 private 영상 허용 목록이 영상 ID를 현재 채널 `UCxmosyyztNo7HBUOdN_gy9w`에 결합한다. canonical watch URL과 등록 ID가 일치할 때만 trigger가 채널 ID와 `verified`를 직접 설정한다.
- 미등록 YouTube 영상은 canonical watch URL로만 `pending`, `published=false` 상태를 유지할 수 있다. 클라이언트는 채널 ID나 검증 상태를 직접 쓸 수 없다.
- 팀 공개 범위는 `published=true`인 `minister`만이다. 다른 직군은 관리자용 draft로만 보존할 수 있다.
- 공식 단체명, SNS·YouTube, 교회 URL·주소·전화·연락처·지도 값은 migration 소유 잠금 필드다. 관리자는 문구·이미지 경로·SEO 필드만 수정할 수 있다.
- `public-media`는 공개 읽기 bucket이다. 앱 갤러리 전용 `app-gallery/` 쓰기·삭제만 owner로 제한하고 기존 웹사이트용 `gallery/`는 active editor 권한을 유지한다. editor의 앱 갤러리 원본은 비공개 `gallery-staging`에 올린 뒤 owner가 동의 확인 후 신뢰할 수 있는 Storage API로 공개 경로에 이동한다. 최대 10 MiB, JPEG·PNG·WebP·AVIF만 허용하며 SVG는 금지한다.

## 2. 로컬 실행

필수 조건:

- Supabase CLI 2.109.0 이상
- Docker 호환 런타임
- 포트 `55320`~`55329` 및 `8183` 사용 가능

실행:

```bash
supabase start
supabase db reset --local --no-seed
supabase test db --local
supabase db reset --local
supabase test db --local
supabase db lint --local --schema public,private --level warning --fail-on error
supabase db advisors --local --type security --level warn --fail-on error
supabase db advisors --local --type performance --level warn --fail-on error
supabase migration list --local
```

첫 번째 reset/test 조합은 production과 같은 migration-only 부트스트랩을 검증한다. 두 번째 조합은 로컬 `seed.sql`의 멱등성까지 검증한다. `db reset`은 로컬 DB를 지우므로 원격 프로젝트에는 `db reset --linked`를 사용하지 않는다.

로컬 URL:

- API: `http://127.0.0.1:55321`
- DB: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`
- Studio: `http://127.0.0.1:55323`
- Mailpit: `http://127.0.0.1:55324`

로컬 키는 `supabase status`로 확인한다. 출력된 secret/service role 키를 코드, 문서, 로그 또는 Git에 저장하지 않는다.

## 3. 첫 관리자 생성

공개 회원가입은 로컬 설정의 전역 `auth.enable_signup=false`로 비활성화되어 있다. 기존 관리자가 이메일·비밀번호로 로그인할 수 있도록 이메일 공급자 자체는 `auth.email.enable_signup=true`로 유지한다. 호스팅 프로젝트에서도 이메일 공급자는 활성화하고 신규 가입만 별도로 비활성화해야 한다.

1. Supabase Dashboard의 Auth 관리 화면에서 관리자 이메일 사용자를 수동 생성한다.
2. 이메일 소유와 강한 비밀번호 사용을 확인한다.
3. 생성된 실제 `auth.users.id`를 확인한다.
4. SQL Editor에서 다음 문장을 실제 UUID로 한 번만 실행한다.

```sql
insert into public.admin_users (user_id, role, is_active)
values ('실제-auth-user-uuid'::uuid, 'owner', true)
on conflict (user_id) do update
set role = excluded.role,
    is_active = excluded.is_active;
```

최초 owner 이후의 관리자는 owner가 서버에서 Auth Admin API `inviteUserByEmail()`을 호출해 Auth UUID를 받은 뒤 다음 RPC로 승인한다. 이메일은 `admin_users`에 복제하지 않는다.

```sql
select public.approve_admin_user('초대-응답-auth-user-uuid'::uuid);
select public.set_admin_user_role('auth-user-uuid'::uuid, 'owner');
select public.set_admin_user_active('auth-user-uuid'::uuid, false);
```

관리자를 비활성화할 때는 다음 순서를 사용한다.

1. owner 세션으로 `set_admin_user_active(user_id, false)`를 호출한다. 기존 access JWT가 남아 있어도 모든 관리자 RLS/RPC는 즉시 차단된다.
2. 서버 전용 Auth Admin API `updateUserById(user_id, { ban_duration: '876000h' })`로 이후 로그인·refresh를 차단한다.
3. 재활성화는 Auth Admin API에서 `{ ban_duration: 'none' }`을 먼저 적용한 뒤 DB RPC로 `is_active=true`를 복원한다.

UUID만으로 다른 사용자의 access JWT를 즉시 폐기하는 `auth.admin.signOut()` 계약은 없으므로 `auth.sessions`를 직접 삭제하지 않는다. 현재 access JWT 만료는 1시간이지만 DB의 `is_active` gate가 권한을 즉시 제거한다. 마지막 활성 owner 강등과 owner 본인 비활성화는 DB RPC가 거부한다.

사용자 이메일·UUID를 migration이나 seed에 넣지 않는다. `user_metadata`는 권한 판단에 사용하지 않는다.

## 4. YouTube 승인 절차

DB의 `verified` 값은 외부 채널 소유 확인을 대신하지 않는다. 관리자 브라우저가 보낸 채널 ID나 상태는 신뢰하지 않으며, 승인 담당자가 외부 근거를 확인한 뒤 private 영상 허용 목록을 migration으로 갱신한다.

1. URL에서 video ID를 추출하고 형식을 검증한다.
2. YouTube의 공식 조회 결과와 운영 채널 `https://www.youtube.com/@JUBILEEWORSHIP-25`을 대조하고, 확인 근거·확인자를 변경 검토 기록에 남긴다.
3. 확인된 video ID와 공식 channel ID의 결합을 새 migration의 `private.youtube_video_allowlist`에 추가한다.
4. media row에는 `https://www.youtube.com/watch?v={video_id}` 형식의 URL과 video ID만 저장한다. `youtube_channel_id`, `verification_status`는 payload에 포함하지 않는다.
5. DB trigger가 허용 목록을 조회해 채널 ID, 검증 상태·시각·확인자를 파생한다. 미등록 영상은 draft만 허용한다.
6. 영상 URL 또는 video ID를 바꾸면 새 결합을 별도로 검증한다.

현재 허용된 영상은 `E5mD29x_-dM`, `O2mNdkl5q54` 두 개다. 허용 목록 변경은 관리자 UI가 아니라 검토된 migration으로만 배포한다.

## 5. 운영 기본 콘텐츠와 변경 경계

production에서 seed를 실행하지 않아도 migration만으로 다음 공식 기준행을 생성한다.

- `site_settings(id=1)`
- 2026-09-04 쥬빌리워십 찬양집회
- 허용 영상 `E5mD29x_-dM`
- 교역자 김두진, 최희락, 조예희

모든 bootstrap insert는 `on conflict do nothing`이므로 기존 운영자가 수정한 동일 식별자의 행을 덮어쓰지 않는다.

배포 승인 직전에 2026-09-04 집회의 일시·상태·출처 URL이 여전히 유효한지 공식 채널에서 재확인한다. 변경 또는 취소가 확인되면 production push 전에 후속 corrective migration을 추가하고, 미확인 상태에서는 행을 비공개로 전환한다.

잠금 필드를 변경해야 할 때는 관리자 UI나 Data API를 우회하지 말고, 근거와 승인 이력이 포함된 별도 migration을 사용한다. 관리자 UI의 설정 payload는 다음 편집 가능 범위만 전송해야 한다.

```text
eyebrow
hero_title, hero_description, hero_media_path, hero_media_mobile_path, hero_media_alt
about_title, about_body, about_media_path, about_media_alt
worship_media_path, worship_media_alt
visit_media_path, visit_media_alt
og_media_path, logo_primary_path, logo_inverse_path
seo_title, seo_description
```

### 설교·송리스트 승인 순서

1. editor 또는 owner가 `event_sermon_revisions`/`event_setlists`에 새 draft를 만든다. `revision_no`와 감사 필드는 DB가 생성한다.
2. draft 내용과 `setlist_items`만 직접 수정한다. 설교는 두 필드가 모두 있어야 하고 송리스트는 한 곡 이상 있어야 검수를 요청할 수 있다.
3. 활성 관리자가 `request_event_sermon_review` 또는 `request_event_setlist_review` RPC를 호출한다. 검수 요청 후에는 해당 개정본이 잠긴다.
4. owner가 수정이 필요하다고 판단하면 `return_event_sermon_revision_to_draft` 또는 `return_event_setlist_revision_to_draft` RPC로 반려한다.
5. 송리스트에 URL이 있으면 owner가 `verify_event_setlist_playlist`와 곡별 `verify_setlist_item_youtube` RPC를 먼저 호출한다.
6. owner가 `publish_event_sermon_revision` 또는 `publish_event_setlist_revision` RPC를 호출하면 기존 공개본을 철회하고 새 공개본으로 원자적으로 교체한다.
7. 공개를 중단할 때는 owner가 `withdraw_event_sermon_revision` 또는 `withdraw_event_setlist_revision` RPC를 호출한다.

상태·개정 번호·검수·공개·철회·감사 열은 클라이언트 payload에 포함하지 않는다. RPC는 모두 로그인한 `authenticated` 역할에만 노출되며, 함수 내부에서 활성 관리자 또는 활성 owner를 다시 확인한다.

## 6. Storage 운영

허용 최상위 경로:

```text
brand/
hero/
gallery/
app-gallery/
team/
og/
```

- 임의 원본 파일명 대신 충돌 없는 랜덤 파일명을 사용한다.
- 브라우저는 업로드 전 파일 크기, MIME, 출처·권리·EXIF·인물 동의 확인을 검사한다.
- Supabase Storage는 세션과 RLS로 활성 관리자인지 확인하고, bucket 설정으로 10 MiB·MIME 제한을 강제한다.
- SVG는 정식 로고라도 이 bucket에 업로드하지 않는다. 검수된 래스터 로고를 사용한다.
- 공개 bucket의 URL을 가진 사람은 파일을 읽을 수 있으므로 editor는 갤러리 초안을 `gallery-staging`에만 업로드한다.
- owner 동의가 기록된 `gallery-staging` locator는 editor가 같은 경로의 객체를 삽입·교체·삭제할 수 없다. 변경이 필요하면 owner가 먼저 동의를 해제해야 한다.
- owner 서버 작업은 Storage API로 staging 객체를 `public-media/app-gallery/`에 복사·이동하고 공개 locator로 DB 행을 갱신한다. locator 변경은 이전 동의와 공개 상태를 자동 해제하므로, 이후 `set_gallery_item_consent(..., true)`와 `set_gallery_item_published(..., true)`를 순서대로 호출한다. DB의 `storage.objects` 행을 직접 이동하지 않는다.
- 앱 갤러리 공개 RPC는 `storage://` locator 중 `storage://public-media/app-gallery/`만 허용한다. editor가 쓸 수 있는 기존 웹 `gallery/` 또는 비공개 staging locator를 직접 공개할 수 없다.
- 동의 철회 또는 원본 회수는 `set_gallery_item_published(..., false)`로 앱 목록을 먼저 차단하고, 서버 전용 Storage API로 `app-gallery/` 객체를 `gallery-staging`으로 이동한 뒤 DB locator를 갱신한다. `set_gallery_item_consent(..., false)`만으로 이미 공개된 Storage 객체나 CDN 캐시가 회수되지는 않는다.
- DB 레코드를 직접 수정해 파일을 삭제하지 말고 Storage API를 사용한다.

## 7. 법적 문서·알림 호출 계약

법적 문서는 editor가 `legal_documents(document_type, version, title, body, effective_on)` 초안을 작성하고 owner가 아래 RPC를 호출한다. 시행일이 미래인 문서는 현재 공개본을 끊지 않도록 공개 RPC가 거부한다.

```text
publish_legal_document(target_document_id bigint) -> void
withdraw_legal_document(target_document_id bigint) -> void
```

`publish_legal_document`는 웹 화면을 우회한 직접 호출에도 동일한 공개 gate를 적용한다. 개인정보처리방침은 앱 코드의 필수 고지 50개·금지 문구 8개와 운영 라벨 30개를 DB 공통 헬퍼로 동일하게 검증하고, 약관은 운영 라벨 6개를 검증한다. 보유·삭제·국외 처리 항목 외에 개인정보 처리자, 보호책임자 또는 고충처리 부서·전화, 지원 이메일 공급자와 확정 주소·법적 역할·처리 국가·보유/삭제 운영 증빙, 만 14세 절차, 실제 시행일, 오너 사실확인과 법률 전문가 검토 상태까지 라벨별 실제 값이 필요하다. 정책·약관의 문의 이메일은 잠긴 `public.site_settings(id=1).contact_email`과 대소문자까지 일치해야 한다. 최종 주소 변경은 앱 `SITE.contact_email`, 잠긴 DB corrective migration, 웹·앱 표시, 법적 문서·스토어 메타데이터를 함께 변경한다. 특정 이메일 공급자 이름은 강제하지 않지만, 후보·임시·최종 미확정·공개 금지·미래형 계약·법률검토 문구가 남아 있으면 공개와 알림 등록을 모두 차단한다. 이용약관은 서비스 제공자의 법적 명칭·주소·전화번호도 필수로 확인한다. `미정`·`추후`, marker, `확인 필요`·`검토 예정` 같은 명시적 미해결 표현, `확인`·`검토`·`확정`·`완료`·`입력`·`기입`·`작성`만으로 된 값과 `N/A:`·`NA.`·공백 변형 `해당 없음`은 공개할 수 없다. 실제 절차를 설명하는 장문 안의 정상 단어는 허용한다.

앱은 첫 알림을 켜기 전에 운영체제 알림 권한과 구분된 `민감정보(종교적 관심) 알림 처리 별도 동의` 화면을 보여준다. 목적·항목·보유기간·거부 효과·철회·국외 처리 요약과 개인정보처리방침 링크를 먼저 제공하고, `만 14세 이상입니다` 확인과 별도 동의를 모두 완료해야만 토큰을 요청한다. 생년월일은 수집하지 않으며, 만 14세 미만은 알림 기능만 사용할 수 없고 앱의 다른 기능은 그대로 이용할 수 있다. 동의 버전·고지문 SHA-256·언어·14세 이상 확인을 기기에 함께 저장하고 서버는 확인 시각을 생성한다. 문구가 바뀌면 배포 전에 버전을 올리고 DB 상수와 테스트를 함께 갱신한다.

앱의 등록·변경·철회는 hosted Edge Function 본문을 거치지 않고 publishable key의 `apikey`로 Supabase Data API의 좁은 `anon` RPC를 직접 호출한다.

```text
POST /rest/v1/rpc/notification_register_v2
body: installation UUID, H2, pairing capability hash, platform, app/build version,
      app variant, consent version/disclosure digest/locale, 14+ affirmation,
      three choices
header: x-jubilee-expo-push-token
-> 200 { "status": "ok" } | 200 { "status": "error", "code": "..." }

POST /rest/v1/rpc/notification_update_v2
body: installation UUID, pairing capability hash, app/build version, app variant,
      consent version/disclosure digest/locale, 14+ affirmation, three choices
header: x-jubilee-installation-proof=V, optional x-jubilee-expo-push-token
-> same typed result

POST /rest/v1/rpc/notification_unregister_v2
body: installation UUID, app variant
header: x-jubilee-installation-proof=V
-> same typed result
```

`notification_register_v2`와 `notification_update_v2`는 모두 등록 중단
스위치가 켜져 있고 현재 store-ready 개인정보처리방침이 공개된 경우에만
설치정보·토큰·알림 선택을 변경한다. 어느 조건이든 충족하지 않으면 상태를
변경하지 않고 `REGISTRATION_DISABLED`를 반환한다. 동의 철회를 막지 않도록
`notification_unregister_v2`는 이 두 gate와 무관하게 계속 허용한다.

DB wrapper는 검증·인증·중복 실패를 typed result로 반환해 외부 정보를 노출하지 않으면서, 실패 요청의 분산 rate-limit 카운터도 같은 transaction에 commit한다. proxy가 제어하는 `cf-connecting-ip`가 없으면 하나의 `unknown` bucket으로 fail closed하고, 원문 IP는 저장하지 않으며 project-scoped 비밀키로 HMAC한 가명 검증값만 사용한다. 일반 호출은 출처·전역·installation별 1분 제한을 적용하고, 신규 등록은 같은 출처 하루 100회·서비스 전체 하루 500회로 추가 제한한다. 1분 행은 마지막으로 시작된 제한 창에서 추가 요청이 없으면 창 시작 5분 후, 일일 행은 창 시작 25시간 후 만료하며 각각 5분 cron 지연 뒤 삭제된다. 요청이 계속되면 다음 제한 창으로 갱신될 수 있다. private 등록 중단 스위치는 신규 설치 생성을 즉시 fail closed한다. malformed URL/body로 RPC 선택 자체가 실패하는 요청과 분산 공격은 DB 함수가 실행되지 않으므로 운영 gateway/WAF 경계에서 별도로 제한하고 사용량·차단량 alert를 설정해야 한다.

이전 Edge mutation 경로 `register-installation`, `update-notification-settings`, `unregister-installation`은 요청 본문을 파싱하지 않고 HTTP 410을 반환한다. 운영 배포는 Data API custom header가 API/Postgres log에 남지 않는지 확인하고, 외부 호출자가 주입한 `cf-connecting-ip`·`x-forwarded-for`가 제한 bucket을 선택하지 못하며 Supabase proxy의 실제 출처값이 일관되게 주입되는지를 비운영 canary로 입증할 때까지 진행하지 않는다.

시험 기기 연결은 공개 등록과 분리한다. `development|preview` 앱은 master `V`가 아닌 domain-separated `C=SHA256("jubilee:test-pairing:v1\n"+S)`만 `create-test-push-pairing` Edge Function에 보낸다. DB는 `SHA256(C)`를 맞추며 `C`는 등록 변경·철회에 재사용할 수 없다. Edge Function이 12자리 Crockford 코드를 생성하고 서버 전용 `TEST_PUSH_PAIRING_PEPPER`로 HMAC-SHA256 digest를 계산한다. DB에는 10분 동안 digest만 저장하고 raw 코드는 앱에 한 번만 반환한다. 발급은 endpoint별 30초 cooldown·시간당 10회 제한이며, 새 발급·승인·만료 시 이전 digest를 즉시 제거한다.

active owner는 raw 코드를 `approve-test-push-pairing`에 입력한다. Edge Function이 같은 HMAC digest로 바꿔 사용자 JWT RPC를 호출하며, DB가 pending·미만료·active·variant 일치를 확인한 뒤 endpoint allowlist를 원자적으로 갱신한다. `list_owner_test_push_targets()`는 승인된 active endpoint의 `{ push_endpoint_id, app_variant, display_label }`만 반환한다. `display_label`은 서버에서 마스킹되며 설치 UUID·secret·Expo token·token hash·code digest는 브라우저로 반환하지 않는다. 같은 endpoint 행의 token refresh는 승인을 유지하지만 새 endpoint ID는 다시 연결해야 한다.

재설치 후 같은 Expo token이 이전 설치에 남은 경우의 오너 복구는 개발·미리보기 앱에만 제공한다. 앱은 128-bit 일회용 코드와 exact token을 RPC 전에 SecureStore provisional record로 먼저 저장하고, DB에는 원문 대신 proof verifier·token hash·domain-separated unlink binding만 보낸다. 코드 TTL이 끝나거나 철회 모드로 전환되면 SecureStore에서도 raw code를 즉시 제거하고, 철회 재시도에 필요한 exact token·variant·target proof 연결만 최소 보존한다. 오너 승인은 이전 연결을 즉시 풀지 않고 짧은 `authorized` 상태만 만든다. 새 기기가 proof·exact token·현재 14세 이상 확인·현재 별도 동의·최신 알림 선택을 다시 제출하는 finalize 거래에서만 이전 설치 철회와 새 설치 등록이 원자적으로 함께 일어난다. 따라서 승인 후 기기가 돌아오지 않거나 공격자가 token만 먼저 등록하려 해도 이전 token의 unique 예약은 유지된다.

복구 중 사용자가 알림을 모두 끄면 등록·정책 kill switch와 무관하게 cancel을 우선 처리하며, 실제 source/target token·동의·구독이 scrub됐다는 `withdrawn` 응답을 받은 경우에만 local token/proof 연결과 cleanup marker를 지운다. 알 수 없는 대상은 성공으로 간주하지 않는다. challenge 응답 유실·30일 감사 삭제 뒤에도 철회가 멈추지 않도록 개발·미리보기 exact token은 unsubscribe-only fallback으로 허용한다. 이 경계는 target takeover·동의 grant·설치 생성은 불가능하지만 token이 노출되면 해당 비운영 알림을 끄는 DoS는 가능하므로 production에는 절대 적용하지 않고 비운영 token도 로그·화면·요청 body에 노출하지 않는다. 재사용 가능한 code/proof verifier/token hash는 terminal 전환 즉시 scrub하고, unlink-only double hash와 앱 버전을 제외한 12자리 설치 지문 감사 메타데이터도 최대 30일 후 삭제한다. `decided_by`는 FK가 아닌 승인 시점 owner UUID snapshot으로 보존해 auth 계정 삭제가 상태 제약을 깨거나 actor를 지우지 않게 한다.

이 절차는 오너가 보고 있는 실기기와 서버 endpoint를 사람의 확인으로 연결하는 장치이며 앱 package 자체를 암호학적으로 증명하지는 않는다. 오너는 직접 확인한 development/preview 화면의 코드만 승인한다. 악성 변조 앱까지 자동 판별해야 하는 단계에서는 Play Integrity·App Attest와 환경별 서명 검증을 별도 도입한다.

`test-push` 요청은 `{ requestId, pushEndpointId, appVariant, title, body, deepLink? }`이다. Edge Function과 `queue_owner_test_push(...)`가 active owner·allowlist·활성 endpoint·명시된 비운영 variant를 다시 검증한다. owner 범위 request UUID는 payload와 결합되어 동일 재시도에는 기존 campaign ID를 반환하고 내용이 다르면 실패한다. 성공 응답 `202 { campaignId }`는 요청이 DB에 반영됐다는 뜻이며 실기기 도착 증거가 아니다. 일반 캠페인 RPC와 production 설치는 이 전용 경로에서 제외된다.

알림 `deepLink`는 production 스킴 `jubileeworship://`과 앱에 구현된 고정 화면(`notifications`, `notification-settings`, `privacy`, `worship`, `media`, `guide`) 또는 안전한 예배 상세·송리스트 경로만 허용한다. 웹 검증과 별개로 DB check constraint가 직접 table·RPC 호출도 같은 allowlist로 제한하며, 이전의 비허용 저장값은 migration에서 링크 없음(`NULL`)으로 정리한다.

worker claim wrapper는 test outbox를 처리하기 직전에 allowlist·variant·endpoint·installation 상태를 다시 검증하고 부적격 legacy/pending 행을 취소한다. delivery insert 경계도 같은 행들을 `FOR UPDATE`로 잠가 revoke·disable과 직렬화한다. dispatch worker는 Expo 호출 직전에 현재 동의·선택·토큰·이벤트를 다시 검증하고, 예배 리마인더에는 예배 시작 시각을 Expo `expiration`으로 설정한다. 단, 철회 요청 처리 전 또는 처리 중 이미 발송 작업에 넘겨진 알림은 외부 서비스로 전달되어 이후 도착할 수 있다.

`dispatch-notifications`와 `process-push-receipts`는 secret key 요청만 허용하고 기본 `dryRun=true`다. 코드에 실제 Expo access token을 저장하지 않는다. 운영 외부 발송은 배포 secret과 `PUSH_EXTERNAL_SEND_ENABLED=true`를 별도 승인한 뒤에만 활성화한다.

예배 알림은 owner가 아래 전용 RPC로 D-1 19:30 KST와 H-1 두 건을 한 번에 승인한다.

```text
schedule_worship_reminder_campaigns(
  target_event_id,
  target_day_before_title,
  target_day_before_body,
  target_one_hour_title,
  target_one_hour_body
)
-> (reminder_slot, campaign_id, scheduled_for, status, requires_action) 2 rows
```

`reminder_slot`은 `day_before_1930|one_hour_before`다. 기존 단수 RPC는 같은 문구로 두 건을 생성하고 D-1 UUID를 돌려주는 호환 wrapper다. 처음 승인하거나 새 generation이 필요한 경우 두 슬롯 중 하나라도 `scheduled_for + 15 minutes`를 지났으면 전체 승인을 거부한다. 따라서 owner는 D-1 전에 승인해야 하며, D-1 이후 예배 시각을 변경하면 H-1만 별도로 다시 예약하지 않는다. 이 경우 owner가 일정변경 캠페인을 별도로 수동 승인·queue해 변경 사실을 안내한다.

외부 scheduler는 5분마다 service key로 `service_queue_due_worship_reminders(now())`를 호출한다. worker는 공개 `scheduled|postponed` 예배와 현재 event snapshot만 대상으로 각 슬롯의 15분 grace window 안에서 idempotent하게 queue한다. grace가 지나면 미발송 캠페인과 pending outbox를 취소하며 늦게 몰아서 발송하지 않는다. event 시각·상태·공개 여부·제목·장소·주소·slug 또는 알림 문구가 바뀌면 미발송 승인을 재사용하지 않는다. 이미 `processing|completed|failed`인 동일 event start/slot은 새 generation을 만들 수 없고, 동일 문구 조회만 기존 ID와 실제 status를 반환한다.

claim worker는 pending→processing 직전에 event와 schedule을 다시 검증하고 잠근다. event 변경 trigger는 아직 pending인 outbox를 취소하지만, provider 처리 단계에 들어간 알림은 회수할 수 없다. migration은 cron을 자동 활성화하지 않으므로 원격 운영 단계에서 5분 scheduler를 별도로 설정하고, 실제 push 활성화 전에 dry-run과 일정변경 대응 절차를 검증한다.

### 알림 데이터 보유·정리 계약

정확히 180·24·30·90일을 사용하라는 Apple·Google 일률 규정은 없다. 이 숫자는 월 1회 예배 알림 사용성과 최소수집 원칙을 반영한 쥬빌리워십의 보수적 운영 정책이다. 스토어 제출 전 게시 개인정보처리방침·Data safety 답변와 아래 계약을 일치시키고 최종 법률 검토한다.

- 성공한 설정·토큰 갱신 시각인 `last_seen_at`이 180일 지나면 installation과 구독을 `stale_inactivity`로 비활성화한다. 올바른 secret과 새 token을 보내면 30일 유예 내에 재활성화할 수 있다.
- 사용자가 마지막 알림을 끄거나 등록 해제를 선택하면 앱은 동의·선택을 먼저 로컬에서 끄고 서버 철회를 요청한다. 성공 트랜잭션은 Expo token 원문·hash를 즉시 `NULL`로 바꾸고, 설치 verifier를 무작위 값으로 교체하고 pairing verifier·현재 동의·모든 선택을 제거한다. 네트워크 실패 시 SecureStore의 cleanup-pending을 남기고 다음 실행 시 새 등록보다 재시도를 먼저 수행한다.
- endpoint가 비활성화되면 다음 일일 실행에서 Expo token 원문과 token hash를 함께 제거한다. 정상 cron 운영 기준 최대 24시간이며, 진행 중 FK로 endpoint 행이 더 남아도 token은 남지 않는다. endpoint 행은 24시간 경계와 terminal 조건을 모두 충족해야 삭제한다.
- 비활성 installation은 30일 후 삭제하고 subscription은 FK cascade로 함께 삭제한다. terminal delivery·outbox·campaign 상세는 90일 후 삭제하되, 기기·token 값이 없는 dedupe tombstone만 남겨 중복 발송을 막는다.
- 24시간 이상 멈춘 `processing` lease는 중복 재발송하지 않고 `failed`로 종료하며, 24시간 이상 확정되지 않은 Expo receipt도 `ReceiptExpired`로 종료한다.
- 예배 알림 선택은 `종교적 관심`을 추론할 수 있다. DB 공개 gate는 이를 알림 제공에만 사용하고 이름·이메일·광고 식별자와 결합하지 않으며 광고·추적·프로파일링에 사용하지 않는다는 문구가 없으면 owner의 direct publish RPC도 거부한다.

`service_cleanup_notification_data(target_now, target_batch_limit)`는 `service_role`만 실행할 수 있고 같은 cutoff으로 재실행해도 멱등이다. migration은 `pg_cron`의 `jubilee-notification-retention-daily`을 `17 18 * * *` UTC(매일 03:17 KST)로 등록하며 DB 함수를 직접 호출해 secret을 SQL·Git에 남기지 않는다. 운영에서는 `cron.job_run_details`를 매일 확인하고 실패 시 같은 RPC를 수동 재실행한다. 예배 알림용 5분 scheduler는 이 정리 cron과 별도다.

근거: [Apple App Review Guidelines 5.1.1](https://developer.apple.com/app-store/review/guidelines/), [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469), [개인정보 보호법 제23조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029335401), [Expo push FAQ](https://docs.expo.dev/push-notifications/faq/), [Supabase Cron](https://supabase.com/docs/guides/cron)

## 8. 원격 배포 순서

일상 개발·reset·seed·CI는 로컬 Supabase에서 수행하고, Free 원격 `쥬빌리` 프로젝트는 통합검수 후 초기 운영으로 승격한다. Free 단계에서는 별도 hosted staging 프로젝트를 두지 않으므로 원격 reset과 `--include-seed`를 금지한다.

1. 최신 main에서 migration-only reset/test와 일반 `db reset`, pgTAP, lint, advisor를 모두 통과시킨다.
2. 대상 원격 프로젝트 ref를 재확인한 뒤 연결한다.
3. `supabase migration list --linked`로 이력을 확인한다.
4. `supabase db push --linked --dry-run`으로 적용 내용을 검토한다.
5. `supabase db push --linked`로 migration만 적용한다.
6. 네 역할(anon, 일반 authenticated, 활성 admin, 비활성 admin)과 Storage를 실제 API로 재검증한다.
7. 초기 운영으로 승격하기 전 백업·복구 가능 여부와 대상 project ref를 재확인한다.
8. 승인 담당자 한 명이 검토된 migration만 적용한다.
9. 적용 후 migration list, DB lint, Security Advisor, Performance Advisor를 다시 확인한다.

`seed.sql`은 로컬·개발 테스트 데이터다. production에 `--include-seed`를 사용하지 않는다. 위 공식 초기 기준행은 migration으로 생성되며, 이후 운영 콘텐츠는 검토된 별도 migration 또는 허용 범위의 관리자 UI로 입력한다.

## 9. 공식 참고 문서

- Local workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Database migrations: https://supabase.com/docs/guides/local-development/database-migrations
- API security: https://supabase.com/docs/guides/api/securing-your-api
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Database tests: https://supabase.com/docs/guides/database/testing
- Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Storage buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
