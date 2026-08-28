import { cn } from "@/lib/utils";

export function XpBar({
  percent,
  className,
  height = "h-2.5",
}: {
  percent: number;
  className?: string;
  height?: string;
}) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-secondary", height, className)}>
      <div
        className="h-full rounded-full bg-primary glow-red transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
      />
    </div>
  );
}
