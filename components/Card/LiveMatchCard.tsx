"use client";

import Image from "next/image";
import { MapPinIcon } from "@/components/Icons";

type Team = {
  players: string[];
  images?: string[];
};

type LiveMatchCardProps = {
  tournamentName: string;
  matchTitle: string;
  teamA: Team;
  teamB: Team;
  score: {
    teamA: number;
    teamB: number;
    currentSet: number;
  };
  court?: string | null;
  isLive?: boolean;
  onFollow?: () => void;
  size?: "compact" | "spacious";
};

function HeartIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 20.25-.9-.82C5.2 14.08 2 11.14 2 7.5A4.5 4.5 0 0 1 6.5 3 5 5 0 0 1 12 6.1 5 5 0 0 1 17.5 3 4.5 4.5 0 0 1 22 7.5c0 3.64-3.2 6.58-9.1 11.93Z" />
    </svg>
  );
}

function avatarDataUri(
  seed: string,
  accent: string,
  skin: string,
  shirt: string,
) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="72" height="72" rx="36" fill="url(#bg)" />
      <circle cx="36" cy="26" r="13" fill="${skin}" />
      <path d="M17 67c2-13 11-20 19-20s17 7 19 20" fill="${shirt}" />
      <path d="M23 25c2-10 10-16 13-16 8 0 14 5 16 15-2-2-4-4-8-4-5 0-9 3-11 6-2-3-5-4-10-1Z" fill="#2f241f" />
      <circle cx="31" cy="27" r="1.2" fill="#2f241f" />
      <circle cx="41" cy="27" r="1.2" fill="#2f241f" />
      <path d="M31 34c1.8 1.4 7.2 1.4 9 0" stroke="#8f5e45" stroke-width="1.8" stroke-linecap="round" />
      <text x="36" y="63" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="700" fill="#ffffff" opacity="0.8">${seed}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const avatarPalette = [
  { accent: "#fed7aa", skin: "#f3c7a3", shirt: "#f97316" },
  { accent: "#fde68a", skin: "#e9bb92", shirt: "#fb923c" },
  { accent: "#bfdbfe", skin: "#f0c6a3", shirt: "#3b82f6" },
  { accent: "#c7d2fe", skin: "#d8a47f", shirt: "#6366f1" },
];

