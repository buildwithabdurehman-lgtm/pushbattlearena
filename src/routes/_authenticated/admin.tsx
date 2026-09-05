import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Pencil, Search, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  useFighterSearch,
  useIsAdmin,
  useLeaderboard,
  usePendingVerifications,
  useVerifiedFighters,
  type Profile,
} from "@/hooks/use-profile";
import { useProfilesByIds } from "@/hooks/use-challenges";
import { FighterAvatar } from "@/components/FighterAvatar";
import { VerifiedTick } from "@/components/VerifiedTick";
import { CountrySelect } from "@/components/CountrySelect";
import { countryFlag, countryName } from "@/lib/countries";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Control — PushOff" },
      {
        name: "description",
        content: "PushOff admin tools: review verification requests and grant the red tick.",
      },
      { property: "og:title", content: "Admin Control — PushOff" },
      { property: "og:description", content: "Review verification requests and verify fighters." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useSession();
  const { data: isAdmin, isPending: adminPending } = useIsAdmin();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);

  const term = search.trim();
  const { data: results = [] } = useFighterSearch(term);
  const { data: top = [] } = useLeaderboard(20);
  const { data: pending = [] } = usePendingVerifications(Boolean(isAdmin));
  const { data: requesters = [] } = useProfilesByIds(pending.map((r) => r.user_id));
  const { data: verifiedFighters = [] } = useVerifiedFighters(Boolean(isAdmin));

  const list: Profile[] = term.length > 0 ? results : top;

  async function setVerified(targetId: string, verified: boolean) {
    setBusy(targetId);
    const { error } = await supabase
      .from("profiles")
      .update({ verified, verified_at: verified ? new Date().toISOString() : null })
      .eq("id", targetId);
    if (!error) {
      await supabase
        .from("verification_requests")
        .update({
          status: verified ? "approved" : "rejected",
          reviewed_by: user?.id ?? null,
        })
        .eq("user_id", targetId)
        .eq("status", "pending");
    }
    setBusy(null);
    if (error) {
      toast.error("Could not update verification");
      return;
    }
    toast.success(verified ? "Fighter verified" : "Verification removed");
    await queryClient.invalidateQueries();
  }

  if (adminPending) {
    return <main className="px-5 pt-8 text-xs text-muted-foreground">Checking access…</main>;
  }

  if (!isAdmin) {
    return (
      <main className="px-5 pt-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-xl">Admins only</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          This control room is restricted to PushOff administrators.
        </p>
      </main>
    );
  }

  return (
    <main className="px-5 pt-8 pb-8">
      <header>
        <h1 className="text-2xl">Admin control</h1>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Verification and fighter management
        </p>
      </header>

      <section className="panel mt-5 p-4">
        <h2 className="text-sm uppercase tracking-widest text-primary">
          Verification requests ({pending.length})
        </h2>
        <ul className="mt-3 space-y-2">
          {pending.length === 0 && (
            <li className="text-xs text-muted-foreground">No pending requests.</li>
          )}
          {pending.map((request) => {
            const who = requesters.find((p) => p.id === request.user_id);
            return (
              <li
                key={request.id}
                className="rounded-lg border border-border bg-background px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <FighterAvatar url={who?.avatar_url ?? null} name={who?.username ?? "Fighter"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm uppercase tracking-wide">
                      {who?.username ?? "Fighter"}
                    </p>
                    {request.note && (
                      <p className="truncate text-[11px] text-muted-foreground">{request.note}</p>
                    )}
                  </div>
                  <button
                    onClick={() => void setVerified(request.user_id, true)}
                    disabled={busy === request.user_id}
                    className="grid h-10 w-12 place-items-center rounded-lg bg-primary text-primary-foreground glow-red active:scale-95 disabled:opacity-50"
                    aria-label="Approve verification"
                  >
                    <BadgeCheck className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void setVerified(request.user_id, false)}
                    disabled={busy === request.user_id}
                    className="grid h-10 w-12 place-items-center rounded-lg border border-border bg-card active:scale-95 disabled:opacity-50"
                    aria-label="Reject verification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel mt-4 p-4">
        <h2 className="text-sm uppercase tracking-widest">Fighters</h2>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search any fighter"
            aria-label="Search fighters"
            className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <ul className="mt-3 space-y-2">
          {list.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
            >
              <FighterAvatar url={p.avatar_url} name={p.username} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm">
                  {p.username}
                  {p.verified && <VerifiedTick className="h-3.5 w-3.5" />}
                </p>
                <p className="num-display text-[10px] text-muted-foreground">
                  {p.total_xp.toLocaleString()} XP
                </p>
              </div>
              <button
                onClick={() => void setVerified(p.id, !p.verified)}
                disabled={busy === p.id}
                className={`rounded-lg px-3 py-2 font-display text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50 ${
                  p.verified
                    ? "border border-border bg-card text-muted-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {p.verified ? "Unverify" : "Verify"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
