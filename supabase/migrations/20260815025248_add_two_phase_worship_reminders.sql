-- Two owner-approved worship reminders: D-1 19:30 KST and H-1.
-- Generated with `supabase migration new add_two_phase_worship_reminders`.

begin;

-- The operational contact address remains a locked source-table field and is
-- intentionally absent from public.public_site_settings.
create or replace function private.touch_site_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  new.updated_by := coalesce((select auth.uid()), old.updated_by);
  return new;
end;
$$;

revoke all on function private.touch_site_settings()
from public, anon, authenticated;

update public.site_settings
set contact_email = 'sundoojubileeworship@gmail.com'
where id = 1;

create or replace function private.legal_document_has_confirmed_value(
  target_body text,
  target_label text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  with normalized_lines as (
    select regexp_replace(
      btrim(source.line),
      '^[-*][[:space:]]+',
      ''
    ) as line
    from regexp_split_to_table(target_body, E'\\r?\\n') as source(line)
  ),
  matching_values as (
    select btrim(substr(line, char_length(target_label) + 1)) as value
    from normalized_lines
    where left(line, char_length(target_label)) = target_label
  )
  select count(*) = 1
    and bool_and(
      char_length(value) >= 2
      and value ~ '[A-Za-z0-9가-힣]'
      and lower(value) not in ('완료', '확정', '검토됨', 'n/a', 'na', '해당 없음')
      and value !~* '(\\[\\[|\\]\\]|확인|검토|확정|완료|입력|기입|작성|미정|추후)'
    )
  from matching_values;
$$;

revoke all on function private.legal_document_has_confirmed_value(text, text)
from public, anon, authenticated;

-- Direct owner RPC calls must satisfy the same minimum identity and mobile
-- push-data disclosure gate as the administrative web form.
create or replace function public.publish_legal_document(target_document_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_type text;
  target_body text;
  actor uuid := (select auth.uid());
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select legal.document_type, legal.body
  into target_type, target_body
  from public.legal_documents as legal
  where legal.id = target_document_id
    and legal.status = 'draft'
    and legal.effective_on <= current_date
  for update;

  if target_type is null then
    raise exception using
      errcode = '23514',
      message = 'A current or past-effective draft legal document is required';
  end if;

  if position('[[오너 확인 필요]]' in target_body) > 0
    or position('쥬빌리 워십' in target_body) = 0
    or position('sundoojubileeworship@gmail.com' in target_body) = 0
    or (
      target_type = 'privacy_policy'
      and (
        position('설치 식별자' in target_body) = 0
        or position('푸시 토큰' in target_body) = 0
        or position('알림 선택' in target_body) = 0
        or position('보유' in target_body) = 0
        or position('비활성화' in target_body) = 0
        or not private.legal_document_has_confirmed_value(
          target_body, '비활성 정보 보유 기간:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '발송 기록 보유 기간:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '정기 삭제 주기:'
        )
        or not private.legal_document_has_confirmed_value(target_body, '수탁자:')
        or not private.legal_document_has_confirmed_value(target_body, '이전 국가:')
        or not private.legal_document_has_confirmed_value(target_body, '이전 항목:')
        or not private.legal_document_has_confirmed_value(
          target_body, '이전 시점 및 방법:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '국외 처리 보유 기간:'
        )
        or not private.legal_document_has_confirmed_value(
          target_body, '이전 거부 방법 및 효과:'
        )
      )
    )
    or (
      target_type = 'terms_of_service'
      and (
        not private.legal_document_has_confirmed_value(target_body, '준거법:')
        or not private.legal_document_has_confirmed_value(target_body, '관할:')
        or not private.legal_document_has_confirmed_value(target_body, '면책 범위:')
        or not private.legal_document_has_confirmed_value(
          target_body, '미성년자 이용 안내:'
        )
      )
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Legal document identity and disclosure review is incomplete';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731911, pg_catalog.hashtext(target_type));

  update public.legal_documents
  set status = 'withdrawn',
      withdrawn_at = statement_timestamp(),
      withdrawn_by = actor
  where document_type = target_type
    and status = 'published';

  update public.legal_documents
  set status = 'published',
      published_at = statement_timestamp(),
      published_by = actor
  where id = target_document_id;
end;
$$;

create table private.worship_reminder_schedules (
  campaign_id uuid primary key
    references private.notification_campaigns (id) on delete cascade,
  event_id bigint not null
    references public.events (id) on delete restrict,
  reminder_slot text not null
    check (reminder_slot in ('day_before_1930', 'one_hour_before')),
  event_starts_at_snapshot timestamptz not null,
  scheduled_for timestamptz not null,
  is_current boolean not null default true,
  invalidated_at timestamptz,
  invalidation_reason text
    check (
      invalidation_reason is null
      or invalidation_reason in ('event_changed', 'copy_changed', 'expired', 'superseded')
    ),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint worship_reminder_schedule_time_order_valid
    check (scheduled_for < event_starts_at_snapshot),
  constraint worship_reminder_schedule_current_state_valid
    check (
      (is_current and invalidated_at is null and invalidation_reason is null)
      or
      (not is_current and invalidated_at is not null and invalidation_reason is not null)
    )
);

-- Only one currently approved generation may exist for an event start and
-- reminder slot. Superseded generations remain available for audit history.
create unique index worship_reminder_schedules_current_event_slot_idx
  on private.worship_reminder_schedules (
    event_id, event_starts_at_snapshot, reminder_slot
  )
  where is_current = true;

create index worship_reminder_schedules_due_idx
  on private.worship_reminder_schedules (scheduled_for, campaign_id)
  where is_current = true;

create index worship_reminder_schedules_event_idx
  on private.worship_reminder_schedules (event_id, created_at desc);

create or replace function private.worship_reminder_scheduled_for(
  target_event_starts_at timestamptz,
  target_reminder_slot text
)
returns timestamptz
language sql
immutable
strict
set search_path = ''
as $$
  select case target_reminder_slot
    when 'day_before_1930' then
      (
        (
          (target_event_starts_at at time zone 'Asia/Seoul')::date - 1
          + time '19:30'
        ) at time zone 'Asia/Seoul'
      )
    when 'one_hour_before' then target_event_starts_at - interval '1 hour'
    else null
  end;
$$;

revoke all on function private.worship_reminder_scheduled_for(timestamptz, text)
from public, anon, authenticated;

create or replace function private.validate_worship_reminder_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_event_id bigint;
  campaign_kind text;
  campaign_audience text;
  campaign_status text;
  campaign_approved_at timestamptz;
  campaign_approved_by uuid;
  expected_scheduled_for timestamptz;
begin
  if tg_op = 'UPDATE' and (
    new.campaign_id is distinct from old.campaign_id
    or new.event_id is distinct from old.event_id
    or new.reminder_slot is distinct from old.reminder_slot
    or new.event_starts_at_snapshot is distinct from old.event_starts_at_snapshot
    or new.scheduled_for is distinct from old.scheduled_for
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
  ) then
    raise exception using
      errcode = '23514',
      message = 'Worship reminder schedule identity is immutable';
  end if;

  select
    campaign.event_id,
    campaign.kind,
    campaign.audience_kind,
    campaign.status,
    campaign.approved_at,
    campaign.approved_by
  into
    campaign_event_id,
    campaign_kind,
    campaign_audience,
    campaign_status,
    campaign_approved_at,
    campaign_approved_by
  from private.notification_campaigns as campaign
  where campaign.id = new.campaign_id;

  if not found then
    raise exception using errcode = '23503', message = 'Notification campaign does not exist';
  end if;

  if campaign_event_id is distinct from new.event_id
    or campaign_kind <> 'worship_reminder'
    or campaign_audience <> 'worship_reminder'
  then
    raise exception using
      errcode = '23514',
      message = 'A matching worship reminder campaign is required';
  end if;

  if tg_op = 'INSERT' and (
    campaign_status <> 'approved'
    or campaign_approved_at is null
    or campaign_approved_by is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'An owner-approved worship reminder campaign is required';
  end if;

  expected_scheduled_for := private.worship_reminder_scheduled_for(
    new.event_starts_at_snapshot,
    new.reminder_slot
  );

  if expected_scheduled_for is null
    or new.scheduled_for is distinct from expected_scheduled_for
  then
    raise exception using
      errcode = '23514',
      message = 'Worship reminder scheduled time is invalid';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_worship_reminder_schedule()
from public, anon, authenticated;

create or replace function private.touch_worship_reminder_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.created_at := statement_timestamp();
    new.created_by := actor;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;

  new.updated_at := statement_timestamp();
  new.updated_by := coalesce(actor, old.updated_by);
  return new;
end;
$$;

revoke all on function private.touch_worship_reminder_schedule()
from public, anon, authenticated;

create trigger worship_reminder_schedules_10_validate
before insert or update on private.worship_reminder_schedules
for each row execute function private.validate_worship_reminder_schedule();

create trigger worship_reminder_schedules_90_touch
before insert or update on private.worship_reminder_schedules
for each row execute function private.touch_worship_reminder_schedule();

alter table private.worship_reminder_schedules enable row level security;

revoke all on table private.worship_reminder_schedules
from public, anon, authenticated, service_role;
grant select on table private.worship_reminder_schedules to service_role;

-- Legacy D-1 rows do not have an exact slot or owner-approved schedule
-- snapshot. Preserve terminal history, but prevent any unsent legacy row from
-- entering the new worker.
update private.notification_outbox as outbox
set status = 'cancelled',
    locked_at = null,
    locked_by = null,
    last_error_code = 'LEGACY_REMINDER_SUPERSEDED'
where outbox.status = 'pending'
  and outbox.campaign_id in (
    select campaign.id
    from private.notification_campaigns as campaign
    where (
        campaign.kind = 'worship_reminder'
        or campaign.audience_kind = 'worship_reminder'
      )
      and campaign.status in ('draft', 'approved', 'queued')
  );

update private.notification_campaigns
set status = 'cancelled'
where (kind = 'worship_reminder' or audience_kind = 'worship_reminder')
  and status in ('draft', 'approved', 'queued');

-- Generic campaign mutation remains available for other campaign kinds. A
-- worship reminder must use the dedicated owner-approved scheduling RPC.
create or replace function public.create_notification_campaign(
  target_kind text,
  target_title text,
  target_body text,
  target_deep_link text,
  target_audience_kind text,
  target_event_id bigint,
  target_test_push_endpoint_id uuid,
  target_dedupe_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_id uuid;
begin
  if not (select private.is_active_admin()) then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;

  if target_kind = 'worship_reminder'
    or target_audience_kind = 'worship_reminder'
  then
    raise exception using
      errcode = '23514',
      message = 'Use the dedicated worship reminder scheduling RPC';
  end if;

  insert into private.notification_campaigns (
    kind,
    title,
    body,
    deep_link,
    audience_kind,
    event_id,
    test_push_endpoint_id,
    dedupe_key
  )
  values (
    target_kind,
    target_title,
    target_body,
    target_deep_link,
    target_audience_kind,
    target_event_id,
    target_test_push_endpoint_id,
    target_dedupe_key
  )
  returning id into campaign_id;

  return campaign_id;
end;
$$;

create or replace function public.update_notification_campaign(
  target_campaign_id uuid,
  target_kind text,
  target_title text,
  target_body text,
  target_deep_link text,
  target_audience_kind text,
  target_event_id bigint,
  target_test_push_endpoint_id uuid,
  target_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_active_admin()) then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;

  if target_kind = 'worship_reminder'
    or target_audience_kind = 'worship_reminder'
    or exists (
      select 1
      from private.notification_campaigns as campaign
      where campaign.id = target_campaign_id
        and (
          campaign.kind = 'worship_reminder'
          or campaign.audience_kind = 'worship_reminder'
        )
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Use the dedicated worship reminder scheduling RPC';
  end if;

  update private.notification_campaigns
  set kind = target_kind,
      title = target_title,
      body = target_body,
      deep_link = target_deep_link,
      audience_kind = target_audience_kind,
      event_id = target_event_id,
      test_push_endpoint_id = target_test_push_endpoint_id,
      dedupe_key = target_dedupe_key
  where id = target_campaign_id
    and status = 'draft';

  if not found then
    raise exception using errcode = '23514', message = 'A draft campaign is required';
  end if;
end;
$$;

create or replace function public.approve_notification_campaign(target_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_kind text;
  target_audience_kind text;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select campaign.kind, campaign.audience_kind
  into target_kind, target_audience_kind
  from private.notification_campaigns as campaign
  where campaign.id = target_campaign_id
  for update;

  if target_kind is null then
    raise exception using errcode = 'P0002', message = 'Notification campaign does not exist';
  end if;

  if target_kind = 'worship_reminder'
    or target_audience_kind = 'worship_reminder'
  then
    raise exception using
      errcode = '23514',
      message = 'Use the dedicated worship reminder scheduling RPC';
  end if;

  update private.notification_campaigns
  set status = 'approved',
      approved_at = statement_timestamp(),
      approved_by = actor
  where id = target_campaign_id
    and status = 'draft';

  if not found and not exists (
    select 1
    from private.notification_campaigns as campaign
    where campaign.id = target_campaign_id and campaign.status = 'approved'
  ) then
    raise exception using errcode = '23514', message = 'A draft campaign is required';
  end if;
end;
$$;

create or replace function public.queue_notification_campaign(target_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_dedupe_key text;
  campaign_kind text;
  campaign_audience_kind text;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  select campaign.dedupe_key, campaign.kind, campaign.audience_kind
  into campaign_dedupe_key, campaign_kind, campaign_audience_kind
  from private.notification_campaigns as campaign
  where campaign.id = target_campaign_id
    and campaign.status in ('approved', 'queued', 'processing', 'completed')
  for update;

  if campaign_dedupe_key is null then
    raise exception using errcode = '23514', message = 'An approved campaign is required';
  end if;

  if campaign_kind = 'worship_reminder'
    or campaign_audience_kind = 'worship_reminder'
  then
    raise exception using
      errcode = '23514',
      message = 'Worship reminders are queued only by the due-reminder service';
  end if;

  if exists (
    select 1
    from private.notification_campaigns as campaign
    where campaign.id = target_campaign_id
      and campaign.status in ('queued', 'processing', 'completed')
  ) then
    return;
  end if;

  insert into private.notification_outbox (campaign_id, dedupe_key)
  values (target_campaign_id, campaign_dedupe_key)
  on conflict (dedupe_key) do nothing;

  update private.notification_campaigns
  set status = 'queued',
      queued_at = statement_timestamp()
  where id = target_campaign_id
    and status = 'approved';
end;
$$;

create or replace function public.schedule_worship_reminder_campaigns(
  target_event_id bigint,
  target_day_before_title text,
  target_day_before_body text,
  target_one_hour_title text,
  target_one_hour_body text
)
returns table (
  reminder_slot text,
  campaign_id uuid,
  scheduled_for timestamptz,
  status text,
  requires_action boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  event_slug text;
  event_starts_at timestamptz;
  slot_name text;
  slot_title text;
  slot_body text;
  slot_scheduled_for timestamptz;
  slot_campaign_id uuid;
  existing_campaign_id uuid;
  existing_title text;
  existing_body text;
  existing_deep_link text;
  existing_status text;
  terminal_campaign_id uuid;
  terminal_title text;
  terminal_body text;
  terminal_deep_link text;
  terminal_status text;
  expected_deep_link text;
begin
  if not (select private.is_owner()) then
    raise exception using errcode = '42501', message = 'Active owner access required';
  end if;

  if target_event_id is null then
    raise exception using errcode = '22004', message = 'Event ID is required';
  end if;

  select event.slug, event.starts_at
  into event_slug, event_starts_at
  from public.events as event
  where event.id = target_event_id
    and event.published = true
    and event.status in ('scheduled', 'postponed')
    and event.starts_at > statement_timestamp()
  for update;

  if event_slug is null then
    raise exception using
      errcode = '23514',
      message = 'A future published scheduled or postponed event is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731913, pg_catalog.hashint8(target_event_id));

  expected_deep_link := 'jubileeworship://worship/' || event_slug;

  -- Any current row for an older event start is no longer eligible. This also
  -- protects callers when an event was changed before this migration's trigger
  -- existed or by a privileged maintenance transaction.
  update private.notification_outbox as outbox
  set status = 'cancelled',
      locked_at = null,
      locked_by = null,
      last_error_code = 'REMINDER_EVENT_CHANGED'
  where outbox.status = 'pending'
    and outbox.campaign_id in (
      select schedule.campaign_id
      from private.worship_reminder_schedules as schedule
      where schedule.event_id = target_event_id
        and schedule.is_current = true
        and schedule.event_starts_at_snapshot is distinct from event_starts_at
    );

  update private.notification_campaigns as campaign
  set status = 'cancelled'
  where campaign.status in ('draft', 'approved', 'queued')
    and campaign.id in (
      select schedule.campaign_id
      from private.worship_reminder_schedules as schedule
      where schedule.event_id = target_event_id
        and schedule.is_current = true
        and schedule.event_starts_at_snapshot is distinct from event_starts_at
    );

  update private.worship_reminder_schedules
  set is_current = false,
      invalidated_at = statement_timestamp(),
      invalidation_reason = 'event_changed'
  where event_id = target_event_id
    and is_current = true
    and event_starts_at_snapshot is distinct from event_starts_at;

  foreach slot_name in array array['day_before_1930', 'one_hour_before']::text[]
  loop
    if slot_name = 'day_before_1930' then
      slot_title := target_day_before_title;
      slot_body := target_day_before_body;
    else
      slot_title := target_one_hour_title;
      slot_body := target_one_hour_body;
    end if;

    slot_scheduled_for := private.worship_reminder_scheduled_for(
      event_starts_at,
      slot_name
    );

    -- A terminal generation may already have reached devices. It is immutable
    -- and is returned as history even after event metadata changes; creating a
    -- second generation for the same event start and slot is never allowed.
    terminal_campaign_id := null;
    terminal_title := null;
    terminal_body := null;
    terminal_deep_link := null;
    terminal_status := null;
    select
      campaign.id,
      campaign.title,
      campaign.body,
      campaign.deep_link,
      campaign.status
    into
      terminal_campaign_id,
      terminal_title,
      terminal_body,
      terminal_deep_link,
      terminal_status
    from private.worship_reminder_schedules as schedule
    join private.notification_campaigns as campaign
      on campaign.id = schedule.campaign_id
    where schedule.event_id = target_event_id
      and schedule.event_starts_at_snapshot = event_starts_at
      and schedule.reminder_slot = slot_name
      and campaign.status in ('processing', 'completed', 'failed')
    order by schedule.created_at desc, campaign.id desc
    limit 1
    for update of schedule, campaign;

    if terminal_campaign_id is not null then
      if terminal_title is distinct from slot_title
        or terminal_body is distinct from slot_body
        or terminal_deep_link is distinct from expected_deep_link
      then
        raise exception using
          errcode = '23514',
          message = 'A terminal reminder cannot be replaced with different copy';
      end if;

      reminder_slot := slot_name;
      campaign_id := terminal_campaign_id;
      scheduled_for := slot_scheduled_for;
      status := terminal_status;
      requires_action := terminal_status = 'failed';
      return next;
      continue;
    end if;

    existing_campaign_id := null;
    existing_title := null;
    existing_body := null;
    existing_deep_link := null;
    existing_status := null;

    select
      campaign.id,
      campaign.title,
      campaign.body,
      campaign.deep_link,
      campaign.status
    into
      existing_campaign_id,
      existing_title,
      existing_body,
      existing_deep_link,
      existing_status
    from private.worship_reminder_schedules as schedule
    join private.notification_campaigns as campaign
      on campaign.id = schedule.campaign_id
    where schedule.event_id = target_event_id
      and schedule.event_starts_at_snapshot = event_starts_at
      and schedule.reminder_slot = slot_name
      and schedule.is_current = true
    for update of schedule, campaign;

    if existing_campaign_id is not null
      and existing_title is not distinct from slot_title
      and existing_body is not distinct from slot_body
      and existing_deep_link is not distinct from expected_deep_link
      and existing_status in ('approved', 'queued', 'processing', 'completed')
    then
      reminder_slot := slot_name;
      campaign_id := existing_campaign_id;
      scheduled_for := slot_scheduled_for;
      status := existing_status;
      requires_action := false;
      return next;
      continue;
    end if;

    if existing_campaign_id is not null
      and existing_status in ('processing', 'completed', 'failed')
    then
      raise exception using
        errcode = '23514',
        message = 'A processing, completed, or failed reminder cannot be rescheduled';
    end if;

    if existing_campaign_id is not null then
      update private.notification_outbox as outbox
      set status = 'cancelled',
          locked_at = null,
          locked_by = null,
          last_error_code = 'REMINDER_COPY_CHANGED'
      where outbox.campaign_id = existing_campaign_id
        and outbox.status = 'pending';

      update private.notification_campaigns as campaign
      set status = 'cancelled'
      where campaign.id = existing_campaign_id
        and campaign.status in ('draft', 'approved', 'queued');

      update private.worship_reminder_schedules as schedule
      set is_current = false,
          invalidated_at = statement_timestamp(),
          invalidation_reason = 'copy_changed'
      where schedule.campaign_id = existing_campaign_id
        and schedule.is_current = true;
    end if;

    if statement_timestamp() > slot_scheduled_for + interval '15 minutes' then
      raise exception using
        errcode = '23514',
        message = 'The worship reminder approval window has expired';
    end if;

    slot_campaign_id := gen_random_uuid();

    insert into private.notification_campaigns (
      id,
      kind,
      title,
      body,
      deep_link,
      audience_kind,
      event_id,
      status,
      dedupe_key,
      approved_at,
      approved_by
    )
    values (
      slot_campaign_id,
      'worship_reminder',
      slot_title,
      slot_body,
      expected_deep_link,
      'worship_reminder',
      target_event_id,
      'approved',
      'worship-reminder:event:' || target_event_id::text || ':' ||
        to_char(event_starts_at at time zone 'Asia/Seoul', 'YYYYMMDDHH24MI') || ':' ||
        slot_name || ':' || replace(slot_campaign_id::text, '-', ''),
      statement_timestamp(),
      actor
    );

    insert into private.worship_reminder_schedules (
      campaign_id,
      event_id,
      reminder_slot,
      event_starts_at_snapshot,
      scheduled_for
    )
    values (
      slot_campaign_id,
      target_event_id,
      slot_name,
      event_starts_at,
      slot_scheduled_for
    );

    reminder_slot := slot_name;
    campaign_id := slot_campaign_id;
    scheduled_for := slot_scheduled_for;
    status := 'approved';
    requires_action := false;
    return next;
  end loop;
end;
$$;

-- Backward-compatible wrapper: both reminders use the legacy copy and the
-- returned UUID is the D-1 campaign.
create or replace function public.schedule_worship_reminder_campaign(
  target_event_id bigint,
  target_title text,
  target_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  day_before_campaign_id uuid;
begin
  select scheduled.campaign_id
  into day_before_campaign_id
  from public.schedule_worship_reminder_campaigns(
    target_event_id,
    target_title,
    target_body,
    target_title,
    target_body
  ) as scheduled
  where scheduled.reminder_slot = 'day_before_1930';

  return day_before_campaign_id;
end;
$$;

create or replace function public.list_worship_reminder_schedules()
returns table (
  campaign_id uuid,
  event_id bigint,
  event_slug text,
  event_title text,
  reminder_slot text,
  scheduled_for timestamptz,
  event_starts_at_snapshot timestamptz,
  current_event_starts_at timestamptz,
  status text,
  title text,
  body text,
  approved_at timestamptz,
  approved_by uuid,
  queued_at timestamptz,
  completed_at timestamptz,
  requires_reapproval boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_active_admin()) then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;

  return query
  select
    campaign.id,
    event.id,
    event.slug,
    event.title,
    schedule.reminder_slot,
    schedule.scheduled_for,
    schedule.event_starts_at_snapshot,
    event.starts_at,
    campaign.status,
    campaign.title,
    campaign.body,
    campaign.approved_at,
    campaign.approved_by,
    campaign.queued_at,
    campaign.completed_at,
    (
      not schedule.is_current
      or campaign.status = 'cancelled'
      or event.published = false
      or event.status not in ('scheduled', 'postponed')
      or event.starts_at is distinct from schedule.event_starts_at_snapshot
    ) as requires_reapproval
  from private.worship_reminder_schedules as schedule
  join private.notification_campaigns as campaign
    on campaign.id = schedule.campaign_id
  join public.events as event on event.id = schedule.event_id
  order by schedule.scheduled_for desc, schedule.reminder_slot, campaign.id;
end;
$$;

create or replace function private.invalidate_worship_reminders_on_event_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.starts_at is not distinct from old.starts_at
    and new.status is not distinct from old.status
    and new.published is not distinct from old.published
    and new.slug is not distinct from old.slug
    and new.title is not distinct from old.title
    and new.venue_name is not distinct from old.venue_name
    and new.address is not distinct from old.address
  then
    return new;
  end if;

  update private.notification_outbox as outbox
  set status = 'cancelled',
      locked_at = null,
      locked_by = null,
      last_error_code = 'REMINDER_EVENT_CHANGED'
  where outbox.status = 'pending'
    and outbox.campaign_id in (
      select schedule.campaign_id
      from private.worship_reminder_schedules as schedule
      where schedule.event_id = old.id
        and schedule.is_current = true
    );

  update private.notification_campaigns as campaign
  set status = 'cancelled'
  where campaign.status in ('draft', 'approved', 'queued')
    and campaign.id in (
      select schedule.campaign_id
      from private.worship_reminder_schedules as schedule
      where schedule.event_id = old.id
        and schedule.is_current = true
    );

  update private.worship_reminder_schedules
  set is_current = false,
      invalidated_at = statement_timestamp(),
      invalidation_reason = 'event_changed'
  where event_id = old.id
    and is_current = true;

  return new;
end;
$$;

revoke all on function private.invalidate_worship_reminders_on_event_change()
from public, anon, authenticated;

create trigger events_invalidate_worship_reminders
after update of starts_at, status, published, slug, title, venue_name, address
on public.events
for each row execute function private.invalidate_worship_reminders_on_event_change();

-- Revalidate worship reminders immediately before the pending -> processing
-- transition. Event rows are locked in the same transaction, closing the gap
-- between a due-worker commit and a later event change. Once processing starts,
-- an already submitted provider request cannot be recalled.
create or replace function public.service_claim_notification_outbox(
  target_worker_id text,
  target_campaign_limit integer
)
returns table (
  outbox_id bigint,
  campaign_id uuid,
  delivery_id bigint,
  push_endpoint_id uuid,
  expo_push_token text,
  title text,
  body text,
  deep_link text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_now timestamptz := statement_timestamp();
  worship_claimed_ids bigint[];
  generic_claimed_ids bigint[];
  claimed_ids bigint[];
  remaining_limit integer;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or target_worker_id = ''
    or char_length(target_worker_id) > 120
  then
    raise exception using errcode = '22023', message = 'Valid worker ID is required';
  end if;

  if target_campaign_limit is null or target_campaign_limit not between 1 and 10 then
    raise exception using errcode = '22023', message = 'Campaign limit must be between 1 and 10';
  end if;

  -- Stale or legacy worship rows are never allowed to fall through to the
  -- generic claim path.
  update private.notification_outbox as outbox
  set status = 'cancelled',
      locked_at = null,
      locked_by = null,
      last_error_code = case
        when exists (
          select 1
          from private.worship_reminder_schedules as schedule
          where schedule.campaign_id = outbox.campaign_id
            and claim_now > schedule.scheduled_for + interval '15 minutes'
        ) then 'REMINDER_EXPIRED'
        else 'REMINDER_INVALID_AT_CLAIM'
      end
  from private.notification_campaigns as campaign
  where campaign.id = outbox.campaign_id
    and outbox.status = 'pending'
    and (
      campaign.kind = 'worship_reminder'
      or campaign.audience_kind = 'worship_reminder'
    )
    and not exists (
      select 1
      from private.worship_reminder_schedules as schedule
      join public.events as event on event.id = schedule.event_id
      where schedule.campaign_id = campaign.id
        and schedule.is_current = true
        and campaign.kind = 'worship_reminder'
        and campaign.audience_kind = 'worship_reminder'
        and campaign.status = 'queued'
        and event.published = true
        and event.status in ('scheduled', 'postponed')
        and event.starts_at = schedule.event_starts_at_snapshot
        and schedule.scheduled_for <= claim_now
        and claim_now <= schedule.scheduled_for + interval '15 minutes'
        and claim_now < event.starts_at
    );

  update private.notification_campaigns as campaign
  set status = 'cancelled'
  from private.notification_outbox as outbox
  where outbox.campaign_id = campaign.id
    and outbox.status = 'cancelled'
    and outbox.last_error_code in ('REMINDER_EXPIRED', 'REMINDER_INVALID_AT_CLAIM')
    and campaign.status = 'queued';

  update private.worship_reminder_schedules as schedule
  set is_current = false,
      invalidated_at = claim_now,
      invalidation_reason = case
        when claim_now > schedule.scheduled_for + interval '15 minutes'
          or claim_now >= event.starts_at
        then 'expired'
        else 'event_changed'
      end
  from public.events as event,
       private.notification_campaigns as campaign
  where event.id = schedule.event_id
    and campaign.id = schedule.campaign_id
    and schedule.is_current = true
    and campaign.status = 'cancelled'
    and (
      event.published = false
      or event.status not in ('scheduled', 'postponed')
      or event.starts_at is distinct from schedule.event_starts_at_snapshot
      or claim_now > schedule.scheduled_for + interval '15 minutes'
      or claim_now >= event.starts_at
    );

  select array_agg(candidate.id)
  into worship_claimed_ids
  from (
    select outbox.id
    from private.notification_outbox as outbox
    join private.notification_campaigns as campaign
      on campaign.id = outbox.campaign_id
    join private.worship_reminder_schedules as schedule
      on schedule.campaign_id = campaign.id
    join public.events as event on event.id = schedule.event_id
    where outbox.status = 'pending'
      and outbox.available_at <= claim_now
      and campaign.kind = 'worship_reminder'
      and campaign.audience_kind = 'worship_reminder'
      and campaign.status = 'queued'
      and schedule.is_current = true
      and event.published = true
      and event.status in ('scheduled', 'postponed')
      and event.starts_at = schedule.event_starts_at_snapshot
      and schedule.scheduled_for <= claim_now
      and claim_now <= schedule.scheduled_for + interval '15 minutes'
      and claim_now < event.starts_at
    order by outbox.available_at, outbox.id
    for update of event, schedule, campaign, outbox skip locked
    limit target_campaign_limit
  ) as candidate;

  remaining_limit := target_campaign_limit - cardinality(
    coalesce(worship_claimed_ids, array[]::bigint[])
  );

  if remaining_limit > 0 then
    select array_agg(candidate.id)
    into generic_claimed_ids
    from (
      select outbox.id
      from private.notification_outbox as outbox
      join private.notification_campaigns as campaign
        on campaign.id = outbox.campaign_id
      where outbox.status = 'pending'
        and outbox.available_at <= claim_now
        and campaign.kind <> 'worship_reminder'
        and campaign.audience_kind <> 'worship_reminder'
      order by outbox.available_at, outbox.id
      for update of campaign, outbox skip locked
      limit remaining_limit
    ) as candidate;
  end if;

  claimed_ids := coalesce(worship_claimed_ids, array[]::bigint[])
    || coalesce(generic_claimed_ids, array[]::bigint[]);

  if cardinality(claimed_ids) = 0 then
    return;
  end if;

  update private.notification_outbox as outbox
  set status = 'processing',
      locked_at = claim_now,
      locked_by = target_worker_id,
      attempt_count = outbox.attempt_count + 1,
      last_error_code = null
  where outbox.id = any (claimed_ids);

  update private.notification_campaigns as campaign
  set status = 'processing'
  from private.notification_outbox as outbox
  where outbox.id = any (claimed_ids)
    and campaign.id = outbox.campaign_id
    and campaign.status = 'queued';

  insert into private.notification_deliveries (
    campaign_id, push_endpoint_id, attempt_no, status
  )
  select campaign.id, endpoint.id, 1, 'queued'
  from private.notification_outbox as outbox
  join private.notification_campaigns as campaign
    on campaign.id = outbox.campaign_id
  join private.push_endpoints as endpoint
    on endpoint.is_active = true
  join private.app_installations as installation
    on installation.id = endpoint.installation_id
   and installation.disabled_at is null
  join private.notification_subscriptions as subscription
    on subscription.installation_id = installation.id
  where outbox.id = any (claimed_ids)
    and (
      (campaign.audience_kind = 'test_endpoint'
        and endpoint.id = campaign.test_push_endpoint_id)
      or (campaign.audience_kind = 'worship_reminder'
        and subscription.worship_reminder = true)
      or (campaign.audience_kind = 'schedule_changes'
        and subscription.schedule_changes = true)
      or (campaign.audience_kind = 'setlist_updates'
        and subscription.setlist_updates = true)
      or (campaign.audience_kind = 'all_opted_in'
        and (
          subscription.worship_reminder = true
          or subscription.schedule_changes = true
          or subscription.setlist_updates = true
        ))
    )
  on conflict on constraint notification_deliveries_campaign_endpoint_attempt_unique
  do nothing;

  return query
  select
    outbox.id,
    campaign.id,
    delivery.id,
    endpoint.id,
    endpoint.expo_push_token,
    campaign.title,
    campaign.body,
    campaign.deep_link
  from private.notification_outbox as outbox
  join private.notification_campaigns as campaign
    on campaign.id = outbox.campaign_id
  left join private.notification_deliveries as delivery
    on delivery.campaign_id = campaign.id
   and delivery.attempt_no = 1
  left join private.push_endpoints as endpoint
    on endpoint.id = delivery.push_endpoint_id
  where outbox.id = any (claimed_ids)
  order by outbox.id, delivery.id;
end;
$$;

create or replace function public.service_queue_due_worship_reminders(
  target_now timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued_count integer := 0;
begin
  if target_now is null then
    raise exception using errcode = '22004', message = 'Current time is required';
  end if;

  -- A 5-minute external cron may claim a slot for 15 minutes. Once that grace
  -- window ends, a stale reminder is cancelled instead of being sent late.
  update private.notification_outbox as outbox
  set status = 'cancelled',
      locked_at = null,
      locked_by = null,
      last_error_code = case
        when exists (
          select 1
          from private.worship_reminder_schedules as schedule
          where schedule.campaign_id = outbox.campaign_id
            and target_now > schedule.scheduled_for + interval '15 minutes'
        ) then 'REMINDER_EXPIRED'
        else 'REMINDER_EVENT_CHANGED'
      end
  where outbox.status = 'pending'
    and outbox.campaign_id in (
      select schedule.campaign_id
      from private.worship_reminder_schedules as schedule
      join public.events as event on event.id = schedule.event_id
      where schedule.is_current = true
        and (
          event.published = false
          or event.status not in ('scheduled', 'postponed')
          or event.starts_at is distinct from schedule.event_starts_at_snapshot
          or target_now > schedule.scheduled_for + interval '15 minutes'
          or target_now >= event.starts_at
        )
    );

  update private.notification_campaigns as campaign
  set status = 'cancelled'
  where campaign.status in ('approved', 'queued')
    and campaign.id in (
      select schedule.campaign_id
      from private.worship_reminder_schedules as schedule
      join public.events as event on event.id = schedule.event_id
      where schedule.is_current = true
        and (
          event.published = false
          or event.status not in ('scheduled', 'postponed')
          or event.starts_at is distinct from schedule.event_starts_at_snapshot
          or target_now > schedule.scheduled_for + interval '15 minutes'
          or target_now >= event.starts_at
        )
    );

  update private.worship_reminder_schedules as schedule
  set is_current = false,
      invalidated_at = statement_timestamp(),
      invalidation_reason = case
        when target_now > schedule.scheduled_for + interval '15 minutes'
          or target_now >= event.starts_at
        then 'expired'
        else 'event_changed'
      end
  from public.events as event
  where event.id = schedule.event_id
    and schedule.is_current = true
    and (
      event.published = false
      or event.status not in ('scheduled', 'postponed')
      or event.starts_at is distinct from schedule.event_starts_at_snapshot
      or target_now > schedule.scheduled_for + interval '15 minutes'
      or target_now >= event.starts_at
    );

  with due as (
    select
      campaign.id,
      campaign.dedupe_key
    from private.worship_reminder_schedules as schedule
    join private.notification_campaigns as campaign
      on campaign.id = schedule.campaign_id
    join public.events as event on event.id = schedule.event_id
    where schedule.is_current = true
      and campaign.kind = 'worship_reminder'
      and campaign.audience_kind = 'worship_reminder'
      and campaign.status = 'approved'
      and campaign.approved_at is not null
      and campaign.approved_by is not null
      and event.published = true
      and event.status in ('scheduled', 'postponed')
      and event.starts_at = schedule.event_starts_at_snapshot
      and schedule.scheduled_for <= target_now
      and target_now <= schedule.scheduled_for + interval '15 minutes'
      and target_now < event.starts_at
    order by schedule.scheduled_for, campaign.id
    for update of campaign, event skip locked
  ),
  inserted as (
    insert into private.notification_outbox (
      campaign_id, dedupe_key, available_at
    )
    select due.id, due.dedupe_key, target_now
    from due
    on conflict (dedupe_key) do nothing
    returning campaign_id
  ),
  queued as (
    update private.notification_campaigns as campaign
    set status = 'queued',
        queued_at = target_now
    from inserted
    where campaign.id = inserted.campaign_id
      and campaign.status = 'approved'
    returning campaign.id
  )
  select count(*)::integer into queued_count from queued;

  return queued_count;
end;
$$;

revoke all on function public.create_notification_campaign(
  text, text, text, text, text, bigint, uuid, text
) from public, anon, authenticated;
revoke all on function public.update_notification_campaign(
  uuid, text, text, text, text, text, bigint, uuid, text
) from public, anon, authenticated;
revoke all on function public.approve_notification_campaign(uuid)
from public, anon, authenticated;
revoke all on function public.queue_notification_campaign(uuid)
from public, anon, authenticated;
revoke all on function public.schedule_worship_reminder_campaigns(
  bigint, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.schedule_worship_reminder_campaign(bigint, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.list_worship_reminder_schedules()
from public, anon, authenticated, service_role;
revoke all on function public.service_claim_notification_outbox(text, integer)
from public, anon, authenticated;
revoke all on function public.service_queue_due_worship_reminders(timestamptz)
from public, anon, authenticated;
revoke all on function public.publish_legal_document(bigint)
from public, anon, authenticated;

grant execute on function
  public.create_notification_campaign(text, text, text, text, text, bigint, uuid, text),
  public.update_notification_campaign(uuid, text, text, text, text, text, bigint, uuid, text),
  public.approve_notification_campaign(uuid),
  public.queue_notification_campaign(uuid)
to authenticated, service_role;

grant execute on function
  public.schedule_worship_reminder_campaigns(bigint, text, text, text, text),
  public.schedule_worship_reminder_campaign(bigint, text, text),
  public.list_worship_reminder_schedules()
to authenticated;

grant execute on function
  public.service_claim_notification_outbox(text, integer),
  public.service_queue_due_worship_reminders(timestamptz)
to service_role;

grant execute on function public.publish_legal_document(bigint)
to authenticated, service_role;

commit;
