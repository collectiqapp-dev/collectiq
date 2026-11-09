-- Business details (optionally extracted from the user's website) and
-- first-run onboarding tour state.
alter table public.profiles
  add column if not exists business_website text,
  add column if not exists business_description text,
  add column if not exists business_email text,
  add column if not exists business_phone text,
  add column if not exists business_address text,
  add column if not exists tour_completed_at timestamptz;
