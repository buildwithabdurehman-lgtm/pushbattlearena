import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Pause, Play, Flag, Camera, Hand } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { usePushupSession } from "@/hooks/use-pushup-session";
import { dailyChallenge, formatClock, xpForReps } from "@/lib/game";
import { XpBar } from "@/components/XpBar";
import type { DetectorFrame } from "@/lib/pushup-detector";

const PoseTracker = lazy(() =>
  import("@/components/PoseTracker").then((mod) => ({ default: mod.PoseTracker })),
);

export const Route = createFileRoute("/_authenticated/battle")({
  head: () => ({
    meta: [
      { title: "Push-Up Battle — PushOff" },
      {
        name: "description",
        content:
          "Live camera push-up tracking with pose detection — count valid reps, beat the clock and bank XP.",
      },
      { property: "og:title", content: "Push-Up Battle — PushOff" },
      { property: "og:description", content: "Live pose-tracked push-ups. Count reps, bank XP." },
    ],
  }),
  component: BattlePage,
});

type Mode = "camera" | "manual";

function BattlePage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { reps, seconds, status, start, pause, finish, addRep } = usePushupSession();
  const [mode, setMode] = useState<Mode>("camera");
  const [saving, setSaving] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const [frame, setFrame] = useState<DetectorFrame | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const challenge = dailyChallenge();
  const best = profile?.best_reps ?? 0;
  const goal = Math.max(best + 1, challenge.target);
  const progress = Math.round((reps / goal) * 100);

  const bump = useCallback(
    (delta: number) => {
      addRep(delta);
      setPopKey((value) => value + 1);
    },
    [addRep],
  );

  const handleDetectedRep = useCallback(() => {
    bump(1);
  }, [bump]);

  async function handleFinish() {
    if (!user) return;
    finish();
    setSaving(true);
    const { error } = await supabase.from("pushup_records").insert({
      user_id: user.id,
      reps,
      duration_seconds: seconds,
      source: mode,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save your battle");
      return;
    }
    await queryClient.invalidateQueries();
    void navigate({
      to: "/results",
      search: { reps, seconds, xp: xpForReps(reps), best },
      replace: true,
    });
  }

  const counting = status === "running";

  return (
    <main className="flex min-h-[calc(100vh-6rem)] flex-col px-5 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Battle</h1>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {mode === "camera" ? "Live pose tracking" : "Manual counter"}
          </p>
        </div>
        <div className="text-right">
          <p className="num-display text-2xl">{formatClock(seconds)}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Timer</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-1">
        {(["camera", "manual"] as Mode[]).map((option) => (
          <button
            key={option}
            onClick={() => setMode(option)}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg font-display text-[11px] uppercase tracking-widest transition ${
              mode === option
                ? "bg-primary text-primary-foreground glow-red"
                : "text-muted-foreground"
            }`}
          >
            {option === "camera" ? <Camera className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
            {option === "camera" ? "Camera" : "Manual"}
          </button>
        ))}
      </div>

      {mode === "camera" ? (
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
              <PoseTracker counting={counting} onRep={handleDetectedRep} onFrame={setFrame} />
            </Suspense>
          </ClientOnly>

          <div className="mt-3 flex items-center justify-between panel px-4 py-3">
            <div>
              <p key={popKey} className="num-display animate-count-pop text-4xl text-glow">
                {reps}
              </p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Reps</p>
            </div>
            <div className="text-right">
              <p className="num-display text-sm text-primary">+{xpForReps(reps)} XP</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Elbow {frame?.elbowAngle != null ? `${frame.elbowAngle}°` : "—"}
              </p>
            </div>
          </div>

          <div className="panel mt-3 p-4">
            <p className="text-xs text-foreground">
              {!counting
                ? "Press Start, then get in frame side-on with your full body visible."
                : (frame?.feedback ?? "Looking for your body…")}
            </p>
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Rep depth</span>
              <span>{frame?.phase === "down" ? "Down" : frame?.phase === "up" ? "Up" : "—"}</span>
            </div>
            <XpBar percent={frame?.depth ?? 0} className="mt-2" />
          </div>
        </section>
      ) : (
        <>
          <section className="relative mt-8 grid flex-1 place-items-center">
            <div
              aria-hidden
              className="pointer-events-none absolute h-56 w-56 rounded-full bg-primary/15 blur-3xl"
            />
            <div className="relative text-center">
              <p key={popKey} className="num-display animate-count-pop text-[7rem] text-glow">
                {reps}
              </p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Push-ups
              </p>
              <p className="mt-2 num-display text-sm text-primary">+{xpForReps(reps)} XP</p>
            </div>
          </section>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <button
              onClick={() => {
                if (status === "idle") start();
                bump(-1);
              }}
              disabled={status === "finished"}
              className="grid h-20 place-items-center rounded-xl border border-border bg-card active:scale-95 disabled:opacity-50"
              aria-label="Remove one push-up"
            >
              <Minus className="h-7 w-7" />
            </button>
            <button
              onClick={() => {
                if (status === "idle") start();
                bump(1);
              }}
              disabled={status === "finished"}
              className="col-span-2 grid h-20 place-items-center rounded-xl bg-primary text-primary-foreground glow-red active:scale-95 disabled:opacity-50"
              aria-label="Add one push-up"
            >
              <Plus className="h-9 w-9" />
            </button>
          </div>
        </>
      )}

      <section className="panel mt-4 p-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Live progress</span>
          <span>
            {reps}/{goal}
          </span>
        </div>
        <XpBar percent={progress} className="mt-2" />
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3 pb-4">
        <button
          onClick={() => (status === "running" ? pause() : start())}
          disabled={status === "finished"}
          className="flex h-14 items-center justify-center gap-2 rounded-xl border border-border bg-card font-display text-sm uppercase tracking-widest active:scale-95 disabled:opacity-50"
        >
          {status === "running" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {status === "running" ? "Pause" : status === "paused" ? "Resume" : "Start"}
        </button>
        <button
          onClick={handleFinish}
          disabled={saving || status === "finished" || reps === 0}
          className="flex h-14 items-center justify-center gap-2 rounded-xl bg-secondary font-display text-sm uppercase tracking-widest text-secondary-foreground active:scale-95 disabled:opacity-50"
        >
          <Flag className="h-4 w-4" />
          {saving ? "Saving…" : "Finish"}
        </button>
      </div>
    </main>
  );
}
