-- Department for each reply (run after registration-deadline.sql).
-- Adds a department column and lets the registration page send it.
alter table public.registrations add column if not exists department text not null default '';
alter table public.people        add column if not exists department text not null default '';

drop function if exists public.register_for_event(text,text,text,text,text,text);
create or replace function public.register_for_event(p_event text, p_code text, p_name text, p_email text, p_attending text, p_phone text default '', p_department text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare ev public.events; ph text := regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g'); dp text := left(trim(coalesce(p_department,'')), 80);
begin
  select * into ev from public.events where id = p_event;
  if not found then return jsonb_build_object('ok', false, 'error', 'event_not_found'); end if;
  if ev.status = 'closed' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  if ev.deadline is not null and now() >= ev.deadline then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  if p_code !~ '^[0-9]{4}$' or p_code::int < 1000 or p_code::int > 8999 then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if length(trim(coalesce(p_name,''))) < 3 or coalesce(p_email,'') !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or p_attending not in ('Yes','No')
    then return jsonb_build_object('ok', false, 'error', 'invalid_input'); end if;
  if exists (select 1 from public.registrations where event_id = p_event and code = p_code)
    then return jsonb_build_object('ok', false, 'error', 'duplicate'); end if;
  insert into public.registrations(event_id, code, name, email, attending, registered_at, source, status, department)
    values (p_event, p_code, trim(p_name), trim(p_email), p_attending, now(), 'Registration', '', dp);
  insert into public.people(code, name, email, phone, department) values (p_code, trim(p_name), trim(p_email), ph, dp)
    on conflict (code) do update set name = case when public.people.name = '' then excluded.name else public.people.name end,
                                     email = case when public.people.email = '' then excluded.email else public.people.email end,
                                     phone = case when excluded.phone <> '' then excluded.phone else public.people.phone end,
                                     department = case when excluded.department <> '' then excluded.department else public.people.department end,
                                     updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.register_for_event(text,text,text,text,text,text,text) from public;
grant execute on function public.register_for_event(text,text,text,text,text,text,text) to anon, authenticated;
notify pgrst, 'reload schema';
