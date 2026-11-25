# Intercom | Company Events

Two static pages that share one Supabase database:

- `registration.html` - public page employees open (`registration.html?event=<id>`)
- `hr.html` - HR control room (open, no sign-in): attendance, check-in, walk-ins, analytics
- `schema.sql` - the database (tables, security rules, first event)
- `open-access.sql` - run after `schema.sql`: removes the HR sign-in. Anyone with the HR link can read and edit all data.

## Setup (about 15 minutes)

1. **Supabase**: create a project at supabase.com (your own account).
2. **Database**: Dashboard > SQL Editor > New query > paste `schema.sql` > Run.
   Before running, change `hr@your-company.com` (last line) to the real HR email(s).
3. **HR users**: Authentication > Users > Add user > Create new user. Use the same email(s) as step 2, set a password, tick *Auto Confirm User*.
   Then Authentication > Sign In / Providers > turn **off** "Allow new users to sign up".
4. **Keys**: Project Settings > API (or API Keys). Copy the **Project URL** and the **anon / publishable** key.
   Never use the `service_role` / secret key in these files.
5. **Edit both HTML files**: at the top of the `<script>` section fill in `SUPABASE_URL` and `SUPABASE_KEY`.
   In `hr.html` also fill `REG_URL` with the final address of `registration.html` (so the Link button builds `.../registration.html?event=<id>`).
6. **Host**: push this folder to GitHub and turn on Pages (Settings > Pages > Deploy from branch > main / root).
   Registration: `https://<user>.github.io/<repo>/registration.html`
   HR: `https://<user>.github.io/<repo>/hr.html`
   (Netlify Drop or an intranet server work the same way.)

## How it stays safe

- The anon key is meant to be public. The database rules (row-level security) decide what it can do.
- Employees (not logged in) can only: read events, look up a name by code, and send one reply per event through `register_for_event`.
- Everything else (registrations list, phones, check-ins, editing events) needs an HR login whose email is in `hr_admins`.
- The HR page URL is not secret, but without a login it shows nothing.

## Daily use

HR opens `hr.html` (no sign-in), picks the event, and ticks people as they arrive. Use **New event** to create the next event; its link is `registration.html?event=<id>` (Link button). Events appear in the list immediately for everyone.

**Delete** (next to Edit) removes the selected event together with all its replies and feedback, after you tick a confirmation box. It cannot be undone.

**Registration deadline** (a date and time, set in **Edit** or with "change" above the list):

- The registration page shows "Registration closes on …".
- When the deadline is reached, registration **closes automatically**: the form disappears, and the database refuses late replies once `registration-deadline.sql` has been run in the Supabase SQL Editor.
- To give people more time, move the deadline later. Registration opens again by itself.
- **Registration → Closed now** in Edit closes it right away, whatever the deadline.
- The HR list shows **Open**, **Closed (deadline passed)** or **Closed by HR** next to the deadline.

**Department**: employees pick their department on the registration form (required). Run `department.sql` once in the Supabase SQL Editor to add it to the database. The department list lives in two places: the dropdown in `registration.html` and `DEPTS` in `hr.html`. People who registered before this was added show as **Not set**.

On the HR page:

- The department dropdown next to the search filters the list, the tiles and the event analytics.
- Analytics has a **By department** table (confirmed, apologized before/after the deadline, walk-ins, no response, checked in).
- **⬇ Excel** downloads the event's list (plus a By department sheet). It follows the department filter.
- **⬇ Download PDF** in Analytics saves the analytics as a PDF.

## Demo mode

If `SUPABASE_URL` / `SUPABASE_KEY` are empty, both pages run on sample data stored in the browser only, so you can preview the design before connecting.
