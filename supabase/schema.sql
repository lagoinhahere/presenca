create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  platform_name text not null default 'Lagoinha Here!',
  church_name text not null default 'Lagoinha Americana',
  welcome_text text not null default 'Bem-vindo! Confirme sua presenca com poucos toques.',
  footer_text text not null default 'Lagoinha Americana - cuidado, ensino e comunhao.',
  primary_color text not null default '#ffc400',
  accent_color text not null default '#ffc400',
  logo_url text default '/brand-logo.png',
  default_banner_url text default '/brand-cover.png',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_name text,
  event_date date,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  location text,
  banner_url text,
  color text not null default '#ffc400',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  description text,
  session_date date,
  starts_at time,
  location text,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed', 'archived')),
  qr_token uuid not null default gen_random_uuid() unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  normalized_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_email_unique unique (email),
  constraint students_phone_unique unique (phone)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  note text,
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create index if not exists idx_courses_status_date on public.courses(status, event_date);
create index if not exists idx_class_sessions_course_date on public.class_sessions(course_id, session_date);
create index if not exists idx_class_sessions_qr_token on public.class_sessions(qr_token);
create index if not exists idx_students_normalized_name on public.students(normalized_name);
create index if not exists idx_checkins_class_time on public.checkins(class_id, checked_in_at desc);
create index if not exists idx_checkins_student on public.checkins(student_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at before update on public.courses for each row execute function public.set_updated_at();

drop trigger if exists set_class_sessions_updated_at on public.class_sessions;
create trigger set_class_sessions_updated_at before update on public.class_sessions for each row execute function public.set_updated_at();

drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at before update on public.students for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, is_admin)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.app_settings (
  id,
  platform_name,
  church_name,
  welcome_text,
  footer_text,
  primary_color,
  accent_color,
  logo_url,
  default_banner_url
)
values (
  '00000000-0000-0000-0000-000000000001',
  'Lagoinha Here!',
  'Lagoinha Americana',
  'Bem-vindo! Confirme sua presenca com poucos toques.',
  'Lagoinha Americana - cuidado, ensino e comunhao.',
  '#050505',
  '#ffc400',
  '/brand-logo.png',
  '/brand-cover.png'
)
on conflict (id) do update
set
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  logo_url = coalesce(public.app_settings.logo_url, excluded.logo_url),
  default_banner_url = coalesce(public.app_settings.default_banner_url, excluded.default_banner_url)
where public.app_settings.primary_color in ('#118c7e', '#050505');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_admin = true
  );
$$;

create or replace function public.get_class_checkin_count(target_qr_token text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.checkins ci
  join public.class_sessions cs on cs.id = ci.class_id
  where cs.qr_token::text = target_qr_token
    and cs.status <> 'archived';
$$;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.courses enable row level security;
alter table public.class_sessions enable row level security;
alter table public.students enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles" on public.profiles for select using (public.is_admin() or id = auth.uid());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can read settings" on public.app_settings;
create policy "Anyone can read settings" on public.app_settings for select using (true);

drop policy if exists "Admins can manage settings" on public.app_settings;
create policy "Admins can manage settings" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can read active courses" on public.courses;
create policy "Anyone can read active courses" on public.courses for select using (status <> 'archived' or public.is_admin());

drop policy if exists "Admins can manage courses" on public.courses;
create policy "Admins can manage courses" on public.courses for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can read public sessions" on public.class_sessions;
create policy "Anyone can read public sessions" on public.class_sessions for select using (status <> 'archived' or public.is_admin());

drop policy if exists "Admins can manage sessions" on public.class_sessions;
create policy "Admins can manage sessions" on public.class_sessions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read students" on public.students;
create policy "Admins can read students" on public.students for select using (public.is_admin());

drop policy if exists "Public can find or create students" on public.students;
create policy "Public can find or create students" on public.students for insert with check (true);

drop policy if exists "Public can read students for duplicate check" on public.students;
create policy "Public can read students for duplicate check" on public.students for select using (true);

drop policy if exists "Admins can manage students" on public.students;
create policy "Admins can manage students" on public.students for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read checkins" on public.checkins;
create policy "Admins can read checkins" on public.checkins for select using (public.is_admin());

drop policy if exists "Public can create checkins" on public.checkins;
create policy "Public can create checkins" on public.checkins for insert with check (true);

drop policy if exists "Admins can manage checkins" on public.checkins;
create policy "Admins can manage checkins" on public.checkins for all using (public.is_admin()) with check (public.is_admin());

grant execute on function public.get_class_checkin_count(text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can read media" on storage.objects;
create policy "Anyone can read media" on storage.objects for select using (bucket_id = 'media');

drop policy if exists "Admins can upload media" on storage.objects;
create policy "Admins can upload media" on storage.objects for insert with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "Admins can update media" on storage.objects;
create policy "Admins can update media" on storage.objects for update using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "Admins can delete media" on storage.objects;
create policy "Admins can delete media" on storage.objects for delete using (bucket_id = 'media' and public.is_admin());
