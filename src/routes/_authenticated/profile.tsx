import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Camera, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  useIsAdmin,
  useMyVerificationRequest,
  useProfile,
  useRecords,
} from "@/hooks/use-profile";
import { VerifiedTick } from "@/components/VerifiedTick";
import { formatClock, rankProgress } from "@/lib/game";
import { RankBadge } from "@/components/RankBadge";
import { XpBar } from "@/components/XpBar";
import { FighterAvatar } from "@/components/FighterAvatar";

const AVATAR_SIZE = 256;

/** Square-crops and shrinks the picked photo so it stays small enough to store. */
async function toSquareDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

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
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { rank, next, percent, xpNeeded } = rankProgress(profile?.total_xp ?? 0);
  const { data: isAdmin } = useIsAdmin();
  const { data: verificationRequest } = useMyVerificationRequest(user?.id);
  const [requesting, setRequesting] = useState(false);

  async function requestVerification() {
    if (!user) return;
    setRequesting(true);
    const { error } = await supabase
      .from("verification_requests")
      .insert({ user_id: user.id, note: null });
    setRequesting(false);
    if (error) {
      toast.error("Could not send your verification request");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-verification", user.id] });
    toast.success("Verification request sent for review");
  }

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

  async function pickPhoto(file: File | undefined) {
    if (!file || !user) return;
    setUploading(true);
    try {
      const dataUrl = await toSquareDataUrl(file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("id", user.id);
      if (error) throw error;
      await queryClient.invalidateQueries();
      toast.success("Profile picture updated");
    } catch {
      toast.error("Could not update your picture");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
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
        <div className="relative">
          <FighterAvatar
            url={profile?.avatar_url}
            name={profile?.username}
            className="h-20 w-20 text-2xl"
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            aria-label="Change profile picture"
            className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground glow-red active:scale-95 disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(event) => void pickPhoto(event.target.files?.[0])}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-xl font-display uppercase">
            <span className="truncate">{profile?.username ?? "…"}</span>
            {profile?.verified && <VerifiedTick className="h-5 w-5" />}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <RankBadge rank={rank} size="sm" className="h-7 w-7" />
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

      <section className="panel mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm uppercase tracking-widest">Verification</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {profile?.verified
                ? "You have the red tick on your profile."
                : verificationRequest?.status === "pending"
                  ? "Your request is waiting for admin review."
                  : verificationRequest?.status === "rejected"
                    ? "Your last request was declined — you can apply again."
                    : "Apply for the red tick shown next to your fighter name."}
            </p>
          </div>
          {profile?.verified ? (
            <BadgeCheck className="h-8 w-8 shrink-0 text-primary" />
          ) : (
            <button
              onClick={() => void requestVerification()}
              disabled={requesting || verificationRequest?.status === "pending"}
              className="shrink-0 rounded-lg bg-primary px-4 py-2.5 font-display text-[10px] uppercase tracking-widest text-primary-foreground active:scale-95 disabled:opacity-50"
            >
              {verificationRequest?.status === "pending" ? "Pending" : "Get verified"}
            </button>
          )}
        </div>
      </section>

      {isAdmin && (
        <Link
          to="/admin"
          className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-accent py-3.5 font-display text-sm uppercase tracking-widest text-primary"
        >
          <ShieldCheck className="h-4 w-4" /> Admin control
        </Link>
      )}

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
