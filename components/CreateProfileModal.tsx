"use client";

import React from "react";
import Link from "next/link";
import {
  BuildingIcon,
  ChevronRightIcon,
} from "@/components/Icons";

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProfileModal({
  isOpen,
  onClose,
}: CreateProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end bg-black/40 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-profile-title"
      aria-describedby="create-profile-description"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="relative z-10 w-full rounded-t-[28px] bg-[var(--color-surface)] px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.2)] border-t border-[var(--color-border)]">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--color-muted)] opacity-30" />

        <div className="mt-6">
          <h2 id="create-profile-title" className="text-[24px] font-bold text-[var(--color-text)]">Create Profile</h2>
          <p id="create-profile-description" className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
            Set up an organization profile to start managing tournaments and events.
          </p>
        </div>

        <div className="mt-8 pb-2">
          <Link
            href="/org/create"
            aria-label="Create organization profile"
            className="flex items-center gap-4 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 transition-all hover:bg-[var(--color-surface)] shadow-sm active:scale-[0.98]"
            onClick={onClose}
          >
            <div className="grid h-14 w-14 shrink-0 place-content-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)]">
              <BuildingIcon size={24} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold text-[var(--color-text)]">Organization Profile</p>
              <p className="mt-1 text-[13px] text-[var(--color-text-secondary)] leading-tight">
                Perfect for clubs, teams, or event managers.
              </p>
            </div>
            <ChevronRightIcon size={20} className="text-[var(--color-text-secondary)] opacity-60" />
          </Link>
        </div>
      </div>
    </div>
  );
}
