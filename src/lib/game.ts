/**
 * PushOff game rules: XP, ranks, daily challenge.
 * Kept free of UI and data-access code so it can be reused anywhere.
 */

export const XP_PER_REP = 10;

export function xpForReps(reps: number): number {
  return Math.max(0, Math.floor(reps)) * XP_PER_REP;
}

/** Icon keys are mapped to a lucide icon inside RankBadge. */
export type RankIcon =
  | "dumbbell"
  | "flame"
  | "hammer"
  | "medal"
  | "shield"
  | "swords"
  | "zap"
  | "award"
  | "gem"
  | "diamond"
  | "skull"
  | "star"
  | "crown"
  | "trophy"
  | "sparkles";

export type Rank = {
  name: string;
  minXp: number;
  tier: number;
  icon: RankIcon;
  /** Badge accent, expressed as an oklch token so it stays theme-consistent. */
  accent: string;
};

export const RANKS: Rank[] = [
  { name: "Rookie", minXp: 0, tier: 1, icon: "dumbbell", accent: "oklch(0.72 0.02 250)" },
  { name: "Grinder", minXp: 400, tier: 2, icon: "flame", accent: "oklch(0.7 0.14 45)" },
  { name: "Iron", minXp: 900, tier: 3, icon: "hammer", accent: "oklch(0.66 0.03 250)" },
  { name: "Bronze", minXp: 1600, tier: 4, icon: "medal", accent: "oklch(0.68 0.12 55)" },
  { name: "Steel", minXp: 2600, tier: 5, icon: "shield", accent: "oklch(0.76 0.03 220)" },
  { name: "Silver", minXp: 4000, tier: 6, icon: "swords", accent: "oklch(0.85 0.01 240)" },
  { name: "Contender", minXp: 6000, tier: 7, icon: "zap", accent: "oklch(0.78 0.16 95)" },
  { name: "Gold", minXp: 8500, tier: 8, icon: "award", accent: "oklch(0.83 0.16 88)" },
  { name: "Platinum", minXp: 12000, tier: 9, icon: "gem", accent: "oklch(0.86 0.08 190)" },
  { name: "Diamond", minXp: 16000, tier: 10, icon: "diamond", accent: "oklch(0.82 0.13 215)" },
  { name: "Warlord", minXp: 21000, tier: 11, icon: "skull", accent: "oklch(0.63 0.24 26.5)" },
  { name: "Master", minXp: 27000, tier: 12, icon: "star", accent: "oklch(0.72 0.19 305)" },
  { name: "Champion", minXp: 34000, tier: 13, icon: "crown", accent: "oklch(0.8 0.18 75)" },
  { name: "Immortal", minXp: 45000, tier: 14, icon: "trophy", accent: "oklch(0.7 0.2 340)" },
  { name: "Legend", minXp: 60000, tier: 15, icon: "sparkles", accent: "oklch(0.88 0.15 100)" },
];

export function rankForXp(totalXp: number): Rank {
  let current = RANKS[0]!;
  for (const rank of RANKS) {
    if (totalXp >= rank.minXp) current = rank;
  }
  return current;
}

export function nextRankForXp(totalXp: number): Rank | null {
  return RANKS.find((r) => r.minXp > totalXp) ?? null;
}

export function rankProgress(totalXp: number): {
  rank: Rank;
  next: Rank | null;
  percent: number;
  xpIntoRank: number;
  xpNeeded: number;
} {
  const rank = rankForXp(totalXp);
  const next = nextRankForXp(totalXp);
  if (!next) {
    return { rank, next: null, percent: 100, xpIntoRank: totalXp - rank.minXp, xpNeeded: 0 };
  }
  const span = next.minXp - rank.minXp;
  const xpIntoRank = totalXp - rank.minXp;
  return {
    rank,
    next,
    percent: Math.min(100, Math.round((xpIntoRank / span) * 100)),
    xpIntoRank,
    xpNeeded: next.minXp - totalXp,
  };
}

/** Deterministic daily challenge so every player sees the same target. */
export function dailyChallenge(date = new Date()): { target: number; label: string; key: string } {
  const key = date.toISOString().slice(0, 10);
  const seed = [...key].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const target = 20 + (seed % 9) * 5; // 20 - 60 reps
  return { target, label: `Complete ${target} push-ups in one battle`, key };
}

export function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
