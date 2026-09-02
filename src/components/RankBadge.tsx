import {
  Award,
  Crown,
  Diamond,
  Dumbbell,
  Flame,
  Gem,
  Hammer,
  Medal,
  Shield,
  Skull,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rank, RankIcon } from "@/lib/game";

const ICONS: Record<RankIcon, LucideIcon> = {
  dumbbell: Dumbbell,
  flame: Flame,
  hammer: Hammer,
  medal: Medal,
  shield: Shield,
  swords: Swords,
  zap: Zap,
  award: Award,
  gem: Gem,
  diamond: Diamond,
  skull: Skull,
  star: Star,
  crown: Crown,
  trophy: Trophy,
  sparkles: Sparkles,
};

const SIZES = {
  sm: { box: "h-10 w-10", icon: "h-4 w-4", tier: "text-[8px]" },
  md: { box: "h-14 w-14", icon: "h-6 w-6", tier: "text-[9px]" },
  lg: { box: "h-20 w-20", icon: "h-9 w-9", tier: "text-[11px]" },
} as const;

/** Game-style hex rank crest: colored per tier with an emblem and tier number. */
export function RankBadge({
  rank,
  size = "md",
  className,
}: {
  rank: Rank;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = ICONS[rank.icon];
  const dims = SIZES[size];

  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", dims.box, className)}
      aria-label={`Rank ${rank.name}`}
      style={{ ["--rank" as string]: rank.accent }}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
          background:
            "linear-gradient(160deg, color-mix(in oklch, var(--rank) 85%, white) 0%, var(--rank) 45%, color-mix(in oklch, var(--rank) 55%, black) 100%)",
          boxShadow: "0 0 18px -4px var(--rank)",
        }}
      />
      <span
        aria-hidden
        className="absolute inset-[13%]"
        style={{
          clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
          background:
            "linear-gradient(180deg, color-mix(in oklch, var(--card) 82%, var(--rank)) 0%, var(--card) 100%)",
        }}
      />
      <Icon
        className={cn("relative", dims.icon)}
        style={{ color: "var(--rank)" }}
        strokeWidth={2.2}
      />
      <span
        className={cn(
          "num-display absolute bottom-[8%] font-bold tracking-widest text-foreground/80",
          dims.tier,
        )}
      >
        {String(rank.tier).padStart(2, "0")}
      </span>
    </div>
  );
}
