import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Pause, Play, Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { usePushupSession } from "@/hooks/use-pushup-session";
import { dailyChallenge, formatClock, xpForReps } from "@/lib/game";
import { XpBar } from "@/components/XpBar";

export const Route = createFileRoute("/_authenticated/battle")({
  head: () => ({
    meta: [
      { title: "Push-Up Battle — PushOff" },
      { name: "description", content: "Count your reps, beat the clock and bank XP in a PushOff battle." },
      { property: "og:title", content: "Push-Up Battle — PushOff" },
      { property: "og:description", content: "Count reps, beat the clock, bank XP." },
    ],
  }),
  component: BattlePage,
});

function BattlePage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { reps, seconds, status, start, pause, finish, addRep } = usePushupSession();
  const [saving, setSaving] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const challenge = dailyChallenge();
  const best = profile?.best_reps ?? 0;
  const goal = Math.max(best + 1, challenge.target);
  const progress = Math.round((reps / goal) * 100);

  function bump(delta: number) {
    if (status === "idle") start();
    addRep(delta);
    setPopKey((value) => value + 1);
  }

  async function handleFinish() {
    if (!user) return;
    finish();
    setSaving(true);
    const { error } = await supabase.from("pushup_records").insert({
      user_id: user.id,
      reps,
      duration_seconds: seconds,
      source: "manual",
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

  return (
    <main className="flex min-h-[calc(100vh-6rem)] flex-col px-5 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Battle</h1>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Manual counter
          </p>
        </div>
        <div className="text-right">
          <p className="num-display text-2xl">{formatClock(seconds)}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Timer</p>
        </div>
      </header>

      <section className="relative mt-8 grid flex-1 place-items-center">
        <div
          aria-hidden
          className="pointer-events-none absolute h-56 w-56 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative text-center">
          <p key={popKey} className="num-display animate-count-pop text-[7rem] text-glow">
            {reps}
          </p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Push-ups</p>
          <p className="mt-2 num-display text-sm text-primary">+{xpForReps(reps)} XP</p>
        </div>
      </section>

      <section className="panel p-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Live progress</span>
          <span>
            {reps}/{goal}
          </span>
        </div>
        <XpBar percent={progress} className="mt-2" />
      </section>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <button
          onClick={() => bump(-1)}
          disabled={status === "finished"}
          className="grid h-20 place-items-center rounded-xl border border-border bg-card active:scale-95 disabled:opacity-50"
          aria-label="Remove one push-up"
        >
          <Minus className="h-7 w-7" />
        </button>
        <button
          onClick={() => bump(1)}
          disabled={status === "finished"}
          className="col-span-2 grid h-20 place-items-center rounded-xl bg-primary text-primary-foreground glow-red active:scale-95 disabled:opacity-50"
          aria-label="Add one push-up"
        >
          <Plus className="h-9 w-9" />
        </button>
      </div>

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
