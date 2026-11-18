-- Event feedback survey (run after schema.sql, open-access.sql and mobile-number.sql)
create table if not exists public.feedback (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null references public.events(id) on update cascade on delete cascade,
  code         text not null check (code ~ '^[0-9]{4}$'),
  name         text not null default '',
  attended     boolean not null,
  overall      int check (overall between 1 and 5),
  parts        jsonb not null default '{}'::jsonb,   -- {"Jeep Convoy": 4, ...} built from the event program
  org          jsonb not null default '{}'::jsonb,   -- {"Transport": 5, "Timing": 4, "Food": 3, "Location": 5}
  join_next    text not null default '' check (join_next in ('','Yes','Maybe','No')),
  best         text not null default '',
  improve      text not null default '',
  reason       text not null default '',
  help         jsonb not null default '[]'::jsonb,
  next_events  jsonb not null default '[]'::jsonb,
  next_other   text not null default '',
  comments     text not null default '',
  created_at   timestamptz not null default now(),
  unique (event_id, code)
);
create index if not exists feedback_event_idx on public.feedback(event_id);

alter table public.feedback enable row level security;
drop policy if exists feedback_open_all on public.feedback;
create policy feedback_open_all on public.feedback for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.feedback to anon, authenticated;

-- What the feedback page needs to know about one employee
create or replace function public.feedback_lookup(p_event text, p_code text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'name',         coalesce((select r.name from public.registrations r where r.event_id = p_event and r.code = p_code),
                             (select p.name from public.people p where p.code = p_code), ''),
    'checked_in',   exists (select 1 from public.registrations r where r.event_id = p_event and r.code = p_code and r.checked_in_at is not null),
    'any_checkins', exists (select 1 from public.registrations r where r.event_id = p_event and r.checked_in_at is not null),
    'replied',      exists (select 1 from public.feedback f where f.event_id = p_event and f.code = p_code))
$$;

-- Save one feedback reply (one per employee per event)
create or replace function public.submit_feedback(p_event text, p_code text, p_name text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare att boolean; ov int;
begin
  if not exists (select 1 from public.events where id = p_event) then return jsonb_build_object('ok', false, 'error', 'event_not_found'); end if;
  if p_code !~ '^[0-9]{4}$' or p_code::int < 1000 or p_code::int > 6999 then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if length(trim(coalesce(p_name,''))) < 2 then return jsonb_build_object('ok', false, 'error', 'invalid_input'); end if;
  att := (p_data->>'attended')::boolean;
  if att is null then return jsonb_build_object('ok', false, 'error', 'invalid_input'); end if;
  ov := nullif(p_data->>'overall','')::int;
  if att and (ov is null or ov < 1 or ov > 5 or coalesce(p_data->>'join_next','') not in ('Yes','Maybe','No')) then return jsonb_build_object('ok', false, 'error', 'invalid_input'); end if;
  if not att and coalesce(trim(p_data->>'reason'),'') = '' then return jsonb_build_object('ok', false, 'error', 'invalid_input'); end if;
  if exists (select 1 from public.feedback where event_id = p_event and code = p_code) then return jsonb_build_object('ok', false, 'error', 'duplicate'); end if;
  insert into public.feedback(event_id, code, name, attended, overall, parts, org, join_next, best, improve, reason, help, next_events, next_other, comments)
  values (p_event, p_code, trim(p_name), att, case when att then ov end,
          case when att and jsonb_typeof(p_data->'parts') = 'object' then p_data->'parts' else '{}'::jsonb end,
          case when att and jsonb_typeof(p_data->'org') = 'object' then p_data->'org' else '{}'::jsonb end,
          case when att then p_data->>'join_next' else '' end,
          left(coalesce(p_data->>'best',''), 2000), left(coalesce(p_data->>'improve',''), 2000),
          case when att then '' else left(p_data->>'reason', 200) end,
          case when jsonb_typeof(p_data->'help') = 'array' then p_data->'help' else '[]'::jsonb end,
          case when jsonb_typeof(p_data->'next_events') = 'array' then p_data->'next_events' else '[]'::jsonb end,
          left(coalesce(p_data->>'next_other',''), 300), left(coalesce(p_data->>'comments',''), 2000));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.feedback_lookup(text,text) from public;
revoke all on function public.submit_feedback(text,text,text,jsonb) from public;
grant execute on function public.feedback_lookup(text,text) to anon, authenticated;
grant execute on function public.submit_feedback(text,text,text,jsonb) to anon, authenticated;
