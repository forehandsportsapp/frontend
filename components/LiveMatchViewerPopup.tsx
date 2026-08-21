"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon, CircleIcon } from "@/components/Icons";
import { TeamAvatarStack } from "@/components/Card/LiveMatchCard";

interface LiveMatchViewerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  match: any; // The match object from live feed
}

function getSetStatus(set: any) {
  return String(set?.setStatus ?? set?.set_status ?? "").toLowerCase();
}

function getSetNumber(set: any) {
  return Number(set?.setNumber ?? set?.set_number ?? set?.setInteger ?? set?.set_integer);
}

function getSetTeamAScore(set: any) {
  return Number(set?.teamAScore ?? set?.team_a_score ?? 0);
}

function getSetTeamBScore(set: any) {
  return Number(set?.teamBScore ?? set?.team_b_score ?? 0);
}

function getSetWinnerId(set: any) {
  return set?.winnerId ?? set?.winner_id ?? null;
}

function getTeamId(team: any) {
  return team?.id ?? team?.teamId ?? null;
}

function normalizeSets(sets: any[] = []) {
  return sets
    .filter((set) => Number.isFinite(getSetNumber(set)))
    .sort((a, b) => getSetNumber(a) - getSetNumber(b));
}

function getSetsWon(match: any) {
  const teamAId = getTeamId(match?.teamA);
  const teamBId = getTeamId(match?.teamB);
  return normalizeSets(match?.sets).reduce(
    (score, set) => {
      if (getSetStatus(set) !== "completed") return score;
      const winnerId = getSetWinnerId(set);
      const teamAScore = getSetTeamAScore(set);
      const teamBScore = getSetTeamBScore(set);

      if (winnerId && winnerId === teamAId) score.teamA += 1;
      else if (winnerId && winnerId === teamBId) score.teamB += 1;
      else if (teamAScore > teamBScore) score.teamA += 1;
      else if (teamBScore > teamAScore) score.teamB += 1;

      return score;
    },
    { teamA: 0, teamB: 0 },
  );
}

export default function LiveMatchViewerPopup({
  isOpen,
  onClose,
  match,
}: LiveMatchViewerPopupProps) {
  if (!match) return null;
  const sets = normalizeSets(match.sets);
  const setsWon = getSetsWon(match);
  const currentSet =
    sets.find((set: any) => getSetStatus(set) === "in_progress") ||
    [...sets].sort((a, b) => getSetNumber(b) - getSetNumber(a))[0];
  const currentSetScore = currentSet
    ? `${getSetTeamAScore(currentSet)} - ${getSetTeamBScore(currentSet)}`
    : `${match?.score?.currentSetTeamA ?? 0} - ${match?.score?.currentSetTeamB ?? 0}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[24px] bg-[var(--color-surface)] shadow-2xl border border-[var(--color-border)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 py-4">
              <div className="flex flex-col">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-success)]">
                  <CircleIcon size={8} className="fill-current" />
                  Live Match
                </span>
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {match.matchTitle || "Match Details"}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Main Score Area */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
                {/* Team A */}
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <TeamAvatarStack
                    players={match.teamA?.players || []}
                    images={match.teamA?.images}
                    sizeClass="h-12 w-12 sm:h-14 sm:w-14"
                  />
                  <div className="flex w-full flex-col gap-0.5 text-xs sm:text-sm font-bold">
                    {(match.teamA?.players?.length ? match.teamA.players : ["Team A"]).map((p: string, i: number) => (
                      <span key={i} className="w-full truncate leading-tight">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Current Score */}
                <div className="flex flex-col items-center">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 sm:px-6 sm:py-3 shadow-inner">
                    <span className="whitespace-nowrap font-heading text-3xl sm:text-4xl font-black tracking-tight text-[var(--color-text)]">
                      {setsWon.teamA} - {setsWon.teamB}
                    </span>
                  </div>
                  <span className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Set {match.score?.currentSet || 1}
                  </span>
                  <span className="mt-1 text-[10px] sm:text-xs font-semibold text-[var(--color-text-muted)]">
                    Current set {currentSetScore}
                  </span>
                </div>

                {/* Team B */}
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <TeamAvatarStack
                    players={match.teamB?.players || []}
                    images={match.teamB?.images}
                    sizeClass="h-12 w-12 sm:h-14 sm:w-14"
                  />
                  <div className="flex w-full flex-col gap-0.5 text-xs sm:text-sm font-bold">
                    {(match.teamB?.players?.length ? match.teamB.players : ["Team B"]).map((p: string, i: number) => (
                      <span key={i} className="w-full truncate leading-tight">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Set-wise Score History */}
              {sets.length > 0 && (
                <div className="mt-8 border-t border-[var(--color-border)] pt-6">
                  <h4 className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Set-by-Set Scores
                  </h4>
                  <div className="flex justify-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {sets.map((set: any, index: number) => (
                      <div
                        key={set.id || `${set.setNumber}-${set.setStatus}-${index}`}
                        className={`flex min-w-[70px] flex-col items-center rounded-lg border p-2 ${
                          getSetNumber(set) === match.score?.currentSet
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                        }`}
                      >
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
                          Set {getSetNumber(set)}
                        </span>
                        <div className="mt-1 flex items-center gap-1 font-heading text-lg font-bold">
                          <span
                            className={
                              getSetTeamAScore(set) > getSetTeamBScore(set)
                                ? "text-[var(--color-text)]"
                                : "text-[var(--color-text-muted)]"
                            }
                          >
                            {getSetTeamAScore(set)}
                          </span>
                          <span className="text-[var(--color-text-muted)] opacity-50">
                            -
                          </span>
                          <span
                            className={
                              getSetTeamBScore(set) > getSetTeamAScore(set)
                                ? "text-[var(--color-text)]"
                                : "text-[var(--color-text-muted)]"
                            }
                          >
                            {getSetTeamBScore(set)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