function buildAvatar(name: string, index: number, provided?: string) {
  if (provided) {
    return provided;
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const palette = avatarPalette[index % avatarPalette.length];

  return avatarDataUri(initials, palette.accent, palette.skin, palette.shirt);
}

export function TeamAvatarStack({
  players,
  images,
  sizeClass = "h-9 w-9",
}: {
  players: string[];
  images?: string[];
  sizeClass?: string;
}) {
  return (
    <div className="flex items-center justify-center">
      {(players || []).slice(0, 2).map((player, index) => (
        <div
          key={`${player}-${index}`}
          className={`relative ${index === 0 ? "z-20" : "z-10 -ml-3"}`}
        >
          <div
            className={`relative ${sizeClass} overflow-hidden rounded-full border-2 bg-[var(--color-surface)] shadow-[0_4px_12px_rgba(15,23,42,0.18)] ${
              index === 0
                ? "border-orange-400 ring-2 ring-orange-200/80"
                : "border-white"
            }`}
          >
            <Image
              src={buildAvatar(player, index, images?.[index])}
              alt={player}
              fill
              sizes="36px"
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LiveMatchCard({
  tournamentName,
  matchTitle,
  teamA,
  teamB,
  score,
  court,
  isLive = true,
  onFollow,
  size = "compact",
}: LiveMatchCardProps) {
  const isSpacious = size === "spacious";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-[var(--color-surface)] shadow-[0_6px_18px_rgba(15,23,42,0.05)] ${isSpacious ? "space-y-4 p-5" : "space-y-3 p-3.5"}`}
    >
      <div
        className={`flex items-start justify-between ${isSpacious ? "gap-4" : "gap-3"}`}
      >
        <div className="min-w-0">
          <p
            className={`truncate font-bold text-[var(--color-text)] ${isSpacious ? "text-sm" : "text-xs"}`}
          >
            {tournamentName}
          </p>
          <p
            className={`mt-0.5 truncate font-medium text-[var(--color-text-secondary)] ${isSpacious ? "text-base" : "text-sm"}`}
          >
            {matchTitle}
          </p>
        </div>

        {isLive && (
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-300 ${isSpacious ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[11px]"}`}
          >
            <span
              className={`animate-pulse rounded-full bg-red-500 ${isSpacious ? "h-2 w-2" : "h-1.5 w-1.5"}`}
            />
            LIVE
          </div>
        )}
      </div>

      <div
        className={`border-t border-neutral-200/70 ${isSpacious ? "pt-4" : "pt-3"}`}
      >
        <div
          className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center ${isSpacious ? "gap-2 sm:gap-4" : "gap-1 sm:gap-3"}`}
        >
          <div className="flex min-w-0 flex-col items-center text-center">
            <TeamAvatarStack
              players={teamA?.players || []}
              images={teamA?.images}
            />
            <div
              className={`mt-1.5 flex w-full flex-col font-semibold text-[var(--color-text)] ${isSpacious ? "max-w-[140px] text-sm gap-0.5" : "max-w-[110px] text-[13px] gap-0.5"}`}
            >
              {(teamA?.players?.length ? teamA.players : ["Player"]).map((p, i) => (
                <span key={i} className="w-full truncate leading-tight">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div
            className={`flex flex-col items-center ${isSpacious ? "min-w-[80px] sm:min-w-[96px]" : "min-w-[64px] sm:min-w-[74px]"}`}
          >
            <div
              className={`font-extrabold whitespace-nowrap leading-none tracking-[-0.04em] text-[var(--color-text)] ${isSpacious ? "text-[32px] sm:text-[42px]" : "text-2xl sm:text-[34px]"}`}
            >
              {score?.teamA ?? 0}{" "}
              <span className="text-[var(--color-muted)]">{"\u2013"}</span>{" "}
              {score?.teamB ?? 0}
            </div>
            <div
              className={`rounded-full bg-orange-100 font-semibold text-orange-600 dark:bg-orange-500/15 dark:text-orange-300 ${isSpacious ? "mt-2 px-3 py-1 text-xs" : "mt-1.5 px-2 py-0.5 text-[10px]"}`}
            >
              Set {score?.currentSet ?? 1}
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-center text-center">
            <TeamAvatarStack
              players={teamB?.players || []}
              images={teamB?.images}
            />
            <div
              className={`mt-1.5 flex w-full flex-col font-semibold text-[var(--color-text)] ${isSpacious ? "max-w-[140px] text-sm gap-0.5" : "max-w-[110px] text-[13px] gap-0.5"}`}
            >
              {(teamB?.players?.length ? teamB.players : ["Player"]).map((p, i) => (
                <span key={i} className="w-full truncate leading-tight">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`flex items-center justify-between border-t border-neutral-200/70 ${isSpacious ? "pt-3.5" : "pt-2.5"}`}
      >
        {court?.trim() ? (
          <div
            className={`flex min-w-0 items-center gap-1.5 font-medium text-[var(--color-text-secondary)] ${isSpacious ? "text-sm" : "text-xs"}`}
          >
            <MapPinIcon
              size={isSpacious ? 15 : 13}
              className="shrink-0 text-[var(--color-muted)]"
            />
            <span className="truncate">{court}</span>
          </div>
        ) : (
          <div />
        )}

        <button
          onClick={onFollow}
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-orange-50 hover:text-orange-600 active:scale-[0.98] ${isSpacious ? "px-2 py-1.5 text-sm" : "px-1.5 py-1 text-xs"}`}
        >
          <span>Follow</span>
          <HeartIcon size={isSpacious ? 15 : 13} />
        </button>
      </div>
    </div>
  );
}
