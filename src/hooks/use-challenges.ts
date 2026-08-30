import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Challenge = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  duration_seconds: number;
  status: "pending" | "active" | "finished" | "declined";
  challenger_reps: number;
  opponent_reps: number;
  challenger_done: boolean;
  opponent_done: boolean;
  winner_id: string | null;
  started_at: string | null;
  created_at: string;
  is_bot: boolean;
  bot_name: string | null;
};

const SELECT =
  "id, challenger_id, opponent_id, duration_seconds, status, challenger_reps, opponent_reps, challenger_done, opponent_done, winner_id, started_at, created_at, is_bot, bot_name";

export function useMyChallenges(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["challenges", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Challenge[]> => {
      const { data, error } = await supabase
        .from("challenges")
        .select(SELECT)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Challenge[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`challenges-inbox-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["challenges", userId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}

/** One live match, kept in sync in real time for both fighters. */
export function useChallenge(challengeId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["challenge", challengeId],
    queryFn: async (): Promise<Challenge | null> => {
      const { data, error } = await supabase
        .from("challenges")
        .select(SELECT)
        .eq("id", challengeId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Challenge | null;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`challenge-${challengeId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "challenges", filter: `id=eq.${challengeId}` },
        (payload) => {
          queryClient.setQueryData(["challenge", challengeId], payload.new as Challenge);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [challengeId, queryClient]);

  return query;
}

export function useOpponents(userId: string | undefined) {
  return useQuery({
    queryKey: ["opponents", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, total_xp, best_reps, battles, avatar_url")
        .neq("id", userId!)
        .order("total_xp", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProfilesByIds(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["profiles-by-ids", key],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, total_xp, best_reps, battles, avatar_url")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });
}
