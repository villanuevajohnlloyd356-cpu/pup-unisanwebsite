-- Run once in Supabase SQL Editor. Stores admission applications sent from apply.html.
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_type text not null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) <= 160),
  phone text not null check (char_length(phone) between 7 and 30),
  birth_date date,
  address text check (char_length(address) <= 300),
  last_school text check (char_length(last_school) <= 160),
  program_choice text not null,
  message text check (char_length(message) <= 1000),
  status text not null default 'new' check (status in ('new','reviewing','contacted','accepted','closed')),
  admin_notes text,
  created_at timestamptz default now()
);
alter table public.applications enable row level security;
drop policy if exists "anyone can apply" on public.applications;
drop policy if exists "admin manages applications" on public.applications;
create policy "anyone can apply" on public.applications for insert to anon, authenticated with check (status = 'new');
create policy "admin manages applications" on public.applications for all using (is_admin()) with check (is_admin());
