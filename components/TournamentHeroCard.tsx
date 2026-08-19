"use client";

import React from "react";
import { ArrowLeftIcon, ShareIcon, TrophyIcon, UsersIcon } from "@/components/Icons";
import { sanitizeLogoUrl } from "@/lib/logo";
type TournamentHeroCardProps = {
  title: string;
  subtitle: string;
  registeredCount: number | string;
  registrationStatus: string;
  onBack?: () => void;
  onShare?: () => void;
  logoUrl?: string | null;
};

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
  const statusIsClosed = registrationStatus.toLowerCase().includes("closed");
  const statusClass = statusIsClosed
    ? "bg-red-500 text-white shadow-[0_6px_20px_rgba(239,68,68,0.25)]"
    : "bg-[#22c55e] text-white shadow-[0_6px_20px_rgba(34,197,94,0.22)]";

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
            <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)] text-[var(--color-muted)]">
              <TrophyIcon size={24} />
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
            <span
              className={`inline-flex h-9 min-w-[100px] items-center justify-center rounded-full px-5 text-[15px] font-bold ${statusClass}`}
            >
              {registrationStatus}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
