import React from "react";
import Link from "next/link";
import {
  MapPinIcon,
  UsersIcon,
  CalendarIcon,
  WalletIcon,
  TrophyIcon,
} from "@/components/Icons";
import { sanitizeLogoUrl } from "@/lib/logo";

export type OrgTournamentCardProps = {
  id: string;
  name: string;
  subtitle: string;
  badgeLabel?: string;
  location: string;
  eventsCount: number | string;
  date: string;
  entryFee: string;
  href: string;
  logoUrl?: string;
};

export default function OrgTournamentCard({
  name,
  subtitle,
  badgeLabel,
  location,
  eventsCount,
  date,
  entryFee,
  href,
  logoUrl,
}: OrgTournamentCardProps) {
  const safeLogoUrl = sanitizeLogoUrl(logoUrl ?? null);

  return (
    <Link
      href={href}
      className="block rounded-[18px] border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow-card)] transition hover:border-primary"
    >
      <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-x-3 gap-y-3">
        {/* Logo Container - Compact Visual Anchor */}
        <div className="self-start pt-0.5">
          {safeLogoUrl ? (
            <img
              src={safeLogoUrl}
              alt={name}
              className="h-[42px] w-[42px] rounded-full object-cover border border-border bg-surface shadow-sm"
            />
          ) : (
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-surface shadow-sm">
              <TrophyIcon size={18} className="text-[#5a5a63]" />
            </div>
          )}
        </div>

        {/* Content Block - Occupies majority width */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <h3 className="truncate text-[16px] font-semibold leading-5 text-[var(--color-text)]">
              {name || "Untitled Tournament"}
            </h3>
            <p className="mt-[2px] truncate text-[12px] text-[var(--color-text-muted)]">
              {subtitle || "No events"}
            </p>
          </div>

          {/* Badge - Right padding buffer */}
          {badgeLabel && (
            <span className="shrink-0 rounded-full bg-[#2ecc71] px-2.5 py-[2px] text-[10px] font-bold tracking-wide text-white shadow-sm mt-0.5">
              {badgeLabel}
            </span>
          )}
        </div>

        {/* Metadata Grid */}
        <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] text-[var(--color-text-secondary)]">
          <div className="flex min-w-0 items-center gap-1.5">
            <CalendarIcon size={13} className="shrink-0 text-[#5a5a63]" />
            <span className="truncate">{date}</span>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 justify-self-end text-right">
            <UsersIcon size={13} className="shrink-0 text-[#5a5a63]" />
            <span className="truncate">{eventsCount} {typeof eventsCount === 'number' ? 'Events' : ''}</span>
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            {entryFee.includes("₹") ? (
              <span className="shrink-0 text-[#5a5a63] text-[13px] leading-none font-serif mt-[1px]">₹</span>
            ) : (
              <WalletIcon size={13} className="shrink-0 text-[#5a5a63]" />
            )}
            <span className="truncate">{entryFee.replace("₹", "").trim()}{entryFee.toLowerCase().includes('entry') ? '' : ' Entry'}</span>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 justify-self-end text-right">
            <MapPinIcon size={13} className="shrink-0 text-[#5a5a63]" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
