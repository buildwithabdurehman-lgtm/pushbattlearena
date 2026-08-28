import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { RANKS, XP_PER_REP, rankProgress } from "@/lib/game";
import { RankBadge } from "@/components/RankBadge";
import { XpBar } from "@/components/XpBar";

export const Route = createFileRoute("/_authenticated/ranks")({
  head: () => ({
    meta: [
      { title: "Ranks & XP — PushOff" },
      { name: "description", content: "Every PushOff rank from Rookie to Legend and the XP needed to reach each one." },
      { property: "og:title", content: "Ranks & XP — PushOff" },
      { property: "og:description", content: "All eight PushOff ranks and the XP required for each." },
    ],
  }),
  component: RanksPage,
});

function RanksPage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const totalXp = profile?.total_xp ?? 0;
  const { rank, next, percent, xpNeeded } = rankProgress(totalXp);

  return (
    <main className="px-5 pt-8">
      <h1 className="text-3xl">Ranks &amp; XP</h1>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {XP_PER_REP} XP per push-up
      </p>

      <section className="panel relative mt-6 overflow-hidden p-4 hairline-top">
        <div className="flex items-center gap-4">
          <RankBadge rank={rank} size="md" />
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              {rank.name}
            </p>
            <p className="num-display text-lg">{totalXp.toLocaleString()} XP</p>
          </div>
        </div>
        <XpBar percent={percent} className="mt-4" />
        <p className="mt-2 text-[11px] text-muted-foreground">
          {next ? `${xpNeeded.toLocaleString()} XP to ${next.name}` : "You are a Legend"}
        </p>
      </section>

      <ul className="mt-6 space-y-3 pb-6">
        {RANKS.map((entry) => {
          const unlocked = totalXp >= entry.minXp;
          const current = entry.tier === rank.tier;
          return (
            <li
              key={entry.name}
              className={`panel flex items-center gap-4 p-4 ${current ? "border-primary/60 glow-red" : ""} ${
                unlocked ? "" : "opacity-55"
              }`}
            >
              <RankBadge rank={entry} size="sm" />
              <div className="flex-1">
                <p className="font-display text-base uppercase">{entry.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {entry.minXp.toLocaleString()} XP · {Math.round(entry.minXp / XP_PER_REP)} reps
                </p>
              </div>
              {unlocked && <Check className="h-4 w-4 text-primary" />}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
