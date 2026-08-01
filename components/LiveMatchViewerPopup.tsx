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

export default function LiveMatchViewerPopup({
  isOpen,
  onClose,
  match,
}: LiveMatchViewerPopupProps) {
  if (!match) return null;

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
                      {String(match.score?.teamA || 0).padStart(2, "0")} -{" "}
                      {String(match.score?.teamB || 0).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Set {match.score?.currentSet || 1}
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
              {match.sets && match.sets.length > 0 && (
                <div className="mt-8 border-t border-[var(--color-border)] pt-6">
                  <h4 className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Set-by-Set Scores
                  </h4>
                  <div className="flex justify-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {match.sets.map((set: any) => (
                      <div
                        key={set.setNumber}
                        className={`flex min-w-[70px] flex-col items-center rounded-lg border p-2 ${
                          set.setNumber === match.score?.currentSet
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                        }`}
                      >
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
                          Set {set.setNumber}
                        </span>
                        <div className="mt-1 flex items-center gap-1 font-heading text-lg font-bold">
                          <span
                            className={
                              set.teamAScore > set.teamBScore
                                ? "text-[var(--color-text)]"
                                : "text-[var(--color-text-muted)]"
                            }
                          >
                            {set.teamAScore}
                          </span>
                          <span className="text-[var(--color-text-muted)] opacity-50">
                            -
                          </span>
                          <span
                            className={
                              set.teamBScore > set.teamAScore
                                ? "text-[var(--color-text)]"
                                : "text-[var(--color-text-muted)]"
                            }
                          >
                            {set.teamBScore}
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
