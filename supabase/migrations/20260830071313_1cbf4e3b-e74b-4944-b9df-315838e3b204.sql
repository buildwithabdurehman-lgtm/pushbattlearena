ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_name text;

ALTER TABLE public.challenges ALTER COLUMN opponent_id DROP NOT NULL;
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_distinct_players;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_distinct_players
  CHECK (opponent_id IS NULL OR challenger_id <> opponent_id);
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_bot_shape;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_bot_shape
  CHECK ((is_bot AND opponent_id IS NULL) OR (NOT is_bot AND opponent_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS profiles_last_seen_idx ON public.profiles (last_seen_at DESC);

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.touch_last_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);