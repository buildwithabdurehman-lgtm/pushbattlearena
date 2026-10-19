ALTER TABLE public.profiles
  ADD COLUMN gender text,
  ADD COLUMN age integer,
  ADD COLUMN height_cm integer,
  ADD COLUMN weight_kg integer,
  ADD COLUMN activity_level text,
  ADD COLUMN goal text,
  ADD COLUMN training_days integer,
  ADD COLUMN equipment text,
  ADD COLUMN session_minutes integer,
  ADD COLUMN onboarded_at timestamp with time zone;

COMMENT ON COLUMN public.profiles.onboarded_at IS 'Set when the fighter finishes the new-user setup wizard';