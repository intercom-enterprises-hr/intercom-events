-- =====================================================================
-- Intercom | Company Events  -  Supabase schema
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run
-- =====================================================================

-- 1) TABLES ------------------------------------------------------------
create table if not exists public.events (
  id          text primary key,                       -- used in the link: ?event=<id>
  name        text not null,
  event_date  timestamptz,
  deadline    timestamptz,
  location    text default '',
  cost        text default 'Free',
  tagline     text default '',
  theme       text not null default 'classic' check (theme in ('desert','beach','classic')),
  program     jsonb not null default '[]'::jsonb,     -- [{title,text,time,scene}]
  status      text not null default 'open' check (status in ('open','closed')),
  countdown   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.people (            -- one row per employee, reused by every event
  code        text primary key check (code ~ '^[0-9]{4}$'),
  name        text not null default '',
  email       text not null default '',
  phone       text not null default '',
  updated_at  timestamptz not null default now()
);

create table if not exists public.registrations (
  id             uuid primary key default gen_random_uuid(),
  event_id       text not null references public.events(id) on update cascade on delete cascade,
  code           text not null check (code ~ '^[0-9]{4}$'),
  name           text not null,
  email          text not null default '',
  attending      text not null check (attending in ('Yes','No','Walk-in')),
  registered_at  timestamptz,
  checked_in_at  timestamptz,
  source         text not null default 'Registration' check (source in ('Registration','Walk-in')),
  status         text not null default '' check (status in ('','confirmed','apol_before','apol_after','noresp','walkin')),
  unique (event_id, code)                              -- one reply per employee per event
);
create index if not exists registrations_event_idx on public.registrations(event_id);

create table if not exists public.hr_admins (          -- who may open the HR page
  email text primary key
);

-- 2) SECURITY ---------------------------------------------------------
create or replace function public.is_hr() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.hr_admins a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))) $$;

alter table public.events        enable row level security;
alter table public.people        enable row level security;
alter table public.registrations enable row level security;
alter table public.hr_admins     enable row level security;

drop policy if exists events_read_all   on public.events;
drop policy if exists events_hr_write   on public.events;
drop policy if exists people_hr_all     on public.people;
drop policy if exists regs_hr_all       on public.registrations;
drop policy if exists admins_hr_read    on public.hr_admins;

create policy events_read_all on public.events for select to anon, authenticated using (true);   -- the public page needs events
create policy events_hr_write on public.events for all    to authenticated using (public.is_hr()) with check (public.is_hr());
create policy people_hr_all   on public.people for all     to authenticated using (public.is_hr()) with check (public.is_hr());
create policy regs_hr_all     on public.registrations for all to authenticated using (public.is_hr()) with check (public.is_hr());
create policy admins_hr_read  on public.hr_admins for select to authenticated using (public.is_hr());

-- employees (not logged in) can ONLY use these two functions:
create or replace function public.register_for_event(p_event text, p_code text, p_name text, p_email text, p_attending text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare ev public.events;
begin
  select * into ev from public.events where id = p_event;
  if not found then return jsonb_build_object('ok', false, 'error', 'event_not_found'); end if;
  if ev.status = 'closed' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  if p_code !~ '^[0-9]{4}$' or p_code::int < 1000 or p_code::int > 6999 then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if length(trim(coalesce(p_name,''))) < 3 or coalesce(p_email,'') !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or p_attending not in ('Yes','No')
    then return jsonb_build_object('ok', false, 'error', 'invalid_input'); end if;
  if exists (select 1 from public.registrations where event_id = p_event and code = p_code)
    then return jsonb_build_object('ok', false, 'error', 'duplicate'); end if;
  insert into public.registrations(event_id, code, name, email, attending, registered_at, source, status)
    values (p_event, p_code, trim(p_name), trim(p_email), p_attending, now(), 'Registration', '');
  insert into public.people(code, name, email) values (p_code, trim(p_name), trim(p_email))
    on conflict (code) do update set name = case when public.people.name = '' then excluded.name else public.people.name end,
                                     email = case when public.people.email = '' then excluded.email else public.people.email end,
                                     updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.person_name(p_code text)       -- name only, so the form can pre-fill it
returns text language sql stable security definer set search_path = ''
as $$ select name from public.people where code = p_code and p_code ~ '^[0-9]{4}$' $$;

revoke all on function public.register_for_event(text,text,text,text,text) from public;
revoke all on function public.person_name(text) from public;
grant execute on function public.register_for_event(text,text,text,text,text) to anon, authenticated;
grant execute on function public.person_name(text) to anon, authenticated;

grant select on public.events to anon;
grant select, insert, update, delete on public.events, public.people, public.registrations to authenticated;
grant select on public.hr_admins to authenticated;

-- 3) FIRST EVENT (Fayoum) ---------------------------------------------
insert into public.events (id, name, location, cost, tagline, theme, program, status, countdown) values
('fayoum', 'Fayoum Sand-sational', 'Fayoum', 'Free',
 'Dunes, dough and a whole lot of desert. Intercom goes off-road and you are invited.', 'desert',
 '[{"title":"Meet & Mingle","text":"We gather in the morning at the company, grab a seat and roll out together.","time":"TBA","scene":"bus"},
   {"title":"Tunis Village Breakfast","text":"Hot, flaky fiteer meshaltet with honey.","time":"TBA","scene":"breakfast"},
   {"title":"Jeep Convoy","text":"We hop into 4x4 jeeps and head deep into the desert.","time":"TBA","scene":"jeep"},
   {"title":"Sand-boarding","text":"Climb it, wax it, ride it.","time":"TBA","scene":"sandboard"},
   {"title":"Camp, Grill & Stargaze","text":"Camping under the desert sky. We grill, we play, then head back at night.","time":"TBA","scene":"camp"}]'::jsonb,
 'open', true)
on conflict (id) do nothing;

-- 4) WHO IS HR?  Replace with the real HR email(s), then create the same user
--    in Authentication > Users (Add user > Create new user, tick "Auto Confirm").
insert into public.hr_admins(email) values ('hr@your-company.com') on conflict do nothing;
