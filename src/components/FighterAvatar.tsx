import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  url?: string | null | undefined;
  name?: string | null | undefined;
  isBot?: boolean | undefined;
  className?: string | undefined;
};

/** Round fighter portrait with an initials fallback. */
export function FighterAvatar({ url, name, isBot = false, className }: Props) {
  const initials = (name ?? "")
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border border-primary/40 bg-card text-primary",
        "h-10 w-10",
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt={name ? `${name} profile picture` : "Fighter profile picture"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : isBot ? (
        <Bot className="h-1/2 w-1/2" aria-hidden />
      ) : (
        <span className="font-display text-xs uppercase tracking-wide">{initials || "?"}</span>
      )}
    </span>
  );
}
