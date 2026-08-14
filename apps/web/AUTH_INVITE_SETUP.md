# 관리자 이메일 초대 운영 설정

관리자 웹은 공개 회원가입을 제공하지 않는다. 활성 `owner`가 `/admin/admins`에서 이메일을 입력했을 때만 Supabase Auth 사용자와 `admin_users` 승인이 생성된다.

## 서버 환경변수

배포 환경에 다음 값을 설정한다. 실제 값은 저장소에 커밋하지 않는다.

- `NEXT_PUBLIC_SITE_URL`: 배포된 웹 원본 URL
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: 공개 클라이언트 키
- `SUPABASE_SECRET_KEY`: 서버 전용 `sb_secret_...` 키

`SUPABASE_SECRET_KEY`는 `NEXT_PUBLIC_` 접두사를 사용하지 않으며 브라우저 코드, 로그, 오류 메시지에 포함하지 않는다.

## Supabase Auth 설정

1. 공개 사용자 가입을 비활성화한다.
2. Site URL을 `NEXT_PUBLIC_SITE_URL`과 동일하게 설정한다.
3. Redirect URL 허용 목록에 `{NEXT_PUBLIC_SITE_URL}/auth/confirm`을 추가한다.
4. Invite user 이메일 템플릿의 링크를 다음 형식으로 설정한다.

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite">
  관리자 초대 수락
</a>
```

5. 운영 환경에서는 자체 SMTP를 연결하고 발송 한도와 Email OTP 만료 시간을 확인한다.

## 확인 절차

1. 오너가 신규 이메일을 에디터로 초대한다.
2. 수신자가 이메일 링크를 열면 `/auth/confirm`이 `invite` 토큰을 검증한다.
3. 활성 `admin_users` 승인까지 확인된 계정만 `/admin/set-password`로 이동한다.
4. 비밀번호 설정 후 임시 초대 세션을 종료하고 새 비밀번호로 다시 로그인한다.
5. 오너 화면에서 가입 완료 상태와 최근 로그인 시각을 확인한다.
6. 비활성화 시 DB 접근이 즉시 차단되고 Auth 계정이 차단되는지 확인한다.

초대 링크가 만료되면 기존 링크를 재사용하지 않고 `/admin/admins`에서 초대를 재발송한다.
