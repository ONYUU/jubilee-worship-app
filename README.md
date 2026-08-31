# 쥬빌리워십 공식 앱·웹

인천 선두교회 예배사역팀 **쥬빌리워십(JUBILEE WORSHIP)**의 iOS·Android 앱, 반응형 홈페이지, 콘텐츠 관리자를 함께 관리하는 모노레포입니다.

현재 개발본은 승인된 로컬 이미지와 검증된 초기 콘텐츠만으로 실행됩니다. Supabase를 연결하면 웹 `/admin`에서 예배 일정·설교·송리스트·공지·영상 등을 관리하고 공개 앱과 웹에 동일하게 반영할 수 있도록 구현되어 있습니다.

## 구현 범위

- 모바일 앱: 홈·예배·미디어·안내 4개 탭, 이번 주 송리스트, 설교 주제·말씀 구절, 캘린더·길찾기·공유, 오프라인 캐시
- 공개 사이트: 홈, 소개, 예배안내, 미디어, 오시는 길, 개인정보 안내, 404·오류 화면
- 예배 일정: 확정 일정만 표시, Asia/Seoul D-Day, 취소·연기 상태, ICS 다운로드
- 미디어: 명시적으로 승인된 YouTube video ID만 공개, `youtube-nocookie.com` 클릭 후 로드
- 관리자: 이메일·비밀번호 로그인, 활성 관리자 allowlist, 일정·공지·미디어·섬기는 이·설정 CRUD
- 데이터: 로컬 콘텐츠 adapter + Supabase 공개 DTO view adapter
- 보안: RLS, 최소 GRANT, audit trigger, 공지 예약·만료 정책, Storage 관리자 쓰기 정책
- 품질: TypeScript strict, ESLint, Vitest, Playwright, sitemap, robots, Open Graph, JSON-LD

## 공식 채널 기준

- Instagram: <https://www.instagram.com/jubilee_worship_/>
- 현재 운영 YouTube: <https://www.youtube.com/@JUBILEEWORSHIP-25>
- YouTube channel ID: `UCxmosyyztNo7HBUOdN_gy9w`
- 선두교회: <https://www.sundoo.org/>

동명 단체 콘텐츠는 이름 검색으로 가져오지 않습니다. `jubileeworship.kr`은 다른 단체가 사용 중이므로 이 프로젝트에서 사용하지 않습니다.

## 요구 환경

- Node.js 22.13 이상
- pnpm 11.10
- Supabase CLI 2.109 이상(데이터베이스 로컬 검증 시)
- Docker Desktop(Supabase 로컬 실행 시)

## 로컬 실행

웹:

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

브라우저에서 <http://localhost:3000>을 엽니다.

모바일 개발 빌드:

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
pnpm dev:mobile
```

Expo SDK 57 기반이며 웹 미리보기는 기본 실행 화면에서 `w`를 눌러 열 수 있습니다. 캘린더와 Android 원격 알림은 Expo Go가 아닌 development build와 실기기에서 검증합니다.

기본 `.env.example`은 `CONTENT_SOURCE=local`이므로 외부 계정 없이 공개 화면을 확인할 수 있습니다. 공개 배포에서는 반드시 `CONTENT_SOURCE=supabase`로 변경해야 합니다. Supabase 모드에서 연결 정보가 없거나 조회가 실패하면 로컬 데이터로 조용히 대체하지 않고 오류로 처리합니다.

이미 생성된 프로덕션 빌드를 확인할 때는 다음 명령을 실행합니다.

```bash
pnpm preview
```

브라우저에서 <http://localhost:3001>을 엽니다. 미리보기 서버는 이 명령을 실행한 터미널이 열려 있는 동안만 유지됩니다. 빌드 이후 소스가 변경되었다면 먼저 `pnpm build`를 다시 실행합니다.

## Supabase 연결

`apps/web/.env.local`에 다음 값을 입력합니다.

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CONTENT_SOURCE=supabase
```

브라우저와 모바일 앱에는 publishable key만 사용합니다. 관리자 초대에 필요한 `SUPABASE_SECRET_KEY`는 Vercel 등의 **서버 전용 환경 변수**에만 두고, `NEXT_PUBLIC_`·`EXPO_PUBLIC_`·브라우저 번들·로그에 노출하지 않습니다.

로컬 데이터베이스 초기화:

```bash
supabase start
supabase db reset
```

최초 관리자는 Supabase Dashboard에서 공개 가입 없이 Auth 사용자를 수동으로 생성한 뒤, 해당 UUID를 `admin_users`에 등록합니다.

```sql
insert into public.admin_users (user_id, role, is_active)
values ('AUTH_USER_UUID'::uuid, 'owner', true);
```

최초 오너 등록 후에는 `/admin/admins`에서 이메일을 수동 승인·초대합니다. 신규 관리자는 항상 `editor`로 시작하며, 공개 가입이나 자동 승격 경로는 없습니다. 실제 메일 발송은 운영 SMTP·Redirect URL·초대 템플릿 설정 후 검증합니다.

