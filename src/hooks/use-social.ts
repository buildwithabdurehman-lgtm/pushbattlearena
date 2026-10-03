import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MiniProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  verified: boolean;
};

const MINI = "id, username, avatar_url, verified";

async function profilesByIds(ids: string[]): Promise<MiniProfile[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("profiles").select(MINI).in("id", ids);
  if (error) throw error;
  return (data ?? []) as MiniProfile[];
}

export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["follow-counts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [a, b] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId!),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId!),
      ]);
      return { followers: a.count ?? 0, following: b.count ?? 0 };
    },
  });
}

export function useIsFollowing(me: string | undefined, target: string | undefined) {
  return useQuery({
    queryKey: ["is-following", me, target],
    enabled: !!me && !!target && me !== target,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", me!)
        .eq("following_id", target!)
        .maybeSingle();
      return !!data;
    },
  });
}

export function useToggleFollow(me: string | undefined, target: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (following: boolean) => {
      if (!me) throw new Error("Not signed in");
      const res = following
        ? await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", target)
        : await supabase.from("follows").insert({ follower_id: me, following_id: target });
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["is-following"] });
      void qc.invalidateQueries({ queryKey: ["follow-counts"] });
      void qc.invalidateQueries({ queryKey: ["follow-list"] });
    },
  });
}

export function useFollowList(userId: string | undefined, kind: "followers" | "following") {
  return useQuery({
    queryKey: ["follow-list", userId, kind],
    enabled: !!userId,
    queryFn: async () => {
      const col = kind === "followers" ? "following_id" : "follower_id";
      const other = kind === "followers" ? "follower_id" : "following_id";
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, following_id")
        .eq(col, userId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return profilesByIds((data ?? []).map((r) => r[other]));
    },
  });
}

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type Conversation = { other: MiniProfile; last: Message; unread: number };

export function useConversations(me: string | undefined) {
  const qc = useQueryClient();
  useMessagesRealtime(me, () => void qc.invalidateQueries({ queryKey: ["conversations"] }));
  return useQuery({
    queryKey: ["conversations", me],
    enabled: !!me,
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const map = new Map<string, { last: Message; unread: number }>();
      for (const m of (data ?? []) as Message[]) {
        const other = m.sender_id === me ? m.recipient_id : m.sender_id;
        const entry = map.get(other) ?? { last: m, unread: 0 };
        if (m.recipient_id === me && !m.read_at) entry.unread++;
        map.set(other, entry);
      }
      const profiles = await profilesByIds([...map.keys()]);
      return profiles
        .map((p) => ({ other: p, ...map.get(p.id)! }))
        .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
    },
  });
}

export function useThread(me: string | undefined, other: string) {
  const qc = useQueryClient();
  useMessagesRealtime(me, () => void qc.invalidateQueries({ queryKey: ["thread", me, other] }));
  return useQuery({
    queryKey: ["thread", me, other],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`,
        )
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      const msgs = (data ?? []) as Message[];
      if (msgs.some((m) => m.recipient_id === me && !m.read_at)) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("recipient_id", me!)
          .eq("sender_id", other)
          .is("read_at", null);
        void qc.invalidateQueries({ queryKey: ["conversations"] });
      }
      return msgs;
    },
  });
}

function useMessagesRealtime(me: string | undefined, onChange: () => void) {
  useEffect(() => {
    if (!me) return;
    const ch = supabase
      .channel(`messages-${me}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, onChange)
      .subscribe();
    return () => void supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);
}
