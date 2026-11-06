create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin','faculty')),
  full_name text
);
create table public.faculty (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users on delete set null,
  faculty_id text unique not null,
  full_name text not null,
  email text unique not null,
  department text not null,
  position text not null,
  photo_url text,
  created_at timestamptz default now()
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz default now()
);
create table public.programs (
  slug text primary key,
  name text not null,
  abbreviation text,
  short_description text,
  overview text,
  description text,
  objectives text[],
  image_url text,
  is_placeholder boolean not null default true
);

create function public.is_admin() returns boolean
language sql security definer set search_path = public stable as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

alter table profiles enable row level security;
alter table faculty enable row level security;
alter table announcements enable row level security;
alter table programs enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid());
create policy "admin reads profiles" on profiles for select using (is_admin());
create policy "admin manages faculty" on faculty for all using (is_admin()) with check (is_admin());
create policy "faculty reads self" on faculty for select using (user_id = auth.uid());
create policy "public reads published" on announcements for select using (published = true);
create policy "admin manages announcements" on announcements for all using (is_admin()) with check (is_admin());
create policy "public reads programs" on programs for select using (true);
create policy "admin manages programs" on programs for all using (is_admin()) with check (is_admin());

-- PLACEHOLDER programs: replace with verified PUP-Unisan programs (Table Editor or SQL).
insert into programs (slug, name, abbreviation, short_description, overview, description, objectives) values
('placeholder-1','Program Name 1 (Placeholder)','ABBR1','Placeholder: replace with the verified short description.','Placeholder overview.','Placeholder description.',array['Placeholder objective']),
('placeholder-2','Program Name 2 (Placeholder)','ABBR2','Placeholder: replace with the verified short description.','Placeholder overview.','Placeholder description.',array['Placeholder objective']),
('placeholder-3','Program Name 3 (Placeholder)','ABBR3','Placeholder: replace with the verified short description.','Placeholder overview.','Placeholder description.',array['Placeholder objective']);

-- FIRST ADMIN: create a user in Supabase Auth > Users, then run with that user's id:
-- insert into profiles (id, role, full_name) values ('<AUTH_USER_UUID>','admin','Site Administrator');
