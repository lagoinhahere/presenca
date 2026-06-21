alter table public.courses
  add column if not exists signature_url text;
