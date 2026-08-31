-- Keep notification navigation inside destinations implemented by the mobile
-- app.  This is the database equivalent of packages/domain/src/mobile.ts and
-- is deliberately stricter than the original syntactic URI check.

begin;

create function private.is_supported_notification_deep_link(
  target_deep_link text
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    target_deep_link is not null
    and target_deep_link = pg_catalog.btrim(target_deep_link)
    and pg_catalog.char_length(target_deep_link) <= 1000
    and target_deep_link ~ E'^jubileeworship://(?:notifications|notification-settings|privacy|worship|media|guide|worship/[A-Za-z0-9][A-Za-z0-9_-]*(?:/songlist)?)(?:\\?[A-Za-z0-9_%=&.-]+)?$';
$$;

revoke all on function private.is_supported_notification_deep_link(text)
from public, anon, authenticated, service_role;

comment on function private.is_supported_notification_deep_link(text) is
  'Returns true only for production-scheme mobile destinations supported by the Jubilee Worship app.';

-- Prevent a dispatcher from observing an old unsupported route while this
-- migration normalizes stored rows and installs the stricter invariant.
lock table private.notification_campaigns in access exclusive mode;

-- Preserve every campaign and every already-valid route.  An unsupported
-- legacy route is made non-navigable instead of being guessed, redirected, or
-- allowed to reach a device.
update private.notification_campaigns
set deep_link = null
where deep_link is not null
  and not private.is_supported_notification_deep_link(deep_link);

alter table private.notification_campaigns
  add constraint notification_campaigns_deep_link_supported
  check (
    deep_link is null
    or private.is_supported_notification_deep_link(deep_link)
  ) not valid;

alter table private.notification_campaigns
  validate constraint notification_campaigns_deep_link_supported;

comment on constraint notification_campaigns_deep_link_supported
on private.notification_campaigns is
  'Allows only known jubilee-worship mobile destinations; NULL means no navigation target.';

commit;
