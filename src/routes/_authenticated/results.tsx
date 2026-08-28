import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Trophy } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { dailyChallenge, formatClock, rankProgress } from "@/lib/game";
import { RankBadge } from "@/components/RankBadge";
import { XpBar } from "@/components/XpBar";

type ResultSearch = { reps: number; seconds: number; xp: number; best: number };

export const Route = createFileRoute("/_authenticated/results")({
  head: () => ({
    meta: [
      { title: "Battle Results — PushOff" },
      { name: "description", content: "Your PushOff battle results: reps, time, XP earned and rank progress." },
      { property: "og:title", content: "Battle Results — PushOff" },
      { property: "og:description", content: "See your reps, XP earned and rank progress." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ResultSearch => ({
    reps: Number(search["reps"] ?? 0),
    seconds: Number(search["seconds"] ?? 0),
    xp: Number(search["xp"] ?? 0),
    best: Number(search["best"] ?? 0),
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { reps, seconds, xp, best } = Route.useSearch();
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { rank, next, percent, xpNeeded } = rankProgress(profile?.total_xp ?? 0);
  const isPersonalBest = reps > best;
  const challenge = dailyChallenge();

  return (
    <main className="px-5 pt-10">
      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Battle complete
      </p>
      <h1 className="mt-2 text-center text-4xl text-glow animate-rise-in">
        {isPersonalBest ? "New Record" : "Good Fight"}
      </h1>

      <section className="panel relative mt-8 overflow-hidden p-6 text-center hairline-top animate-rise-in">
        <p className="num-display text-[6rem] leading-none">{reps}</p>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Push-ups</p>
        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border pt-5">
          <Cell label="Time" value={formatClock(seconds)} />
          <Cell label="XP earned" value={`+${xp}`} highlight />
          <Cell label="Prev best" value={`${best}`} />
        </div>
      </section>

      {isPersonalBest && (
        <p className="mt-4 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-primary">
          <Flame className="h-4 w-4" /> Personal best smashed
        </p>
      )}
      {reps >= challenge.target && (
        <p className="mt-2 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-gold">
          <Trophy className="h-4 w-4" /> Daily challenge cleared
        </p>
      )}

      <section className="panel mt-6 flex items-center gap-4 p-4">
        <RankBadge rank={rank} size="sm" />
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              {rank.name}
            </p>
            <p className="num-display text-sm">{(profile?.total_xp ?? 0).toLocaleString()} XP</p>
          </div>
          <XpBar percent={percent} className="mt-2" height="h-2" />
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {next ? `${xpNeeded.toLocaleString()} XP to ${next.name}` : "Max rank reached"}
          </p>
        </div>
      </section>

      <div className="mt-8 space-y-3 pb-6">
        <Link
          to="/battle"
          className="flex h-14 items-center justify-center rounded-xl bg-primary font-display text-base uppercase tracking-widest text-primary-foreground glow-red active:scale-95"
        >
          Battle again
        </Link>
        <Link
          to="/leaderboard"
          className="flex h-14 items-center justify-center rounded-xl border border-border bg-card font-display text-base uppercase tracking-widest active:scale-95"
        >
          Leaderboard
        </Link>
        <Link
          to="/home"
          className="block py-2 text-center text-[11px] uppercase tracking-widest text-muted-foreground"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}

function Cell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className={`num-display text-xl ${highlight ? "text-primary" : ""}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
