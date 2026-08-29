import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Target, Trophy, Zap } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useProfile, useLeaderboard } from "@/hooks/use-profile";
import { rankProgress, dailyChallenge } from "@/lib/game";
import { RankBadge } from "@/components/RankBadge";
import { XpBar } from "@/components/XpBar";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — PushOff" },
      { name: "description", content: "Your PushOff rank, XP progress, personal best and daily challenge." },
      { property: "og:title", content: "Home — PushOff" },
      { property: "og:description", content: "Track your rank, XP and personal best in PushOff." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: leaders } = useLeaderboard(3);
  const totalXp = profile?.total_xp ?? 0;
  const { rank, next, percent, xpNeeded } = rankProgress(totalXp);
  const challenge = dailyChallenge();

  return (
    <main className="px-5 pt-8">
      <header className="flex items-center gap-4">
        <RankBadge rank={rank} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Fighter</p>
          <h1 className="truncate text-2xl leading-tight">{profile?.username ?? "…"}</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{rank.name}</p>
        </div>
      </header>

      <section className="panel relative mt-6 overflow-hidden p-4 hairline-top">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">XP Progress</p>
          <p className="num-display text-lg">
            {totalXp.toLocaleString()} <span className="text-xs text-muted-foreground">XP</span>
          </p>
        </div>
        <XpBar percent={percent} className="mt-3" />
        <p className="mt-2 text-[11px] text-muted-foreground">
          {next ? `${xpNeeded.toLocaleString()} XP to ${next.name}` : "Max rank reached — Legend"}
        </p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Stat icon={Flame} label="Personal best" value={`${profile?.best_reps ?? 0}`} unit="reps" />
        <Stat icon={Zap} label="Battles" value={`${profile?.battles ?? 0}`} unit="fought" />
      </section>

      <Link
        to="/battle"
        className="mt-6 flex h-20 items-center justify-center rounded-2xl bg-primary font-display text-3xl uppercase tracking-widest text-primary-foreground animate-pulse-glow transition-transform active:scale-[0.98]"
      >
        Start Battle
      </Link>

      <Link
        to="/challenges"
        className="mt-3 flex h-14 items-center justify-center rounded-xl border border-primary/40 bg-card font-display text-sm uppercase tracking-widest text-primary active:scale-[0.98]"
      >
        Challenge a fighter
      </Link>


      <section className="panel mt-6 flex items-center gap-4 p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Daily challenge
          </p>
          <p className="text-sm text-foreground">{challenge.label}</p>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base">Leaderboard</h2>
          <Link to="/leaderboard" className="text-[11px] uppercase tracking-widest text-primary">
            View all
          </Link>
        </div>
        <ul className="panel mt-3 divide-y divide-border">
          {(leaders ?? []).map((entry, index) => (
            <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
              <span className="num-display w-5 text-sm text-muted-foreground">{index + 1}</span>
              <Trophy
                className={`h-4 w-4 ${index === 0 ? "text-gold" : "text-muted-foreground"}`}
              />
              <span className="flex-1 truncate text-sm">{entry.username}</span>
              <span className="num-display text-sm text-primary">
                {entry.total_xp.toLocaleString()}
              </span>
            </li>
          ))}
          {leaders?.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-muted-foreground">
              No fighters ranked yet — be the first.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="panel p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="num-display mt-2 text-3xl">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label} · {unit}
      </p>
    </div>
  );
}
