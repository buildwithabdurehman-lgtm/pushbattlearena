-- Profiles: hide personal body/onboarding details from other users
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, username, total_xp, best_reps, battles, created_at, updated_at, avatar_url, last_seen_at, verified, verified_at, country_code, country_changed_at, onboarded_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS TABLE(gender text, age integer, height_cm integer, weight_kg integer, activity_level text, goal text, training_days integer, equipment text, session_minutes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT gender, age, height_cm, weight_kg, activity_level, goal, training_days, equipment, session_minutes
  FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_private_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;

-- Follows: only see follows you are part of
DROP POLICY IF EXISTS "Signed-in users can see follows" ON public.follows;
CREATE POLICY "Users see their own follows" ON public.follows
  FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE OR REPLACE FUNCTION public.follow_counts(_user_id uuid)
RETURNS TABLE(followers bigint, following bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (SELECT count(*) FROM public.follows WHERE following_id = _user_id),
         (SELECT count(*) FROM public.follows WHERE follower_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.follow_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.follow_counts(uuid) TO authenticated;

-- Avatars: signed-in only
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Signed-in users can view avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');