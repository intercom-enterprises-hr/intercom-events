-- Open access: hr.html works without sign-in.
-- Run AFTER schema.sql. WARNING: anyone with the HR link can read and edit
-- events, registrations and people (names, emails, phones).
drop policy if exists events_hr_write on public.events;
drop policy if exists people_hr_all   on public.people;
drop policy if exists regs_hr_all     on public.registrations;
drop policy if exists events_open_write on public.events;
drop policy if exists people_open_all   on public.people;
drop policy if exists regs_open_all     on public.registrations;
create policy events_open_write on public.events        for all to anon, authenticated using (true) with check (true);
create policy people_open_all   on public.people        for all to anon, authenticated using (true) with check (true);
create policy regs_open_all     on public.registrations for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.events, public.people, public.registrations to anon, authenticated;
