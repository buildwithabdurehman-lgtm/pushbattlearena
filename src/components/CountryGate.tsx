import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { CountrySelect } from "@/components/CountrySelect";
import { COUNTRY_COOLDOWN_DAYS } from "@/hooks/use-leaderboards";
import { countryFlag, countryName, guessCountryCode, isCountryCode } from "@/lib/countries";

export const PENDING_COUNTRY_KEY = "pushoff:pending-country";

/**
 * Blocking step shown right after sign-in until the fighter has a country, so
 * every leaderboard entry is attributable to a nation.
 */
export function CountryGate() {
  const { user } = useSession();
  const { data: profile, isPending } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (choice) return;
    const pending =
      typeof window === "undefined" ? null : window.localStorage.getItem(PENDING_COUNTRY_KEY);
    setChoice(isCountryCode(pending) ? pending!.toUpperCase() : guessCountryCode());
  }, [choice]);

  const needsCountry = Boolean(user && !isPending && profile && !profile.country_code);
  if (!needsCountry) return null;

  async function confirm() {
    if (!user || !choice) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ country_code: choice })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save your country");
      return;
    }
    window.localStorage.removeItem(PENDING_COUNTRY_KEY);
    await queryClient.invalidateQueries();
    toast.success(`Fighting for ${countryName(choice)}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/90 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-md rounded-t-2xl border-t border-border bg-card p-5 animate-rise-in">
        <h2 className="text-2xl">Pick your country</h2>
        <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          You fight for this flag on the leaderboards
        </p>
        {choice && (
          <p className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-2xl leading-none">{countryFlag(choice)}</span>
            <span className="font-display uppercase tracking-widest">{countryName(choice)}</span>
            <span className="text-[10px] text-muted-foreground">suggested</span>
          </p>
        )}
        <CountrySelect value={choice} onChange={setChoice} className="mt-4" disabled={saving} />
        <p className="mt-3 text-[10px] text-muted-foreground">
          Country can only be changed once every {COUNTRY_COOLDOWN_DAYS} days.
        </p>
        <button
          onClick={() => void confirm()}
          disabled={!choice || saving}
          className="mt-4 h-14 w-full rounded-xl bg-primary font-display text-base uppercase tracking-widest text-primary-foreground glow-red active:scale-95 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Confirm country"}
        </button>
      </div>
    </div>
  );
}
