-- Run once in Supabase SQL Editor. Adds the real programs, editable site content, and admin-managed pages.
delete from programs where slug like 'placeholder-%';
insert into programs (slug,name,abbreviation,short_description,overview,description,objectives,is_placeholder) values
('beed','Bachelor of Elementary Education','BEED','A four-year teacher education program for those who want to teach in elementary schools.','The BEED program prepares future elementary school teachers. Students study child development, teaching methods, curriculum and the core subjects taught in the elementary grades.','Students learn how to plan lessons, manage a classroom, assess learning and support young learners, and they gain hands-on experience through practice teaching. Graduates may take the Licensure Examination for Teachers to become professional teachers.',array['Develop competent and caring elementary school teachers','Build strong mastery of the subjects taught in the elementary grades','Provide classroom experience through practice teaching'],false),
('bsent','Bachelor of Science in Entrepreneurship','BSENT','A four-year business program focused on starting, running and growing a business.','The BSENT program trains students to become entrepreneurs who can set up, manage and operate a business.','Coursework covers business planning, marketing, finance, operations and management, with an emphasis on spotting opportunities and turning ideas into working enterprises. Graduates may start their own ventures or work in business, trade and service organizations.',array['Set up a business','Manage and operate a business','Apply business planning, marketing and financial skills'],false),
('bsit','Bachelor of Science in Information Technology','BSIT','A four-year program on building, managing and securing computer systems and software.','The BSIT program prepares students for careers in the technology industry, from software and web development to networks, databases and technical support.','Students learn programming, systems analysis, database management, networking and web technologies, and they apply these skills through projects and a capstone. Graduates can work as developers, system and network administrators, or IT support and project professionals.',array['Develop practical programming and systems skills','Prepare students to manage networks, databases and IT infrastructure','Encourage responsible, ethical use of technology'],false),
('dit','Diploma in Information Technology','DIT','A three-year, job-focused diploma in computing and information technology.','The DIT program is a technical, hands-on diploma that gives students the core skills needed for entry-level work in information technology.','Students train in programming, computer hardware and software, networking and basic systems support. The ladderized design helps graduates enter the workforce and continue toward a bachelor''s degree.',array['Provide hands-on training in computing and IT tools','Prepare graduates for entry-level IT work','Offer a pathway to further studies'],false),
('domt','Diploma in Office Management Technology','DOMT','A three-year diploma that prepares students for office management and administration work.','The DOMT program prepares students for careers in office management and administration, including legal and medical office settings.','Students develop office procedures, records management, business communication and office technology skills. Graduates can work as administrative assistants, secretaries, coordinators and supervisors.',array['Develop efficient office administration skills','Build business communication and records management abilities','Prepare graduates for office and administrative roles'],false),
('mem','Master in Education Management','MEM','A graduate program for teachers and school leaders in education management.','The MEM program is for educators who want to grow as school leaders, administrators and supervisors.','Students study educational leadership, school administration, supervision, curriculum management and research, building the skills to lead schools and improve learning.',array['Strengthen leadership and management skills in education','Develop research and decision-making abilities','Prepare educators for supervisory and administrative roles'],false),
('mpa','Master in Public Administration','MPA','A graduate program in public management, administration and governance.','The MPA program gives working professionals advanced training in public management, administration and governance.','Students study public policy, organizational management, public finance and governance, and they carry out research on real public-sector problems. It suits government employees and others who want to lead in public service.',array['Build advanced competence in public administration and governance','Develop policy analysis and research skills','Prepare professionals for leadership in public service'],false)
on conflict (slug) do update set name=excluded.name,abbreviation=excluded.abbreviation,short_description=excluded.short_description,
 overview=excluded.overview,description=excluded.description,objectives=excluded.objectives,is_placeholder=false;

create table if not exists public.site_settings (key text primary key, value text not null default '');
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, title text not null, subtitle text,
  body text not null default '', published boolean not null default true,
  show_in_menu boolean not null default true, sort_order int not null default 100,
  created_at timestamptz default now());
alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
drop policy if exists "public reads settings" on public.site_settings;
drop policy if exists "admin manages settings" on public.site_settings;
drop policy if exists "public reads published pages" on public.pages;
drop policy if exists "admin manages pages" on public.pages;
create policy "public reads settings" on public.site_settings for select using (true);
create policy "admin manages settings" on public.site_settings for all using (is_admin()) with check (is_admin());
create policy "public reads published pages" on public.pages for select using (published = true);
create policy "admin manages pages" on public.pages for all using (is_admin()) with check (is_admin());

insert into public.site_settings (key,value) values
('intro','Tanglaw ng Bayan (Light of Nation). A satellite campus of the Polytechnic University of the Philippines in Unisan, Quezon.'),
('history','PUP Unisan was established in 1987, originally conceived by local officials as a contribution to the welfare of out-of-school youth in the area. It began as a vocational-technical school before growing into a full satellite campus of the Polytechnic University of the Philippines.'),
('background','The Polytechnic University of the Philippines is a state university with campuses across the country. Unisan Campus is part of the PUP System and offers undergraduate and graduate programs to students from Unisan and nearby towns.'),
('vision','A Leading Comprehensive Polytechnic University in Asia.'),
('mission','Advance an Inclusive, Equitable, and Globally Relevant Polytechnic Education Towards National Development.'),
('motto','Tanglaw ng Bayan (Light of Nation)'),
('established','1987'),
('colors','Maroon and Gold'),
('address','Brgy. Kalilayan Ibaba, Unisan, Quezon'),
('email','unisan@pup.edu.ph'),
('admission_url','https://www.pup.edu.ph/iapply')
on conflict (key) do nothing;
