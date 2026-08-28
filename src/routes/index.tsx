import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Flame } from "lucide-react";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PushOff — Competitive Push-Up Battles" },
      {
        name: "description",
        content:
          "PushOff turns push-ups into a competition. Battle, bank XP, climb the ranks and take over the leaderboard.",
      },
      { property: "og:title", content: "PushOff — Competitive Push-Up Battles" },
      {
        property: "og:description",
        content: "Battle, earn XP, rank up and dominate the PushOff leaderboard.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/home", replace: true });
  }, [loading, session, navigate]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
      />
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-xl border border-primary/50 bg-card animate-pulse-glow">
          <Flame className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-8 text-6xl font-bold tracking-tight text-glow">PushOff</h1>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          Every rep is a rank. Battle, bank XP, and fight your way to Legend.
        </p>
        <div className="mt-10 flex w-full max-w-xs items-center justify-center gap-6 text-center">
          {[
            ["8", "Ranks"],
            ["10", "XP / rep"],
            ["∞", "Battles"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="num-display text-2xl text-primary">{value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-xs">
        <Link
          to="/auth"
          className="flex h-14 items-center justify-center rounded-xl bg-primary font-display text-lg uppercase tracking-widest text-primary-foreground glow-red transition-transform active:scale-95"
        >
          Enter the Arena
        </Link>
        <p className="mt-4 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
          Free · Mobile first · Installable
        </p>
      </div>
    </main>
  );
}
