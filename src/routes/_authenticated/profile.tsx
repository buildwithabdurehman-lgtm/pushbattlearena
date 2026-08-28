import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useProfile, useRecords } from "@/hooks/use-profile";
import { formatClock, rankProgress } from "@/lib/game";
import { RankBadge } from "@/components/RankBadge";
import { XpBar } from "@/components/XpBar";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — PushOff" },
      { name: "description", content: "Your PushOff fighter profile, rank, stats and recent battle history." },
      { property: "og:title", content: "Profile — PushOff" },
      { property: "og:description", content: "Your fighter profile, rank and battle history." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: records } = useRecords(user?.id, 10);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { rank, next, percent, xpNeeded } = rankProgress(profile?.total_xp ?? 0);

  useEffect(() => {
    if (profile?.username) setUsername(profile.username);
  }, [profile?.username]);

  async function saveUsername() {
    if (!user || !username.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not update your fighter name");
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Fighter name updated");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="px-5 pt-8">
      <h1 className="text-3xl">Profile</h1>

      <section className="panel mt-6 flex items-center gap-4 p-4">
        <RankBadge rank={rank} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-display uppercase">{profile?.username ?? "…"}</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{rank.name}</p>
          <XpBar percent={percent} className="mt-3" height="h-2" />
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {next ? `${xpNeeded.toLocaleString()} XP to ${next.name}` : "Max rank reached"}
          </p>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Total XP", (profile?.total_xp ?? 0).toLocaleString()],
          ["Best reps", `${profile?.best_reps ?? 0}`],
          ["Battles", `${profile?.battles ?? 0}`],
        ].map(([label, value]) => (
          <div key={label} className="panel p-3 text-center">
            <p className="num-display text-xl">{value}</p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="text-base">Fighter name</h2>
        <div className="mt-2 flex gap-2">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-12 flex-1 rounded-lg border border-input bg-card px-4 text-base outline-none focus:border-primary"
          />
          <button
            onClick={saveUsername}
            disabled={saving}
            className="rounded-lg bg-primary px-5 font-display text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base">Recent battles</h2>
        <ul className="panel mt-2 divide-y divide-border">
          {records?.map((record) => (
            <li key={record.id} className="flex items-center gap-3 px-4 py-3">
              <span className="num-display w-10 text-lg">{record.reps}</span>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {new Date(record.created_at).toLocaleDateString()} ·{" "}
                  {formatClock(record.duration_seconds)}
                </p>
              </div>
              <span className="num-display text-sm text-primary">+{record.xp_earned}</span>
            </li>
          ))}
          {records?.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-muted-foreground">
              No battles logged yet.
            </li>
          )}
        </ul>
      </section>

      <button
        onClick={signOut}
        className="mt-8 mb-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 font-display text-sm uppercase tracking-widest text-muted-foreground"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </main>
  );
}
