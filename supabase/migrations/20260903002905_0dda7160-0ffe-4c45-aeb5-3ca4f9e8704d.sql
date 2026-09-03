ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS country_changed_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_country_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.country_code IS NOT NULL THEN
    NEW.country_code := upper(NEW.country_code);
    IF NEW.country_code !~ '^[A-Z]{2}$' THEN
      RAISE EXCEPTION 'Invalid country code';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.country_code IS NOT NULL THEN
      NEW.country_changed_at := now();
    END IF;
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.country_code, '') <> COALESCE(OLD.country_code, '') THEN
    IF OLD.country_code IS NOT NULL
       AND OLD.country_changed_at IS NOT NULL
       AND OLD.country_changed_at > now() - interval '30 days'
       AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'You can only change your country once every 30 days';
    END IF;
    NEW.country_changed_at := now();
  ELSE
    NEW.country_changed_at := OLD.country_changed_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_country_rules ON public.profiles;
CREATE TRIGGER profiles_country_rules
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_country_rules();

CREATE OR REPLACE FUNCTION public.period_start(_period text)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(_period)
    WHEN 'daily' THEN date_trunc('day', now())
    WHEN 'weekly' THEN date_trunc('week', now())
    WHEN 'monthly' THEN date_trunc('month', now())
    WHEN 'season' THEN date_trunc('quarter', now())
    ELSE '-infinity'::timestamptz
  END
$$;

CREATE OR REPLACE FUNCTION public.global_leaderboard(_period text DEFAULT 'season', _limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  verified boolean,
  country_code text,
  reps bigint,
  xp bigint,
  total_xp integer,
  best_reps integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.avatar_url, p.verified, p.country_code,
         COALESCE(SUM(r.reps), 0)::bigint,
         COALESCE(SUM(r.xp_earned), 0)::bigint,
         p.total_xp, p.best_reps
  FROM public.profiles p
  LEFT JOIN public.pushup_records r
    ON r.user_id = p.id
   AND r.source = 'camera'
   AND r.created_at >= public.period_start(_period)
  GROUP BY p.id
  HAVING COALESCE(SUM(r.reps), 0) > 0 OR public.period_start(_period) = '-infinity'::timestamptz
  ORDER BY COALESCE(SUM(r.reps), 0) DESC, COALESCE(SUM(r.xp_earned), 0) DESC, p.total_xp DESC
  LIMIT LEAST(GREATEST(_limit, 1), 200)
$$;

CREATE OR REPLACE FUNCTION public.country_leaderboard(_period text DEFAULT 'season', _per_country integer DEFAULT 3)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  verified boolean,
  country_code text,
  reps bigint,
  xp bigint,
  total_xp integer,
  best_reps integer,
  country_position integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT p.id, p.username, p.avatar_url, p.verified, p.country_code,
           COALESCE(SUM(r.reps), 0)::bigint AS reps,
           COALESCE(SUM(r.xp_earned), 0)::bigint AS xp,
           p.total_xp, p.best_reps
    FROM public.profiles p
    LEFT JOIN public.pushup_records r
      ON r.user_id = p.id
     AND r.source = 'camera'
     AND r.created_at >= public.period_start(_period)
    WHERE p.country_code IS NOT NULL
    GROUP BY p.id
  ), ranked AS (
    SELECT t.*, ROW_NUMBER() OVER (
      PARTITION BY t.country_code ORDER BY t.reps DESC, t.xp DESC, t.total_xp DESC
    )::integer AS country_position
    FROM totals t
    WHERE t.reps > 0 OR public.period_start(_period) = '-infinity'::timestamptz
  )
  SELECT id, username, avatar_url, verified, country_code, reps, xp, total_xp, best_reps, country_position
  FROM ranked
  WHERE country_position <= LEAST(GREATEST(_per_country, 1), 10)
  ORDER BY country_code, country_position
$$;

REVOKE ALL ON FUNCTION public.global_leaderboard(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.country_leaderboard(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.global_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.country_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.period_start(text) TO authenticated;