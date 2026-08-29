CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  duration_seconds integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending',
  challenger_reps integer NOT NULL DEFAULT 0,
  opponent_reps integer NOT NULL DEFAULT 0,
  challenger_done boolean NOT NULL DEFAULT false,
  opponent_done boolean NOT NULL DEFAULT false,
  winner_id uuid,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenges_status_check CHECK (status IN ('pending','active','finished','declined')),
  CONSTRAINT challenges_distinct_players CHECK (challenger_id <> opponent_id)
);

CREATE INDEX challenges_challenger_idx ON public.challenges (challenger_id, created_at DESC);
CREATE INDEX challenges_opponent_idx ON public.challenges (opponent_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their challenges"
ON public.challenges FOR SELECT TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create challenges they send"
ON public.challenges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Participants can update their challenges"
ON public.challenges FOR UPDATE TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id)
WITH CHECK (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE OR REPLACE FUNCTION public.touch_challenge()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.challenger_done AND NEW.opponent_done AND NEW.status <> 'finished' THEN
    NEW.status = 'finished';
    NEW.winner_id = CASE
      WHEN NEW.challenger_reps > NEW.opponent_reps THEN NEW.challenger_id
      WHEN NEW.opponent_reps > NEW.challenger_reps THEN NEW.opponent_id
      ELSE NULL END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER challenges_touch BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.touch_challenge();

ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER TABLE public.challenges REPLICA IDENTITY FULL;