"use client";

import React from "react";
import Link from "next/link";
import TeamLogo from "@/components/TeamLogo";

export default function ScorerMatchCard({ match }: { match: any }) {
  const getTeamName = (t: any) => {
    if (!t) return "Empty Slot";
    const participants = t.participants || [];
    if (participants.length === 0) return t.name || "Unknown Team";
    if (participants.length === 1) return participants[0].user?.name || t.name || "Player";
    return participants.map((p: any) => p.user?.name?.[0]?.toUpperCase() || "P").join(" & ");
  };

  const teamAName = getTeamName(match.teamAData || match.teamA);
  const teamBName = getTeamName(match.teamBData || match.teamB);

  const eventName = match.event?.name || "Event";
  const tournamentName = match.event?.tournament?.name || "Tournament";

  const isLive = match.matchState === "in_progress";
  const isCompleted = match.matchState === "completed" || match.matchState === "abandoned" || match.matchState === "walkover";

  let dateStr = "TBA";
  if (match.scheduledAt || match.startTime) {
    const d = new Date(match.scheduledAt || match.startTime);
    dateStr = d.toLocaleDateString("en-IN", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  const tournamentId = match.event?.tournament?.id || match.event?.tournamentId || "";
  const eventId = match.event?.id || match.eventId || "";
  const matchId = match.id || "";

  const setupHref =
    `/user/manage/tournament/event/match/setup` +
    `?tournamentId=${tournamentId}&eventId=${eventId}&matchId=${matchId}`;

  const liveHref =
    `/user/manage/tournament/event/match/live` +
    `?tournamentId=${tournamentId}&eventId=${eventId}&matchId=${matchId}`;

  const ctaHref = isLive ? liveHref : setupHref;
  const ctaLabel = isLive ? "Score Match" : "Start Scoring";

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden mb-4">
      <div className="bg-orange-500 px-4 py-2 flex items-center justify-between">
        <span className="text-white font-bold text-sm truncate">{tournamentName} - {eventName}</span>
        {isLive && <span className="px-2 py-0.5 bg-white text-orange-500 rounded-full text-[10px] font-black uppercase tracking-wider">Live</span>}
      </div>
      <div className="p-4 space-y-4">
        <div className="text-center text-xs font-bold text-[var(--color-text-secondary)]">{dateStr}</div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col flex-1 items-center">
            <div className="mb-2 flex items-center justify-center">
              <TeamLogo team={match.teamAData || match.teamA} size="md" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text)] text-center leading-tight">{teamAName}</span>
          </div>
          <span className="font-bold text-[var(--color-muted)] px-3 text-lg">VS</span>
          <div className="flex flex-col flex-1 items-center">
            <div className="mb-2 flex items-center justify-center">
              <TeamLogo team={match.teamBData || match.teamB} size="md" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text)] text-center leading-tight">{teamBName}</span>
          </div>
        </div>
        {!isCompleted && (
          <Link
            href={ctaHref}
            className="block w-full py-3 rounded-xl text-center text-sm font-bold text-white transition-transform active:scale-95"
            style={{ background: "var(--gradient-orange)" }}
          >
            {ctaLabel}
          </Link>
        )}
        {isCompleted && (
          <div className="w-full py-3 rounded-xl text-center text-sm font-bold bg-[var(--color-surface-elevated)] text-[var(--color-muted)]">
            Match Completed
          </div>
        )}
      </div>
    </div>
  );
}
