import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Swords } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { rankProgress } from "@/lib/game";
import { RankBadge } from "@/components/RankBadge";
import { FighterAvatar } from "@/components/FighterAvatar";
import { VerifiedTick } from "@/components/VerifiedTick";
import { XpBar } from "@/components/XpBar";

export const Route = createFileRoute("/_authenticated/u/$userId")({
  head: () => ({
    meta: [
      { title: "Fighter Profile — PushOff" },
      {
        name: "description",
        content: "View a PushOff fighter's rank, XP, personal best and battle record.",
      },
      { property: "og:title", content: "Fighter Profile — PushOff" },
      { property: "og:description", content: "Rank, XP and personal best of a PushOff fighter." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const { data: profile, isPending } = useProfile(userId);
  const [busy, setBusy] = useState(false);

  const { rank, next, percent, xpNeeded } = rankProgress(profile?.total_xp ?? 0);
  const isMe = user?.id === userId;

  async function challenge() {
    if (!user || isMe) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("challenges")
      .insert({ challenger_id: user.id, opponent_id: userId, duration_seconds: 60 })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error("Could not send the challenge");
      return;
    }
    toast.success("Challenge sent");
    void navigate({ to: "/challenges" });
  }

  return (
    <main className="px-5 pt-8 pb-8">
      <Link
        to="/leaderboard"
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      {isPending && <p className="mt-6 text-xs text-muted-foreground">Loading fighter…</p>}
      {!isPending && !profile && (
        <p className="mt-6 text-xs text-muted-foreground">This fighter could not be found.</p>
      )}

      {profile && (
        <>
          <section className="panel mt-4 flex items-center gap-4 p-4">
            <FighterAvatar
              url={profile.avatar_url}
              name={profile.username}
              className="h-16 w-16 text-2xl"
            />
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-1.5 truncate text-xl">
                {profile.username}
                {profile.verified && <VerifiedTick className="h-5 w-5" />}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <RankBadge rank={rank} size="sm" className="h-8 w-8" />
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  {rank.name}
                </p>
              </div>
              <XpBar percent={percent} className="mt-3" height="h-2" />
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {next ? `${xpNeeded.toLocaleString()} XP to ${next.name}` : "Max rank reached"}
              </p>
            </div>
          </section>

          <section className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Total XP", value: profile.total_xp.toLocaleString() },
              { label: "Best reps", value: profile.best_reps },
              { label: "Battles", value: profile.battles },
            ].map((stat) => (
              <div key={stat.label} className="panel p-3 text-center">
                <p className="num-display text-xl text-primary">{stat.value}</p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </section>

          {!isMe && (
            <button
              onClick={() => void challenge()}
              disabled={busy}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm uppercase tracking-widest text-primary-foreground glow-red active:scale-95 disabled:opacity-60"
            >
              <Swords className="h-4 w-4" /> Challenge to a duel
            </button>
          )}
        </>
      )}
    </main>
  );
}
