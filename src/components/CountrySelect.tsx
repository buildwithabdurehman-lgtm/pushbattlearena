import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { COUNTRIES, countryFlag } from "@/lib/countries";
import { cn } from "@/lib/utils";

/** Searchable country picker: flag + name, keyboard friendly, mobile-first. */
export function CountrySelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string | null;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [term, setTerm] = useState("");

  const results = useMemo(() => {
    const query = term.trim().toLowerCase();
    const list = query
      ? COUNTRIES.filter(
          (c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase() === query,
        )
      : COUNTRIES;
    return list.slice(0, 120);
  }, [term]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          disabled={disabled}
          placeholder="Search your country"
          aria-label="Search your country"
          className="h-12 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-base outline-none focus:border-primary disabled:opacity-60"
        />
      </div>
      <ul
        role="listbox"
        aria-label="Countries"
        className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card"
      >
        {results.map((country) => {
          const selected = value === country.code;
          return (
            <li key={country.code}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => onChange(country.code)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                  selected ? "bg-accent text-primary" : "text-foreground",
                )}
              >
                <span className="text-lg leading-none">{countryFlag(country.code)}</span>
                <span className="flex-1 truncate">{country.name}</span>
                <span className="num-display text-[10px] tracking-widest text-muted-foreground">
                  {country.code}
                </span>
              </button>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-muted-foreground">
            No country matches “{term}”.
          </li>
        )}
      </ul>
    </div>
  );
}
