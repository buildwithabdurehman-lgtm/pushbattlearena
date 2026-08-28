/**
 * PushOff game rules: XP, ranks, daily challenge.
 * Kept free of UI and data-access code so it can be reused anywhere.
 */

export const XP_PER_REP = 10;

export function xpForReps(reps: number): number {
  return Math.max(0, Math.floor(reps)) * XP_PER_REP;
}

export type Rank = {
  name: string;
  minXp: number;
  tier: number;
};

export const RANKS: Rank[] = [
  { name: "Rookie", minXp: 0, tier: 1 },
  { name: "Grinder", minXp: 500, tier: 2 },
  { name: "Contender", minXp: 1500, tier: 3 },
  { name: "Challenger", minXp: 3000, tier: 4 },
  { name: "Elite", minXp: 6000, tier: 5 },
  { name: "Warlord", minXp: 10000, tier: 6 },
  { name: "Champion", minXp: 18000, tier: 7 },
  { name: "Legend", minXp: 30000, tier: 8 },
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
