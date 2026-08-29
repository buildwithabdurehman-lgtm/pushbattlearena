import { createFileRoute, useNavigate, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useChallenge, useProfilesByIds } from "@/hooks/use-challenges";
import { formatClock, xpForReps } from "@/lib/game";
import type { DetectorFrame } from "@/lib/pushup-detector";

const PoseTracker = lazy(() =>
  import("@/components/PoseTracker").then((mod) => ({ default: mod.PoseTracker })),
);

export const Route = createFileRoute("/_authenticated/duel/$challengeId")({
  head: () => ({
    meta: [
      { title: "Ranked Match — PushOff" },
      {
        name: "description",
        content:
          "Live push-up duel: camera-tracked reps, a shared match clock and both fighters' scores in real time.",
      },
      { property: "og:title", content: "Ranked Match — PushOff" },
      { property: "og:description", content: "Rep for rep, live. Beat your opponent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DuelPage,
});

function DuelPage() {
  const { challengeId } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: challenge } = useChallenge(challengeId);

  const [reps, setReps] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [frame, setFrame] = useState<DetectorFrame | null>(null);
  const repsRef = useRef(0);
  const pushed = useRef(0);
  const finishedRef = useRef(false);

  const isChallenger = challenge ? challenge.challenger_id === user?.id : false;
  const myReps = challenge ? (isChallenger ? challenge.challenger_reps : challenge.opponent_reps) : 0;
  const foeReps = challenge
    ? isChallenger
      ? challenge.opponent_reps
      : challenge.challenger_reps
    : 0;
  const iAmDone = challenge ? (isChallenger ? challenge.challenger_done : challenge.opponent_done) : false;

  const ids = challenge ? [challenge.challenger_id, challenge.opponent_id] : [];
  const { data: profiles = [] } = useProfilesByIds(ids);
  const nameFor = (id: string | undefined) =>
    profiles.find((p) => p.id === id)?.username ?? "Fighter";

  // Push my live rep count to the shared match row.
  const syncReps = useCallback(
    async (value: number, done: boolean) => {
      if (!challenge || !user) return;
      const patch = isChallenger
        ? { challenger_reps: value, ...(done ? { challenger_done: true } : {}) }
        : { opponent_reps: value, ...(done ? { opponent_done: true } : {}) };
      const { error } = await supabase.from("challenges").update(patch).eq("id", challenge.id);
      if (error) toast.error("Score sync failed");
    },
    [challenge, isChallenger, user],
  );

  const handleRep = useCallback(() => {
    repsRef.current += 1;
    setReps(repsRef.current);
  }, []);

  // Throttle score writes to roughly one per second.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (repsRef.current !== pushed.current) {
        pushed.current = repsRef.current;
        void syncReps(repsRef.current, false);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running, syncReps]);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setRunning(false);
    await syncReps(repsRef.current, true);
    if (user && repsRef.current > 0) {
      await supabase.from("pushup_records").insert({
        user_id: user.id,
        reps: repsRef.current,
        duration_seconds: challenge?.duration_seconds ?? 0,
        source: "duel",
      });
    }
    await queryClient.invalidateQueries();
  }, [challenge?.duration_seconds, queryClient, syncReps, user]);

  // Match clock.
  useEffect(() => {
    if (!running || remaining === null) return;
    if (remaining <= 0) {
      void finish();
      return;
    }
    const id = setTimeout(() => setRemaining((value) => (value ?? 0) - 1), 1000);
    return () => clearTimeout(id);
  }, [running, remaining, finish]);

  function startMatch() {
    if (!challenge) return;
    repsRef.current = 0;
    pushed.current = 0;
    finishedRef.current = false;
    setReps(0);
    setRemaining(challenge.duration_seconds);
    setRunning(true);
  }

  if (!challenge) {
    return (
      <main className="grid min-h-[60vh] place-items-center px-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Loading match…</p>
      </main>
    );
  }

  const matchOver = challenge.status === "finished";
  const total = Math.max(1, myReps + reps + foeReps);
  const myBar = Math.round((Math.max(myReps, reps) / total) * 100);

  return (
    <main className="px-4 pt-6">
      {/* Ranked match HUD */}
      <section className="panel p-4">
        <p className="text-center font-display text-[11px] uppercase tracking-[0.4em] text-primary">
          Ranked Match
        </p>
        <div className="mt-3 grid grid-cols-3 items-center">
          <div className="text-left">
            <p className="font-display text-sm uppercase tracking-wide">{nameFor(user?.id)}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">You</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Time</p>
            <p className="num-display text-3xl text-glow">
              {formatClock(remaining ?? challenge.duration_seconds)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-sm uppercase tracking-wide">
              {nameFor(isChallenger ? challenge.opponent_id : challenge.challenger_id)}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Opponent</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="num-display text-3xl text-primary">{Math.max(myReps, reps)}</span>
          <div className="relative h-3 flex-1 overflow-hidden rounded-full border border-border bg-background">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${myBar}%` }}
            />
            <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" />
          </div>
          <span className="num-display text-3xl">{foeReps}</span>
        </div>
      </section>

      {matchOver ? (
        <section className="panel mt-4 p-6 text-center">
          <p className="font-display text-3xl uppercase tracking-widest text-primary">
            {challenge.winner_id === null
              ? "Draw"
              : challenge.winner_id === user?.id
                ? "Victory"
                : "Defeat"}
          </p>
          <p className="mt-2 num-display text-lg">
            {myReps} – {foeReps}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">+{xpForReps(myReps)} XP banked</p>
          <button
            onClick={() => void navigate({ to: "/challenges" })}
            className="mt-5 h-12 w-full rounded-xl bg-primary font-display text-sm uppercase tracking-widest text-primary-foreground glow-red active:scale-95"
          >
            Back to challenges
          </button>
        </section>
      ) : (
        <>
          <section className="mt-4">
            <ClientOnly
              fallback={
                <div className="aspect-[3/4] w-full animate-pulse rounded-2xl border border-border bg-card" />
              }
            >
              <Suspense
                fallback={
                  <div className="aspect-[3/4] w-full animate-pulse rounded-2xl border border-border bg-card" />
                }
              >
                <PoseTracker counting={running} onRep={handleRep} onFrame={setFrame} />
              </Suspense>
            </ClientOnly>
          </section>

          <p className="panel mt-3 p-4 text-xs">
            {iAmDone
              ? "Your round is done — waiting for your opponent."
              : running
                ? (frame?.feedback ?? "Looking for your body…")
                : "Press Fight, get in frame and go all out."}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3 pb-6">
            <button
              onClick={startMatch}
              disabled={running || iAmDone}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm uppercase tracking-widest text-primary-foreground glow-red active:scale-95 disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> {running ? "Fighting" : "Fight"}
            </button>
            <button
              onClick={() => void finish()}
              disabled={!running}
              className="flex h-14 items-center justify-center gap-2 rounded-xl border border-border bg-card font-display text-sm uppercase tracking-widest active:scale-95 disabled:opacity-50"
            >
              <Flag className="h-4 w-4" /> Give up
            </button>
          </div>
        </>
      )}
    </main>
  );
}
