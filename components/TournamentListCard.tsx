"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarIcon,
  ChevronRightIcon,
  MapPinIcon,
  TimerIcon,
  TrophyIcon,
  WalletIcon,
} from "@/components/Icons";
import { toQuery } from "@/lib/utils";
import { sanitizeLogoUrl } from "@/lib/logo";

export type TournamentListItem = {
  id: string;
  name: string;
  subtitle: string;
  start: string;
  end: string;
  entry?: string;
  location: string;
  format?: "singles" | "doubles";
  cta: "Register" | "View" | "Chevron";
  joinedStatus?: string;
  statusLabel?: string;
  logoUrl?: string | null;
};

function SoftballLogo({ url, name }: { url?: string | null; name: string }) {
  const safeLogoUrl = sanitizeLogoUrl(url);
  if (safeLogoUrl) {
    return (
      <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] rounded-full overflow-hidden border border-[var(--color-border)] shadow-sm bg-[var(--color-surface-elevated)] shrink-0">
        <img src={safeLogoUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border border-[#f28a36] bg-[radial-gradient(circle_at_35%_35%,#fffefb_0%,#faf7ef_58%,#f3ebd8_100%)] text-[#c96b1f] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_8px_rgba(242,138,54,0.08)]">
      <TrophyIcon size={20} />
    </div>
  );
}

function PennantIcon({
  size = 12,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 21V4" />
      <path d="m5 5 13 4-13 4" />
    </svg>
  );
}

export default function TournamentListCard({
  item,
}: {
  item: TournamentListItem;
}) {
  const isHistory = item.cta === "Chevron";
  const statusLabel =
    item.statusLabel ||
    (isHistory
      ? item.joinedStatus || "Completed"
      : item.cta === "View"
        ? "Joined"
        : "Registered");
  const statusClass =
    statusLabel.toLowerCase() === "completed" || statusLabel.toLowerCase() === "history"
      ? "bg-green-500/15 text-green-600 border-green-200"
      : statusLabel.toLowerCase() === "joined" || statusLabel.toLowerCase() === "participating"
        ? "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30"
        : statusLabel.toLowerCase().includes("closed")
          ? "bg-amber-500/15 text-amber-600 border-amber-300"
          : "bg-primary/15 text-primary border-primary/20";
  if (isHistory) {
    return (
      <Link
        href={`/tournaments/detail${toQuery({ id: item.id })}`}
        className="block rounded-[16px] border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-card)] transition hover:border-primary"
      >
        <div className="grid grid-cols-[42px_minmax(0,1fr)_18px] gap-x-3 gap-y-3">
          <div className="row-span-2 self-start pt-0.5">
            <SoftballLogo url={item.logoUrl} name={item.name} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold leading-5 text-[var(--color-text)]">
              {item.name}
            </h3>
            <p className="mt-[2px] truncate text-[11px] text-[var(--color-text-muted)]">
              {item.subtitle}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusClass}`}
              >
                {statusLabel}
              </span>
              {item.joinedStatus && item.joinedStatus !== statusLabel && (
                <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
                  {item.joinedStatus}
                </span>
              )}
            </div>
          </div>

          <ChevronRightIcon size={16} className="mt-0.5 text-muted" />

          <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-[var(--color-text-secondary)]">
            <div className="flex min-w-0 items-center gap-1.5">
              <CalendarIcon size={12} className="shrink-0 text-[#5a5a63]" />
              <span className="truncate">Start: {item.start}</span>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 justify-self-end text-right">
              <TimerIcon size={12} className="shrink-0 text-[#5a5a63]" />
              <span className="truncate">End: {item.end || "Not Decided"}</span>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <MapPinIcon size={12} className="shrink-0 text-[#5a5a63]" />
              <span className="truncate">{item.location}</span>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 justify-self-end text-right">
              <PennantIcon size={12} className="shrink-0 text-[#5a5a63]" />
              <span className="truncate">{item.joinedStatus}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/tournaments/detail${toQuery({ id: item.id })}`}
      className="block rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition hover:border-primary active:scale-[0.99]"
    >
      <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-5">
        <div className="self-start">
          <SoftballLogo url={item.logoUrl} name={item.name} />
        </div>

        <div className="min-w-0 flex flex-col justify-center">
          <h3 className="truncate text-[18px] font-bold leading-tight text-[var(--color-text)]">
            {item.name}
          </h3>
          <p className="mt-1 truncate text-[13px] font-medium text-[var(--color-text-muted)] opacity-90">
            {item.subtitle}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusClass}`}
            >
              {statusLabel}
            </span>
            {item.joinedStatus && item.joinedStatus !== statusLabel && (
              <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
                {item.joinedStatus}
              </span>
            )}
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-x-8 gap-y-3.5 text-[13px] font-medium text-[var(--color-text-secondary)]">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarIcon size={14} className="shrink-0 text-primary/70" />
            <span className="truncate">Start: {item.start}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 justify-self-end text-right">
            <TimerIcon size={14} className="shrink-0 text-primary/70" />
            <span className="truncate">End: {item.end || "Not Decided"}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <WalletIcon size={14} className="shrink-0 text-primary/70" />
            <span className="truncate">
              {item.entry
                ? Number.isNaN(Number(item.entry))
                  ? item.entry
                  : `${item.entry} ${Number(item.entry) === 1 ? "Event" : "Events"}`
                : "No Events"}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 justify-self-end text-right">
            <MapPinIcon size={14} className="shrink-0 text-primary/70" />
            <span className="truncate">{item.location}</span>
          </div>
        </div>

        <div className="col-span-2 pt-2">
          <span className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[16px] font-bold text-white shadow-[0_4px_12px_rgba(255,122,26,0.3)] active:scale-[0.98] transition-all">
            {item.cta}
          </span>
        </div>
      </div>
    </Link>
  );
}
