import React from "react";
import Link from "next/link";
import { toQuery } from "@/lib/utils";

interface OngoingTournamentCardProps {
  id: string;
  name: string;
  sport: string;
  category: string;
  modes: string;
  venue: string;
  logoText: string;
  logoUrl?: string | null;
}

export default function OngoingTournamentCard({
  id,
  name,
  sport,
  category,
  modes,
  venue,
  logoText,
  logoUrl,
}: OngoingTournamentCardProps) {
  return (
    <Link
      href={`/tournaments/detail${toQuery({ id })}`}
      className="block w-full active:scale-[0.98] transition-transform group"
    >
      <div className="flex flex-col overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        {/* --- TOP SECTION (Orange) --- */}
        <div className="relative flex items-center gap-3 overflow-hidden bg-primary px-3.5 py-3">
          {/* Decorative highlight */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          {/* Logo Badge */}
          <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm dark:bg-[var(--color-surface-elevated)]">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-black tracking-tighter text-orange-600 dark:text-orange-400">
                {logoText}
              </span>
            )}
          </div>

          {/* Event Details */}
          <div className="relative z-10 min-w-0">
            <h3 className="mb-1 truncate text-[17px] font-bold leading-tight text-white">
              {name}
            </h3>
            <p className="text-[10px] font-semibold tracking-wide text-white/90 sm:text-[11px]">
              {sport} &bull; {category} &bull; {modes}
            </p>
          </div>
        </div>

        {/* --- BOTTOM SECTION (Light) --- */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          {/* Venue Info */}
          <div className="flex min-w-0 flex-col truncate">
            <span className="truncate text-sm font-medium text-[var(--color-text-secondary)]">
              {venue}
            </span>
          </div>

          {/* Action Button */}
          <button className="shrink-0 rounded-full border-2 border-orange-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-600 transition-colors duration-200 group-hover:bg-orange-500 group-hover:text-white dark:text-orange-400 dark:group-hover:bg-orange-500/10 dark:group-hover:text-orange-300">
            View More
          </button>
        </div>
      </div>
    </Link>
  );
}
