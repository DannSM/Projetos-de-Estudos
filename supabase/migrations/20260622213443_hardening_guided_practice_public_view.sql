begin;

create policy learning_activities_public_guided_practice_select
on public.learning_activities
for select
to anon, authenticated
using (
  is_active = true
  and status = 'active'
  and metadata ->> 'format' = 'guided_practice'
);

grant select (
  id,
  slug,
  activity_type,
  title,
  subtitle,
  track_slug,
  track_title,
  step_order,
  status,
  level_label,
  estimated_minutes,
  metadata,
  is_active
) on public.learning_activities to anon, authenticated;

alter view public.vw_guided_practice_activities_public
set (security_invoker = true, security_barrier = true);

grant select on public.vw_guided_practice_activities_public to anon, authenticated;

commit;
