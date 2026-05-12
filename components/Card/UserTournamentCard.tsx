"use client";

import Link from "next/link";
import { TrophyIcon } from "@/components/Icons";

type UserTournamentCardProps = {
  href: string;
  title: string;
  sport: string;
  category: string;
  format: string;
  logoUrl?: string | null;
  ctaLabel?: string;
};

function ArrowUpRightIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

export default function UserTournamentCard({
  href,
  title,
  sport,
  category,
  format,
  logoUrl,
  ctaLabel = "View Tournament Events",
}: UserTournamentCardProps) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[18px] border border-border bg-surface shadow-card transition-all hover:border-primary hover:shadow-card-hover active:scale-[0.98]"
    >
      <div className="flex min-h-[102px]">
        <div className="w-1.5 shrink-0 rounded-l-[18px] bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500" />

        <div className="flex flex-1 flex-col justify-between px-3.5 py-3.5">
          <div className="flex items-start gap-2.5">
            <div className="grid h-10 w-10 shrink-0 place-content-center overflow-hidden rounded-full border border-border bg-surface-elevated text-text">
              {logoUrl ? (
                <img src={logoUrl} alt={title} className="h-full w-full object-cover" />
              ) : (
                <TrophyIcon size={18} />
              )}
            </div>

            <div className="min-w-0 pt-0.5">
              <h4 className="truncate text-[16px] font-semibold leading-tight text-text">
                {title}
              </h4>
              <p className="mt-1 text-xs font-medium text-muted">
                {sport} {"\u2022"} {category} {"\u2022"} {format}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-2.5">
            <span className="text-[13px] font-medium text-orange-600 transition-colors group-hover:text-orange-700">
              {ctaLabel}
            </span>
            <span className="shrink-0 text-orange-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRightIcon size={14} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
