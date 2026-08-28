CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT NOT NULL,
  total_xp INTEGER NOT NULL DEFAULT 0,
  best_reps INTEGER NOT NULL DEFAULT 0,
  battles INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by signed-in users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.pushup_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reps INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pushup_records TO authenticated;
GRANT ALL ON public.pushup_records TO service_role;
ALTER TABLE public.pushup_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own records"
  ON public.pushup_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own records"
  ON public.pushup_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX pushup_records_user_created_idx ON public.pushup_records (user_id, created_at DESC);
CREATE INDEX profiles_total_xp_idx ON public.profiles (total_xp DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'username', ''), split_part(NEW.email, '@', 1), 'fighter')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.apply_pushup_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.xp_earned := GREATEST(NEW.reps, 0) * 10;
  UPDATE public.profiles
  SET total_xp = total_xp + NEW.xp_earned,
      best_reps = GREATEST(best_reps, GREATEST(NEW.reps, 0)),
      battles = battles + 1,
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_pushup_record_insert
BEFORE INSERT ON public.pushup_records
FOR EACH ROW EXECUTE FUNCTION public.apply_pushup_record();