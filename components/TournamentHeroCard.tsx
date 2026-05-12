"use client";

import React from "react";
import { ArrowLeftIcon, ShareIcon, UsersIcon } from "@/components/Icons";
type TournamentHeroCardProps = {
  title: string;
  subtitle: string;
  registeredCount: number | string;
  registrationStatus: string;
  onBack?: () => void;
  onShare?: () => void;
  logoUrl?: string | null;
};

function sanitizeLogoUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (
    lowered === "null" ||
    lowered === "undefined" ||
    lowered === "default" ||
    lowered === "unset" ||
    lowered.endsWith("/default") ||
    lowered.includes("default-logo") ||
    lowered.includes("placeholder")
  ) {
    return null;
  }
  return trimmed;
}

function SoftballLogo() {
  return (
    <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border border-[#f4f0e8] bg-[radial-gradient(circle_at_35%_35%,#fffefb_0%,#faf7ef_58%,#f3ebd8_100%)] shadow-[0_3px_8px_rgba(110,45,0,0.12)]">
      <svg viewBox="0 0 64 64" className="h-[42px] w-[42px]" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r="27"
          fill="#fffdf8"
          stroke="#2f2a21"
          strokeWidth="1.8"
        />
        <circle
          cx="32"
          cy="32"
          r="20.5"
          fill="none"
          stroke="#2f2a21"
          strokeWidth="1.2"
          strokeDasharray="1.3 2.2"
        />
        <path
          d="M18 12c4.8 6.4 7 13.1 7 20s-2.2 13.6-7 20"
          fill="none"
          stroke="#c96b1f"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M46 12c-4.8 6.4-7 13.1-7 20s2.2 13.6 7 20"
          fill="none"
          stroke="#c96b1f"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M15 24c5.8 2.8 11.4 4.2 17 4.2S43.2 26.8 49 24"
          fill="none"
          stroke="#c96b1f"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M15 40c5.8-2.8 11.4-4.2 17-4.2S43.2 37.2 49 40"
          fill="none"
          stroke="#c96b1f"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <text
          x="32"
          y="29"
          textAnchor="middle"
          fontSize="7.2"
          fontWeight="700"
          fill="#2f2a21"
          letterSpacing="1.8"
        >
          SOFT
        </text>
        <text
          x="32"
          y="37.5"
          textAnchor="middle"
          fontSize="6"
          fontWeight="700"
          fill="#2f2a21"
          letterSpacing="1.4"
        >
          BALL
        </text>
      </svg>
    </div>
  );
}

export default function TournamentHeroCard({
  title,
  subtitle,
  registeredCount,
  registrationStatus,
  onBack,
  onShare,
  logoUrl,
}: TournamentHeroCardProps) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const safeLogoUrl = sanitizeLogoUrl(logoUrl);
  const showFallback = imageFailed || !safeLogoUrl;

  React.useEffect(() => {
    setImageFailed(false);
  }, [safeLogoUrl]);

  return (
    <section className="bg-[var(--color-background)] px-4 pb-6 pt-[calc(max(env(safe-area-inset-top),12px)+4px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="grid h-10 w-10 place-content-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] backdrop-blur-md transition-colors hover:bg-[var(--color-surface-elevated)]"
          aria-label="Back"
        >
          <ArrowLeftIcon size={20} />
        </button>
        <button
          onClick={onShare}
          className="grid h-10 w-10 place-content-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] backdrop-blur-md transition-colors hover:bg-[var(--color-surface-elevated)]"
          aria-label="Share"
        >
          <ShareIcon size={18} />
        </button>
      </div>

      {/* Info Section */}
      <div className="mt-8 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-lg">
          {!showFallback ? (
            <img
              src={safeLogoUrl || ""}
              alt="Logo"
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)]">
              <SoftballLogo />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight text-[var(--color-text)]">
            {title}
          </h1>
          <p className="mt-1 text-[16px] font-medium text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Stats/Action Cards */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        {/* Registered Card */}
        <div className="flex h-[110px] items-center gap-4 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="grid h-12 w-12 place-content-center rounded-full bg-[var(--color-surface-elevated)] text-[#ff7a1a]">
            <UsersIcon size={24} />
          </div>
          <div>
            <p className="text-[28px] font-bold leading-none text-[var(--color-text)]">
              {registeredCount}
            </p>
            <p className="mt-1.5 text-[14px] font-medium text-[var(--color-text-secondary)]">
              Registered
            </p>
          </div>
        </div>

        {/* Registration Card */}
        <div className="flex h-[110px] flex-col items-center justify-center rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center shadow-sm">
          <p className="text-[17px] font-bold text-[var(--color-text)]">
            Registration
          </p>
          <div className="mt-3">
            <span className="inline-flex h-9 min-w-[100px] items-center justify-center rounded-full bg-[#ff7a1a] px-5 text-[15px] font-bold text-white shadow-[0_6px_20px_rgba(255,122,26,0.3)]">
              {registrationStatus}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
