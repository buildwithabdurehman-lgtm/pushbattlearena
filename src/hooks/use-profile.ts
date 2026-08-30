import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  total_xp: number;
  best_reps: number;
  battles: number;
  avatar_url: string | null;
};

export function profileQueryKey(userId: string | undefined) {
  return ["profile", userId] as const;
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, total_xp, best_reps, battles, avatar_url")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useLeaderboard(limit = 25) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, total_xp, best_reps, battles, avatar_url")
        .order("total_xp", { ascending: false })
        .order("best_reps", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type PushupRecord = {
  id: string;
  reps: number;
  duration_seconds: number;
  xp_earned: number;
  created_at: string;
};

export function useRecords(userId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ["records", userId, limit],
    enabled: Boolean(userId),
    queryFn: async (): Promise<PushupRecord[]> => {
      const { data, error } = await supabase
        .from("pushup_records")
        .select("id, reps, duration_seconds, xp_earned, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}
