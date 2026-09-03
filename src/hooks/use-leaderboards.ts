import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PERIODS = ["daily", "weekly", "monthly", "season", "alltime"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  season: "Season",
  alltime: "All time",
};

export type LeaderboardRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  verified: boolean;
  country_code: string | null;
  reps: number;
  xp: number;
  total_xp: number;
  best_reps: number;
};

export type CountryRow = LeaderboardRow & { country_position: number };

/** Global Top 50 by verified (camera-tracked) push-ups in the chosen window. */
export function useGlobalLeaderboard(period: Period, limit = 50) {
  return useQuery({
    queryKey: ["global-leaderboard", period, limit],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc("global_leaderboard", {
        _period: period,
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
  });
}

/** Top fighters per country (default: top 3), grouped by country code. */
export function useCountryLeaderboard(period: Period, perCountry = 3) {
  return useQuery({
    queryKey: ["country-leaderboard", period, perCountry],
    queryFn: async (): Promise<CountryRow[]> => {
      const { data, error } = await supabase.rpc("country_leaderboard", {
        _period: period,
        _per_country: perCountry,
      });
      if (error) throw error;
      return (data ?? []) as CountryRow[];
    },
  });
}

export function groupByCountry(rows: CountryRow[] | undefined) {
  const groups = new Map<string, CountryRow[]>();
  for (const row of rows ?? []) {
    const code = row.country_code ?? "??";
    const list = groups.get(code) ?? [];
    list.push(row);
    groups.set(code, list);
  }
  return [...groups.entries()].sort(
    (a, b) =>
      b[1].reduce((sum, r) => sum + r.reps, 0) - a[1].reduce((sum, r) => sum + r.reps, 0),
  );
}

export const COUNTRY_COOLDOWN_DAYS = 30;

/** Days left before the fighter may switch countries again. */
export function countryLockDaysLeft(changedAt: string | null | undefined): number {
  if (!changedAt) return 0;
  const unlock = new Date(changedAt).getTime() + COUNTRY_COOLDOWN_DAYS * 86_400_000;
  return Math.max(0, Math.ceil((unlock - Date.now()) / 86_400_000));
}
