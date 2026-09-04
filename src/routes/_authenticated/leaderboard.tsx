import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { VerifiedTick } from "@/components/VerifiedTick";
import { useSession } from "@/hooks/use-session";
import { rankForXp } from "@/lib/game";
import { RankBadge } from "@/components/RankBadge";
import { FighterAvatar } from "@/components/FighterAvatar";
import { countryFlag, countryName } from "@/lib/countries";
import {
  groupByCountry,
  PERIODS,
  PERIOD_LABEL,
  useCountryLeaderboard,
  useGlobalLeaderboard,
  type LeaderboardRow,
  type Period,
} from "@/hooks/use-leaderboards";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboards — PushOff" },
      {
        name: "description",
        content:
          "PushOff leaderboards: the global top 50 and the top 3 fighters in every country by verified push-ups.",
      },
      { property: "og:title", content: "Leaderboards — PushOff" },
      {
        property: "og:description",
        content: "Global top 50 and country top 3 by verified push-ups.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type Scope = "global" | "countries";

function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>("global");
  const [period, setPeriod] = useState<Period>("season");

  return (
    <main className="px-5 pt-8">
      <h1 className="text-3xl">Leaderboards</h1>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Verified push-ups only
      </p>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1">
        {(
          [
            ["global", "Global Top 50"],
            ["countries", "Countries Top 3"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setScope(value)}
            className={`rounded-md py-2.5 font-display text-[11px] uppercase tracking-widest transition-colors ${
              scope === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map((value) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 font-display text-[10px] uppercase tracking-widest transition-colors ${
              period === value
                ? "border-primary bg-accent text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {PERIOD_LABEL[value]}
          </button>
        ))}
      </div>

      {scope === "global" ? <GlobalBoard period={period} /> : <CountryBoard period={period} />}
    </main>
  );
}

function GlobalBoard({ period }: { period: Period }) {
  const { user } = useSession();
  const { data: entries, isPending } = useGlobalLeaderboard(period, 50);

  return (
    <ul className="panel mt-4 divide-y divide-border">
      {isPending && (
        <li className="px-4 py-6 text-center text-xs text-muted-foreground">Loading fighters…</li>
      )}
      {entries?.map((entry, index) => (
        <Row key={entry.user_id} entry={entry} position={index + 1} isMe={entry.user_id === user?.id} />
      ))}
      {entries?.length === 0 && (
        <li className="px-4 py-8 text-center text-xs text-muted-foreground">
          No verified push-ups in this window yet — go first.
        </li>
      )}
    </ul>
  );
}

function CountryBoard({ period }: { period: Period }) {
  const { user } = useSession();
  const { data, isPending } = useCountryLeaderboard(period, 3);
  const groups = groupByCountry(data);

  if (isPending) {
    return (
      <p className="panel mt-4 px-4 py-6 text-center text-xs text-muted-foreground">
        Loading nations…
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="panel mt-4 px-4 py-8 text-center text-xs text-muted-foreground">
        No country has verified push-ups in this window yet.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4 pb-2">
      {groups.map(([code, rows]) => (
        <section key={code} className="panel overflow-hidden">
          <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="text-xl leading-none">{countryFlag(code)}</span>
            <h2 className="flex-1 truncate text-sm uppercase tracking-widest">
              {countryName(code)}
            </h2>
            <span className="num-display text-xs text-primary">
              {rows.reduce((sum, r) => sum + r.reps, 0).toLocaleString()}
            </span>
          </header>
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <Row
                key={row.user_id}
                entry={row}
                position={row.country_position}
                isMe={row.user_id === user?.id}
                hideFlag
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({
  entry,
  position,
  isMe,
  hideFlag,
}: {
  entry: LeaderboardRow;
  position: number;
  isMe: boolean;
  hideFlag?: boolean;
}) {
  const rank = rankForXp(entry.total_xp);
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-accent" : ""}`}>
      <span className="num-display w-6 text-base text-muted-foreground">{position}</span>
      <FighterAvatar url={entry.avatar_url} name={entry.username} className="h-9 w-9" />
      {position === 1 ? (
        <Trophy className="h-5 w-5 shrink-0 text-gold" />
      ) : (
        <RankBadge rank={rank} size="sm" className="h-8 w-8" />
      )}
      <div className="min-w-0 flex-1">
        <Link
          to="/u/$userId"
          params={{ userId: entry.user_id }}
          className="flex items-center gap-1.5 text-sm"
        >
          {!hideFlag && (
            <span className="text-base leading-none" title={countryName(entry.country_code)}>
              {countryFlag(entry.country_code)}
            </span>
          )}
          <span className="truncate">{entry.username}</span>
          {entry.verified && <VerifiedTick className="h-3.5 w-3.5" />}
          {isMe && <span className="text-[10px] text-primary">YOU</span>}
        </Link>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {rank.name} · PB {entry.best_reps}
        </p>
      </div>
      <div className="text-right">
        <p className="num-display text-sm text-primary">{entry.reps.toLocaleString()}</p>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">push-ups</p>
      </div>
    </li>
  );
}
