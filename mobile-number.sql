-- Adds the mobile number to registration (run after schema.sql).
-- The number is saved on the employee (people.phone) and shows in the HR page's Phone column.
drop function if exists public.register_for_event(text,text,text,text,text);
create or replace function public.register_for_event(p_event text, p_code text, p_name text, p_email text, p_attending text, p_phone text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare ev public.events; ph text := regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g');
begin
  select * into ev from public.events where id = p_event;
  if not found then return jsonb_build_object('ok', false, 'error', 'event_not_found'); end if;
  if ev.status = 'closed' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  if p_code !~ '^[0-9]{4}$' or p_code::int < 1000 or p_code::int > 2999 then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if length(trim(coalesce(p_name,''))) < 3 or coalesce(p_email,'') !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or p_attending not in ('Yes','No')
    then return jsonb_build_object('ok', false, 'error', 'invalid_input'); end if;
  if exists (select 1 from public.registrations where event_id = p_event and code = p_code)
    then return jsonb_build_object('ok', false, 'error', 'duplicate'); end if;
  insert into public.registrations(event_id, code, name, email, attending, registered_at, source, status)
    values (p_event, p_code, trim(p_name), trim(p_email), p_attending, now(), 'Registration', '');
  insert into public.people(code, name, email, phone) values (p_code, trim(p_name), trim(p_email), ph)
    on conflict (code) do update set name = case when public.people.name = '' then excluded.name else public.people.name end,
                                     email = case when public.people.email = '' then excluded.email else public.people.email end,
                                     phone = case when excluded.phone <> '' then excluded.phone else public.people.phone end,
                                     updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.register_for_event(text,text,text,text,text,text) from public;
grant execute on function public.register_for_event(text,text,text,text,text,text) to anon, authenticated;

-- Fayoum trip date: 5 December 2026, 8:00 AM Cairo time
update public.events set event_date = '2026-12-05 08:00+02' where id = 'fayoum';
