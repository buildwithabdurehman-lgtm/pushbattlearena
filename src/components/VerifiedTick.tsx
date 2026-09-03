import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Red verification tick shown next to a verified fighter's name. */
export function VerifiedTick({ className }: { className?: string }) {
  return (
    <BadgeCheck
      className={cn("inline-block shrink-0 text-primary", className ?? "h-4 w-4")}
      aria-label="Verified fighter"
    />
  );
}
