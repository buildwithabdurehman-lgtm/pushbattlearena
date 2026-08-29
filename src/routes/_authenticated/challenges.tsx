import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Swords, Check, X, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  useMyChallenges,
  useOpponents,
  useProfilesByIds,
  type Challenge,
} from "@/hooks/use-challenges";
import { RankBadge } from "@/components/RankBadge";
import { rankForXp } from "@/lib/game";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({
    meta: [
      { title: "Ranked Challenges — PushOff" },
      {
        name: "description",
        content:
          "Challenge other fighters to a live head-to-head push-up match and settle it rep for rep.",
      },
      { property: "og:title", content: "Ranked Challenges — PushOff" },
      {
        property: "og:description",
        content: "Send a push-up duel, track both scores live and claim the win.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChallengesPage,
});

const DURATIONS = [30, 60, 120] as const;

function ChallengesPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { data: challenges = [] } = useMyChallenges(user?.id);
  const { data: opponents = [] } = useOpponents(user?.id);
  const [duration, setDuration] = useState<number>(60);
  const [busy, setBusy] = useState<string | null>(null);

  const ids = Array.from(
    new Set(challenges.flatMap((c) => [c.challenger_id, c.opponent_id])),
  ).filter((id) => id !== user?.id);
  const { data: others = [] } = useProfilesByIds(ids);
  const nameFor = (id: string) => others.find((p) => p.id === id)?.username ?? "Fighter";

  const incoming = challenges.filter((c) => c.status === "pending" && c.opponent_id === user?.id);
  const outgoing = challenges.filter((c) => c.status === "pending" && c.challenger_id === user?.id);
  const active = challenges.filter((c) => c.status === "active");
  const history = challenges.filter((c) => c.status === "finished").slice(0, 8);

  async function sendChallenge(opponentId: string) {
    if (!user) return;
    setBusy(opponentId);
    const { data, error } = await supabase
      .from("challenges")
      .insert({ challenger_id: user.id, opponent_id: opponentId, duration_seconds: duration })
      .select("id")
      .single();
    setBusy(null);
    if (error || !data) {
      toast.error("Could not send the challenge");
      return;
    }
    toast.success("Challenge sent");
  }

  async function respond(challenge: Challenge, accept: boolean) {
    setBusy(challenge.id);
    const { error } = await supabase
      .from("challenges")
      .update(
        accept
          ? { status: "active", started_at: new Date().toISOString() }
          : { status: "declined" },
      )
      .eq("id", challenge.id);
    setBusy(null);
    if (error) {
      toast.error("Could not update the challenge");
      return;
    }
    if (accept) void navigate({ to: "/duel/$challengeId", params: { challengeId: challenge.id } });
  }

  return (
    <main className="px-5 pt-8">
      <header>
        <h1 className="text-2xl">Ranked Challenges</h1>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Head-to-head push-up duels
        </p>
      </header>

      {incoming.length > 0 && (
        <section className="panel mt-5 p-4">
          <h2 className="text-sm uppercase tracking-widest text-primary">Incoming</h2>
          <ul className="mt-3 space-y-3">
            {incoming.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-sm uppercase tracking-wide">
                    {nameFor(c.challenger_id)}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {c.duration_seconds}s match
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void respond(c, true)}
                    disabled={busy === c.id}
                    className="grid h-10 w-12 place-items-center rounded-lg bg-primary text-primary-foreground glow-red active:scale-95"
                    aria-label="Accept challenge"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void respond(c, false)}
                    disabled={busy === c.id}
                    className="grid h-10 w-12 place-items-center rounded-lg border border-border bg-card active:scale-95"
                    aria-label="Decline challenge"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section className="panel mt-4 p-4">
          <h2 className="text-sm uppercase tracking-widest">Live matches</h2>
          <ul className="mt-3 space-y-2">
            {active.map((c) => {
              const foe = c.challenger_id === user?.id ? c.opponent_id : c.challenger_id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() =>
                      void navigate({ to: "/duel/$challengeId", params: { challengeId: c.id } })
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-3 active:scale-[0.98]"
                  >
                    <span className="font-display text-sm uppercase tracking-wide">
                      vs {nameFor(foe)}
                    </span>
                    <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary">
                      <Timer className="h-3.5 w-3.5" /> Enter
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="panel mt-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest">Challenge a fighter</h2>
          <div className="flex gap-1">
            {DURATIONS.map((value) => (
              <button
                key={value}
                onClick={() => setDuration(value)}
                className={`rounded-md px-2 py-1 font-display text-[10px] uppercase tracking-widest ${
                  duration === value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {value}s
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {opponents.length === 0 && (
            <li className="text-xs text-muted-foreground">
              No other fighters yet — invite a friend to install PushOff.
            </li>
          )}
          {opponents.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <RankBadge rank={rankForXp(p.total_xp)} size="sm" />
                <div>
                  <p className="font-display text-sm uppercase tracking-wide">{p.username}</p>
                  <p className="num-display text-[10px] text-muted-foreground">
                    {p.total_xp} XP · PB {p.best_reps}
                  </p>
                </div>
              </div>
              <button
                onClick={() => void sendChallenge(p.id)}
                disabled={busy === p.id}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 font-display text-[10px] uppercase tracking-widest text-primary-foreground active:scale-95 disabled:opacity-50"
              >
                <Swords className="h-3.5 w-3.5" /> Duel
              </button>
            </li>
          ))}
        </ul>
      </section>

      {outgoing.length > 0 && (
        <section className="panel mt-4 p-4">
          <h2 className="text-sm uppercase tracking-widest">Waiting for a reply</h2>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {outgoing.map((c) => (
              <li key={c.id}>
                vs {nameFor(c.opponent_id)} · {c.duration_seconds}s
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="panel mt-4 mb-6 p-4">
          <h2 className="text-sm uppercase tracking-widest">Recent results</h2>
          <ul className="mt-2 space-y-2">
            {history.map((c) => {
              const mine = c.challenger_id === user?.id ? c.challenger_reps : c.opponent_reps;
              const theirs = c.challenger_id === user?.id ? c.opponent_reps : c.challenger_reps;
              const foe = c.challenger_id === user?.id ? c.opponent_id : c.challenger_id;
              const outcome =
                c.winner_id === null ? "Draw" : c.winner_id === user?.id ? "Win" : "Loss";
              return (
                <li key={c.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">vs {nameFor(foe)}</span>
                  <span className="num-display">
                    {mine}–{theirs}
                  </span>
                  <span
                    className={
                      outcome === "Win"
                        ? "text-primary"
                        : outcome === "Loss"
                          ? "text-muted-foreground"
                          : "text-foreground"
                    }
                  >
                    {outcome}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
