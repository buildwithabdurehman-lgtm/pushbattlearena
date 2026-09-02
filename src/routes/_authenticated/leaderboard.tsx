import { createFileRoute, Link } from "@tanstack/react-router";
import { VerifiedTick } from "@/components/VerifiedTick";
import { Trophy } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useLeaderboard } from "@/hooks/use-profile";
import { rankForXp } from "@/lib/game";
import { RankBadge } from "@/components/RankBadge";
import { FighterAvatar } from "@/components/FighterAvatar";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — PushOff" },
      { name: "description", content: "See the top PushOff fighters ranked by total XP and personal bests." },
      { property: "og:title", content: "Leaderboard — PushOff" },
      { property: "og:description", content: "The top PushOff fighters ranked by XP." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = useSession();
  const { data: entries, isPending } = useLeaderboard(50);

  return (
    <main className="px-5 pt-8">
      <h1 className="text-3xl">Leaderboard</h1>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Ranked by total XP
      </p>

      <ul className="panel mt-6 divide-y divide-border">
        {isPending && (
          <li className="px-4 py-6 text-center text-xs text-muted-foreground">Loading fighters…</li>
        )}
        {entries?.map((entry, index) => {
          const isMe = entry.id === user?.id;
          return (
            <li
              key={entry.id}
              className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-accent" : ""}`}
            >
              <span className="num-display w-6 text-base text-muted-foreground">{index + 1}</span>
              <FighterAvatar url={entry.avatar_url} name={entry.username} className="h-9 w-9" />
              {index === 0 ? (
                <Trophy className="h-5 w-5 shrink-0 text-gold" />
              ) : (
                <RankBadge rank={rankForXp(entry.total_xp)} size="sm" className="h-8 w-8" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  to="/u/$userId"
                  params={{ userId: entry.id }}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <span className="truncate">{entry.username}</span>
                  {entry.verified && <VerifiedTick className="h-3.5 w-3.5" />}
                  {isMe && <span className="text-[10px] text-primary">YOU</span>}
                </Link>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {rankForXp(entry.total_xp).name} · PB {entry.best_reps}
                </p>
              </div>
              <span className="num-display text-sm text-primary">
                {entry.total_xp.toLocaleString()}
              </span>
            </li>
          );
        })}
        {entries?.length === 0 && (
          <li className="px-4 py-8 text-center text-xs text-muted-foreground">
            No fighters ranked yet — win the first battle.
          </li>
        )}
      </ul>
    </main>
  );
}
