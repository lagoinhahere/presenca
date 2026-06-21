alter table public.class_sessions
  add column if not exists banner_url text;

alter table public.checkins
  add column if not exists receipt_requested boolean not null default false,
  add column if not exists receipt_sent_at timestamptz,
  add column if not exists receipt_error text;
