# 쥬빌리워십 Supabase 운영·부트스트랩

기준일: 2026-08-15 (Asia/Seoul)

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
- 앱 설치, 알림 선택, Expo token, 캠페인·outbox·delivery는 `private` schema에만 있고 `anon`/`authenticated`의 직접 table 권한은 없다. 설치 비밀값은 Edge Function 응답으로 한 번 전달하고 DB에는 SHA-256 hash만 저장한다.
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

앱 설치용 Edge Function은 publishable key를 `apikey`로 보내며 JSON 계약은 다음과 같다.

```text
POST register-installation
{ platform, appVersion, expoPushToken, subscriptions }
-> 201 { installationId, installationSecret }

POST update-notification-settings
{ installationId, installationSecret, appVersion, expoPushToken?, subscriptions }
-> 204

POST unregister-installation
{ installationId, installationSecret }
-> 204
```

`subscriptions`는 `worshipReminder`, `scheduleChanges`, `setlistUpdates` boolean 세 필드를 모두 포함한다. 설치 secret 원문은 앱의 SecureStore에만 보관하며 Edge Function은 즉시 hash로 바꿔 service-role RPC에 전달한다. 등록 함수의 메모리 요청 제한은 1차 abuse guard이므로 운영 배포에서는 API gateway의 분산 rate limit도 추가한다.

시험 발송은 active owner 세션으로 `test-push`에 `{ installationId, installationSecret, title, body, deepLink? }`를 전송한다. 성공 응답 `202 { campaignId, status: 'queued', externalSend: false }`는 큐 생성 완료이지 외부 발송 완료가 아니다.

`dispatch-notifications`와 `process-push-receipts`는 secret key 요청만 허용하고 기본 `dryRun=true`다. 코드에 실제 Expo access token을 저장하지 않는다. 운영 외부 발송은 배포 secret과 `PUSH_EXTERNAL_SEND_ENABLED=true`를 별도 승인한 뒤에만 활성화한다.

예배 하루 전 알림은 owner가 `schedule_worship_reminder_campaign(event_id, title, body)`로 먼저 건별 승인한다. 외부 scheduler가 service key로 `service_queue_due_worship_reminders(now())`를 호출하면 KST 기준 다음날인 공개 `scheduled|postponed` 예배의 승인된 캠페인만 idempotent하게 queue한다. migration은 cron을 자동 활성화하지 않는다.

## 8. 원격 배포 순서

개발/검수 프로젝트와 production 프로젝트를 분리한다.

1. 최신 main에서 migration-only reset/test와 일반 `db reset`, pgTAP, lint, advisor를 모두 통과시킨다.
2. 개발 또는 staging 프로젝트에 연결한다.
3. `supabase migration list --linked`로 이력을 확인한다.
4. `supabase db push --linked --dry-run`으로 적용 내용을 검토한다.
5. `supabase db push --linked`로 migration만 적용한다.
6. 네 역할(anon, 일반 authenticated, 활성 admin, 비활성 admin)과 Storage를 실제 API로 재검증한다.
7. production 백업·복구 가능 여부와 대상 project ref를 재확인한다.
8. 승인 담당자 한 명이 production에 동일 migration을 적용한다.
9. 적용 후 migration list, Security Advisor, Performance Advisor를 다시 확인한다.

`seed.sql`은 로컬·개발 테스트 데이터다. production에 `--include-seed`를 사용하지 않는다. 위 공식 초기 기준행은 migration으로 생성되며, 이후 운영 콘텐츠는 검토된 별도 migration 또는 허용 범위의 관리자 UI로 입력한다.

## 9. 공식 참고 문서

- Local workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Database migrations: https://supabase.com/docs/guides/local-development/database-migrations
- API security: https://supabase.com/docs/guides/api/securing-your-api
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Database tests: https://supabase.com/docs/guides/database/testing
- Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Storage buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
