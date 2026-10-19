import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Minus, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";

type Answers = {
  gender: string | null;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: string | null;
  goal: string | null;
  training_days: number;
  equipment: string | null;
  session_minutes: number;
};

const TOTAL_STEPS = 9;

const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentary", hint: "Little to no exercise" },
  { value: "moderate", label: "Moderate", hint: "1 to 3 workouts / week" },
  { value: "active", label: "Active", hint: "3 to 5 workouts / week" },
  { value: "very_active", label: "Very active", hint: "6 to 7 workouts / week" },
  { value: "athlete", label: "High-level athlete", hint: "Intense training or physical job" },
];

const GOAL_OPTIONS = [
  { value: "lose_weight", label: "Lose weight", hint: "Reduce body fat" },
  { value: "maintain", label: "Maintain", hint: "Keep my weight steady" },
  { value: "build_muscle", label: "Build muscle", hint: "Grow muscle mass" },
];

const EQUIPMENT_OPTIONS = [
  { value: "none", label: "No equipment" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "full_gym", label: "Full gym" },
];

const SESSION_OPTIONS = [30, 45, 60];

/**
 * Full-screen step-by-step setup shown to every new fighter until they finish
 * it once. Answers are stored on their profile.
 */
export function OnboardingWizard() {
  const { user } = useSession();
  const { data: profile, isPending } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    gender: null,
    age: 20,
    height_cm: 175,
    weight_kg: 70,
    activity_level: null,
    goal: null,
    training_days: 3,
    equipment: null,
    session_minutes: 45,
  });

  const needsOnboarding = Boolean(user && !isPending && profile && !profile.onboarded_at);
  if (!needsOnboarding) return null;

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  function canContinue(): boolean {
    switch (step) {
      case 0:
        return answers.gender !== null;
      case 4:
        return answers.activity_level !== null;
      case 5:
        return answers.goal !== null;
      case 7:
        return answers.equipment !== null;
      default:
        return true;
    }
  }

  async function finish() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        gender: answers.gender,
        age: answers.age,
        height_cm: answers.height_cm,
        weight_kg: answers.weight_kg,
        activity_level: answers.activity_level,
        goal: answers.goal,
        training_days: answers.training_days,
        equipment: answers.equipment,
        session_minutes: answers.session_minutes,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save your setup");
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("You're all set — welcome to the arena");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Progress header */}
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5 pt-5">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-muted-foreground disabled:opacity-30"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-card">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <span className="font-display text-sm text-muted-foreground">
          {step + 1}/{TOTAL_STEPS}
        </span>
      </div>

      {/* Step body */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-10">
        {step === 0 && (
          <StepShell title="You are...">
            <div className="flex gap-3">
              {["male", "female"].map((value) => (
                <Chip
                  key={value}
                  selected={answers.gender === value}
                  onClick={() => set("gender", value)}
                >
                  {value === "male" ? "Male" : "Female"}
                </Chip>
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="How old are you?">
            <Stepper value={answers.age} min={10} max={99} onChange={(v) => set("age", v)} unit="years old" />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="How tall are you?">
            <Stepper value={answers.height_cm} min={120} max={230} onChange={(v) => set("height_cm", v)} unit="cm" />
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="Your current weight?">
            <Stepper value={answers.weight_kg} min={30} max={250} onChange={(v) => set("weight_kg", v)} unit="kg" />
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="Your activity level?">
            <div className="space-y-3">
              {ACTIVITY_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  label={option.label}
                  hint={option.hint}
                  selected={answers.activity_level === option.value}
                  onClick={() => set("activity_level", option.value)}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title="Your goal?">
            <div className="space-y-3">
              {GOAL_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  label={option.label}
                  hint={option.hint}
                  selected={answers.goal === option.value}
                  onClick={() => set("goal", option.value)}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 6 && (
          <StepShell title="Training days / week?">
            <Stepper
              value={answers.training_days}
              min={1}
              max={7}
              onChange={(v) => set("training_days", v)}
              unit="days"
            />
          </StepShell>
        )}

        {step === 7 && (
          <StepShell title="Available equipment?">
            <div className="flex flex-wrap gap-3">
              {EQUIPMENT_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={answers.equipment === option.value}
                  onClick={() => set("equipment", option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </StepShell>
        )}

        {step === 8 && (
          <StepShell title="Session length?">
            <div className="flex gap-3">
              {SESSION_OPTIONS.map((minutes) => (
                <Chip
                  key={minutes}
                  selected={answers.session_minutes === minutes}
                  onClick={() => set("session_minutes", minutes)}
                >
                  {minutes} min
                </Chip>
              ))}
            </div>
          </StepShell>
        )}
      </div>

      {/* Footer button */}
      <div className="mx-auto w-full max-w-md px-5 pb-8">
        <button
          onClick={() => (step === TOTAL_STEPS - 1 ? void finish() : setStep((s) => s + 1))}
          disabled={!canContinue() || saving}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-base uppercase tracking-widest text-primary-foreground glow-red active:scale-95 disabled:opacity-50"
        >
          {step === TOTAL_STEPS - 1 ? (saving ? "Saving…" : "Enter the arena") : "Next"}
          {step < TOTAL_STEPS - 1 && <ChevronRight className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="animate-rise-in">
      <h2 className="text-3xl font-display uppercase">{title}</h2>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-7 py-3.5 font-display text-base uppercase tracking-wide transition-colors ${
        selected
          ? "bg-primary text-primary-foreground glow-red"
          : "border border-border bg-card text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function OptionCard({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card"
      }`}
    >
      <div>
        <p className={`font-display text-lg uppercase ${selected ? "text-primary" : "text-foreground"}`}>
          {label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
        }`}
      >
        {selected && <Check className="h-4 w-4" />}
      </span>
    </button>
  );
}

function Stepper({
  value,
  min,
  max,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-8">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-primary active:scale-90"
          aria-label="Decrease"
        >
          <Minus className="h-6 w-6" />
        </button>
        <span className="w-24 text-center font-display text-6xl text-primary text-glow">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-primary active:scale-90"
          aria-label="Increase"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{unit}</p>
    </div>
  );
}
