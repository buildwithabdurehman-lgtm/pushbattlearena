import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/use-session";
import { CountrySelect } from "@/components/CountrySelect";
import { PENDING_COUNTRY_KEY } from "@/components/CountryGate";
import { countryFlag, countryName, guessCountryCode } from "@/lib/countries";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — PushOff" },
      {
        name: "description",
        content: "Create your PushOff fighter account to battle, earn XP and climb the leaderboard.",
      },
      { property: "og:title", content: "Sign in — PushOff" },
      { property: "og:description", content: "Create your PushOff fighter account and start battling." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/home", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    setCountry((current) => current ?? guessCountryCode());
  }, []);

  /** Remembered so the country survives the email-confirmation round trip. */
  function rememberCountry(code: string | null) {
    if (code) window.localStorage.setItem(PENDING_COUNTRY_KEY, code);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "signup" && !country) {
      toast.error("Select the country you fight for");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        rememberCountry(country);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username: username.trim() || email.split("@")[0],
              country_code: country,
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirmation(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    rememberCountry(country);
    const result = await lovable.auth.signInWithOAuth("google", {

      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/home", replace: true });
  }

  if (sentConfirmation) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="panel animate-rise-in p-6 text-center">
          <h1 className="text-2xl">Check your email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Confirm
            it to enter the arena.
          </p>
          <button
            onClick={() => {
              setSentConfirmation(false);
              setMode("login");
            }}
            className="mt-6 w-full rounded-lg border border-border py-3 font-display text-sm uppercase tracking-widest"
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link to="/" className="text-center font-display text-3xl uppercase text-glow">
        PushOff
      </Link>
      <p className="mt-2 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        {mode === "login" ? "Fighter sign in" : "Create your fighter"}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1">
        {(["login", "signup"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`rounded-md py-2.5 font-display text-xs uppercase tracking-widest transition-colors ${
              mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {value === "login" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        {mode === "signup" && (
          <>
            <Field
              label="Fighter name"
              value={username}
              onChange={setUsername}
              placeholder="ironfist"
              autoComplete="nickname"
            />
            <div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Country {country ? `· ${countryFlag(country)} ${countryName(country)}` : "(required)"}
              </span>
              <CountrySelect value={country} onChange={setCountry} className="mt-1.5" />
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Auto-suggested from your device — you can change it now, then only once every 30
                days.
              </p>
            </div>
          </>
        )}

        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@email.com"
          required
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-2 h-14 w-full rounded-xl bg-primary font-display text-base uppercase tracking-widest text-primary-foreground glow-red transition-transform active:scale-95 disabled:opacity-60"
        >
          {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={busy}
        className="h-13 w-full rounded-xl border border-border bg-card py-3.5 font-display text-sm uppercase tracking-widest disabled:opacity-60"
      >
        Continue with Google
      </button>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        {...rest}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
    </label>
  );
}
