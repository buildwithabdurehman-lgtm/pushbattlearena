import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rank } from "@/lib/game";

const SIZES = {
  sm: "h-9 w-9 text-[10px]",
  md: "h-14 w-14 text-xs",
  lg: "h-20 w-20 text-sm",
} as const;

export function RankBadge({
  rank,
  size = "md",
  className,
}: {
  rank: Rank;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center rounded-lg border border-primary/50 bg-accent",
        rank.tier >= 6 && "glow-red",
        SIZES[size],
        className,
      )}
      aria-label={`Rank ${rank.name}`}
    >
      <Shield className="absolute inset-0 m-auto h-1/2 w-1/2 text-primary/25" strokeWidth={1.5} />
      <span className="relative font-display font-bold tracking-widest text-primary">
        {String(rank.tier).padStart(2, "0")}
      </span>
    </div>
  );
}
