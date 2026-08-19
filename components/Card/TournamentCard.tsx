"use client";

import React from "react";
import Link from "next/link";
import { TournamentData } from "@/lib/models";
import { ChevronRightIcon } from "@/components/Icons";
import { toQuery } from "@/lib/utils";
import { getTournamentStatusMeta } from "@/lib/statusLabels";

type TournamentCardProps = {
  tournament: TournamentData;
  cta?: "Register" | "View" | "Manage";
  href?: string;
};

export default function TournamentCard({
  tournament,
  cta = "View",
  href,
}: TournamentCardProps) {
  const url =
    href ?? "/tournaments/detail" + toQuery({ id: tournament.id || "" });
  const statusMeta = getTournamentStatusMeta(tournament.tournamentState);

  return (
    <Link
      href={url}
      className="block p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] border border-[var(--color-border)] hover:border-primary/30 transition-colors"
    >
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center text-lg font-bold text-primary shrink-0">
          {tournament.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{tournament.name}</h3>
          <p className="text-sm text-[var(--color-muted)]">
            {tournament.venueCity || tournament.venueName || "—"} ·{" "}
            {tournament.startDate}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
          </div>
        </div>
        <span className="self-center text-primary font-medium text-sm shrink-0 inline-flex items-center gap-1">
          {cta}
          <ChevronRightIcon size={16} className="text-primary" />
        </span>
      </div>
    </Link>
  );
}
