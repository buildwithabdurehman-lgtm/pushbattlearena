import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const OWNER_EMAIL = "buildwithabdurehman@gmail.com";

export type Profile = {
  id: string;
  username: string;
  total_xp: number;
  best_reps: number;
  battles: number;
  avatar_url: string | null;
  verified: boolean;
  country_code: string | null;
  country_changed_at: string | null;
};

export const PROFILE_COLUMNS =
  "id, username, total_xp, best_reps, battles, avatar_url, verified, country_code, country_changed_at";

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
        .select(PROFILE_COLUMNS)
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
        .select(PROFILE_COLUMNS)
        .order("total_xp", { ascending: false })
        .order("best_reps", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Free-text fighter search used by the duels screen and the admin panel. */
export function useFighterSearch(term: string, excludeId?: string | undefined) {
  const query = term.trim();
  return useQuery({
    queryKey: ["fighter-search", query, excludeId ?? null],
    enabled: query.length > 0,
    queryFn: async (): Promise<Profile[]> => {
      let request = supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .ilike("username", `%${query}%`)
        .order("total_xp", { ascending: false })
        .limit(20);
      if (excludeId) request = request.neq("id", excludeId);
      const { data, error } = await request;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All verified fighters, newest verification first. Admin panel roster. */
export function useVerifiedFighters(enabled: boolean) {
  return useQuery({
    queryKey: ["verified-fighters"],
    enabled,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("verified", true)
        .order("verified_at", { ascending: false })
        .limit(200);
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

/**
 * True when the signed-in fighter is an admin. The app owner's account claims
 * the admin role automatically once their email address is confirmed.
 */
export function useIsAdmin() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

  useEffect(() => {
    if (!user?.id || query.data !== false) return;
    if (user.email?.toLowerCase() !== OWNER_EMAIL) return;
    void supabase.rpc("claim_owner_admin").then(({ data }) => {
      if (data) void queryClient.invalidateQueries({ queryKey: ["is-admin", user.id] });
    });
  }, [user?.id, user?.email, query.data, queryClient]);

  return query;
}

export type VerificationRequest = {
  id: string;
  user_id: string;
  note: string | null;
  status: string;
  created_at: string;
};

export function useMyVerificationRequest(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-verification", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<VerificationRequest | null> => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("id, user_id, note, status, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePendingVerifications(enabled: boolean) {
  return useQuery({
    queryKey: ["pending-verifications"],
    enabled,
    queryFn: async (): Promise<VerificationRequest[]> => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("id, user_id, note, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
