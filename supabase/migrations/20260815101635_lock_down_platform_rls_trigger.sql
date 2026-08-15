-- Hosted projects created after the Data API auto-exposure change install an
-- event-trigger helper that enables RLS on new public tables. Event triggers do
-- not need API callers to have EXECUTE on their backing function, so remove the
-- default PUBLIC grant when the managed helper is present. Local Supabase does
-- not currently install this helper; the conditional keeps reset reproducible.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute
      'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
