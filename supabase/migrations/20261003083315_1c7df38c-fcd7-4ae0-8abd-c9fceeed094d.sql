CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can see follows" ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users follow as themselves" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users unfollow as themselves" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX messages_pair_idx ON public.messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX messages_recipient_idx ON public.messages (recipient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users send as themselves" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipients mark read" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;