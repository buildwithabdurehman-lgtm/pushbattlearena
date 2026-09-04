CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country text;
BEGIN
  v_country := upper(NULLIF(NEW.raw_user_meta_data ->> 'country_code', ''));
  IF v_country IS NOT NULL AND v_country !~ '^[A-Z]{2}$' THEN
    v_country := NULL;
  END IF;

  INSERT INTO public.profiles (id, username, country_code)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'username', ''), split_part(NEW.email, '@', 1), 'fighter'),
    v_country
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;