관리자 이메일과 UUID는 공개 콘텐츠 view에 포함되지 않습니다.

## 이미지 저장 규칙

- 빌드 자산: `/images/...`
- Supabase Storage: `storage://public-media/<object-key>`
- 외부 URL: 승인된 HTTPS CDN 호스트를 `next.config.ts` 허용목록에 추가한 후 사용

관리자 업로드는 로그인된 브라우저에서 Supabase Storage로 직접 전송합니다. 바이너리를 Server Action 요청 본문으로 프록시하지 않습니다. 일반 업로드는 JPEG, PNG, WebP, AVIF만 허용하며 SVG는 차단합니다.

## 검증 명령

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

기본 `test:e2e`는 공개 화면을 검사하고 Supabase 관리자 자격 증명이 필요한 시나리오는 제외합니다. 로컬 Supabase 관리자·Storage까지 검사하려면 Supabase 모드 서버를 먼저 실행한 뒤 `E2E_BASE_URL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_UPLOAD_FILE`을 일회성 테스트 값으로 지정합니다. 운영 계정이나 운영 비밀번호는 E2E에 사용하지 않습니다.

Supabase 정책 테스트는 `supabase/tests/`를 확인하세요. 원격 `쥬빌리` 프로젝트 적용 후 DB lint와 Performance Advisor는 이슈 0건, Security Advisor는 오류 0건으로 확인했습니다. Security Advisor의 나머지 27개 경고는 `authenticated` 관리자 전용 `SECURITY DEFINER` RPC이며, 익명 실행 차단·활성 관리자 또는 owner 검사·고정 `search_path`를 개별 확인한 검토 예외입니다.

원격은 `Jubilee Worship` 조직의 Free `쥬빌리` 프로젝트 하나를 통합검수와 초기 운영에 사용합니다. 일상 개발·`db reset`·seed·CI는 로컬 Supabase에서만 실행하고, 원격에는 `db reset --linked`나 `--include-seed`를 사용하지 않습니다. Vercel Preview에는 Supabase 서버 secret을 제공하지 않고, Production 서버에만 신뢰할 수 있는 환경변수로 설정합니다.

## 저장소 구조

```text
apps/web/           Next.js 공개·관리자 사이트
apps/mobile/        Expo Router iOS·Android 앱
packages/domain/    프레임워크 독립 타입·Zod schema·날짜·YouTube 규칙
supabase/           migration, seed, 정책 테스트
docs/               관리자 운영 및 공개 준비 문서
reference/          전달 패키지·초기 starter의 로컬 참고 사본(배포 제외)
```

## 공개 전 외부 입력

- 최초 관리자 이메일과 생성된 Auth 사용자 UUID
- 2026년 9월 4일 예배 일정의 공개 직전 재확인
- Vercel Preview 프로젝트·무료 주소와 사용자의 공개 승인
- 확정 보유·자동 삭제 기준의 첫 운영 cron 실행 이력·실제 삭제 검증과 국외 처리 항목의 오너 검토
- Apple Team ID·Android 앱 서명값과 실제 기기 푸시 검증
- Google Play 비공개 테스터 12명·14일 연속 테스트와 Production access 신청
- 정식 운영용 `.com` 또는 `.org` 도메인 선택

개발·검수에는 Supabase Free와 Vercel `*.vercel.app` 주소를 사용하고,
정식 공개 전에 실제 운영 형태와 가용성 요건에 맞는 요금제를 다시 확인합니다.

## 운영 문서

- [Windows Codex 인계서](WINDOWS_CODEX_START_HERE.md)
- [개발 일시중지 인계서](docs/PAUSED_HANDOFF_2026-08-24.md)
- [Windows 별도 자료 인계 명세](docs/WINDOWS_LOCAL_ONLY_TRANSFER_MANIFEST_2026-08-31.md)
- [관리자 운영 안내](docs/ADMIN_OPERATIONS.md)
- [배포 전 체크리스트](docs/DEPLOYMENT_CHECKLIST.md)
- [외부 입력 목록](docs/EXTERNAL_INPUTS.md)
- [스토어·운영 메타데이터](docs/STORE_METADATA.md)
- [개발본 QA 보고서](docs/QA_REPORT.md)
- [자산 사용 기준](docs/ASSET_USAGE.md)

## 공개 저장소 이용 안내

이 저장소는 보안 검토와 투명한 협업을 위해 공개됩니다. 현재 소스 코드에는 별도의 오픈소스 라이선스를 부여하지 않았습니다. 사진·영상·로고·단체명은 코드 라이선스와 무관하게 재사용할 수 없습니다. 보안 제보는 공개 Issue 대신 [SECURITY.md](SECURITY.md)를 따릅니다.
