-- Isolate development and preview push installations from production
-- campaigns. Existing pre-release installations predate build variants and are
-- conservatively treated as development so they cannot enter a production
-- audience; every installation created after this migration must declare a
-- valid variant explicitly.

alter table private.app_installations
  add column app_variant text;

update private.app_installations
set app_variant = 'development'
where app_variant is null;

alter table private.app_installations
  alter column app_variant set not null,
  add constraint app_installations_app_variant_valid check (
    app_variant in ('development', 'preview', 'production')
  );

-- Remove the pre-variant service overloads so a caller cannot accidentally
-- create a production installation by omitting its build environment.
revoke all on function public.service_register_app_installation(
  uuid, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
drop function public.service_register_app_installation(
  uuid, text, text, text, text, text, boolean, boolean, boolean
);

revoke all on function public.service_update_app_installation(
  uuid, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
drop function public.service_update_app_installation(
  uuid, text, text, text, text, boolean, boolean, boolean
);

create function public.service_register_app_installation(
  target_installation_id uuid,
  target_secret_hash text,
  target_platform text,
  target_app_version text,
  target_app_variant text,
  target_expo_push_token text,
  target_token_hash text,
  target_worship_reminder boolean,
  target_schedule_changes boolean,
  target_setlist_updates boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_installation_id is null then
    raise exception using errcode = '22004', message = 'Installation ID is required';
  end if;

  if target_app_variant is null
    or target_app_variant not in ('development', 'preview', 'production')
  then
    raise exception using errcode = '22023', message = 'Valid app variant is required';
  end if;

  insert into private.app_installations (
    id, secret_hash, platform, app_version, app_variant
  )
  values (
    target_installation_id,
    target_secret_hash,
    target_platform,
    target_app_version,
    target_app_variant
  );

  insert into private.notification_subscriptions (
    installation_id, worship_reminder, schedule_changes, setlist_updates
  )
  values (
    target_installation_id,
    target_worship_reminder,
    target_schedule_changes,
    target_setlist_updates
  );

  insert into private.push_endpoints (
    installation_id, expo_push_token, token_hash, platform
  )
  values (
    target_installation_id,
    target_expo_push_token,
    target_token_hash,
    target_platform
  );

  return target_installation_id;
end;
$$;

-- The variant is immutable for an installation credential. If a build changes
-- environment, the client receives the existing invalid-installation response,
-- discards that credential, and registers a new environment-scoped identity.
create function public.service_update_app_installation(
  target_installation_id uuid,
  target_secret_hash text,
  target_app_version text,
  target_app_variant text,
  target_expo_push_token text,
  target_token_hash text,
  target_worship_reminder boolean,
  target_schedule_changes boolean,
  target_setlist_updates boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  installation_platform text;
  wants_notifications boolean :=
    target_worship_reminder
    or target_schedule_changes
    or target_setlist_updates;
begin
  if target_app_variant is null
    or target_app_variant not in ('development', 'preview', 'production')
  then
    raise exception using errcode = '22023', message = 'Valid app variant is required';
  end if;

  if (target_expo_push_token is null) <> (target_token_hash is null) then
    raise exception using
      errcode = '22004',
      message = 'Push token and token hash must be supplied together';
  end if;

  select installation.platform
  into installation_platform
  from private.app_installations as installation
  where installation.id = target_installation_id
    and installation.secret_hash = target_secret_hash
    and installation.app_variant = target_app_variant
    and (
      installation.disabled_at is null
      or installation.disable_reason = 'stale_inactivity'
    )
  for update;

  if installation_platform is null then
    raise exception using errcode = '28000', message = 'Invalid installation credentials';
  end if;

  update private.app_installations
  set app_version = target_app_version,
      last_seen_at = statement_timestamp(),
      disabled_at = null,
      disable_reason = null
  where id = target_installation_id;

  update private.notification_subscriptions
  set worship_reminder = target_worship_reminder,
      schedule_changes = target_schedule_changes,
      setlist_updates = target_setlist_updates
  where installation_id = target_installation_id;

  if not wants_notifications then
    update private.push_endpoints
    set is_active = false,
        disabled_at = coalesce(disabled_at, statement_timestamp()),
        disable_reason = 'all_subscriptions_disabled'
    where installation_id = target_installation_id;
    return;
  end if;

  if target_expo_push_token is not null then
    update private.push_endpoints
    set expo_push_token = target_expo_push_token,
        token_hash = target_token_hash,
        platform = installation_platform,
        is_active = true,
        last_registered_at = statement_timestamp(),
        disabled_at = null,
        disable_reason = null
    where installation_id = target_installation_id;

    if not found then
      insert into private.push_endpoints (
        installation_id, expo_push_token, token_hash, platform
      )
      values (
        target_installation_id,
        target_expo_push_token,
        target_token_hash,
        installation_platform
      );
    end if;
  end if;
end;
$$;

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
      or (
        installation.app_variant = 'production'
        and (
          (campaign.audience_kind = 'worship_reminder'
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
      )
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

revoke all on function public.service_register_app_installation(
  uuid, text, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated;
revoke all on function public.service_update_app_installation(
  uuid, text, text, text, text, text, boolean, boolean, boolean
) from public, anon, authenticated;

grant execute on function
  public.service_register_app_installation(
    uuid, text, text, text, text, text, text, boolean, boolean, boolean
  ),
  public.service_update_app_installation(
    uuid, text, text, text, text, text, boolean, boolean, boolean
  )
to service_role;
