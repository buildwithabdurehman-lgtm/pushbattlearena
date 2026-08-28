import { Link } from "@tanstack/react-router";
import { Home, Trophy, Shield, User } from "lucide-react";

const ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/leaderboard", label: "Ranking", icon: Trophy },
  { to: "/ranks", label: "Ranks", icon: Shield },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
