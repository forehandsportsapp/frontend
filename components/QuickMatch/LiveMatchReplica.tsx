"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  MoreVerticalIcon,
  RotateCcwIcon,
  TimerResetIcon,
  TrophyIcon,
} from "@/components/Icons";

type SetScore = [number | null, number | null];
type PlayerIcon = { name: string; initials: string; avatarUrl?: string | null };

interface LiveMatchReplicaProps {
  title?: string;
  currentSetNumber: number;
  sideAScore: number;
  sideBScore: number;
  setScores: SetScore[];
  bestOf: number;
  scoringLabel: string;
  sideAServing: boolean;
  sideBServing: boolean;
  sideALabel?: string;
  sideBLabel?: string;
  scorerLabel?: string;
  matchTimer?: string;
  sideAActionLabel?: string;
  sideBActionLabel?: string;
  sideAPlayers?: PlayerIcon[];
  sideBPlayers?: PlayerIcon[];
  showScorerCard?: boolean;
  showSwitchServe: boolean;
  showWinnerConfirm: boolean;
  showExitConfirm: boolean;
  showSetTransition?: boolean;
  onBack: () => void;
  onConfirmExit: () => void;
  onCloseExitConfirm: () => void;
  onUndo: () => void;
  onSideARally: () => void;
  onSideBRally: () => void;
  onSideAFault: () => void;
  onSideBFault: () => void;
  onCloseSwitch: () => void;
  onRestoreWinner: () => void;
  onConfirmWinner: () => void;
  winnerName?: string;
  winnerScore?: string;
  showSwitchSides?: boolean;
}

function SetScoreText({ value }: { value: SetScore }) {
  if (value[0] == null || value[1] == null) return <>{"--:--"}</>;
  return (
    <>
      {String(value[0]).padStart(2, "0")} - {String(value[1]).padStart(2, "0")}
    </>
  );
}

function initialsFromLabel(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "--";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function splitPlayerNames(label: string) {
  return label
    .split("/")
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function PlayerPairIcons({
  label,
  players,
}: {
  label: string;
  players?: PlayerIcon[];
}) {
  const names = splitPlayerNames(label);
  const p0 = players?.[0];
  const p1 = players?.[1];
  const first = p0?.name || names[0] || label;
  const second = p1?.name || names[1];
  const firstInitials = p0?.initials || initialsFromLabel(first);
  const secondInitials = second
    ? p1?.initials || initialsFromLabel(second)
    : null;

  return (
    <div className="mx-auto mb-1.5 flex h-12 w-[74px] items-center justify-center">
      <div className="relative h-12 w-[74px]">
        <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-surface-elevated text-[20px] font-semibold">
          {p0?.avatarUrl ? (
            <img
              src={p0.avatarUrl}
              alt={first}
              className="h-full w-full object-cover"
            />
          ) : (
            firstInitials
          )}
        </div>
        {secondInitials ? (
          <div className="absolute right-0 top-0 z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-surface text-[20px] font-semibold opacity-100">
            {p1?.avatarUrl ? (
              <img
                src={p1.avatarUrl}
                alt={second}
                className="h-full w-full object-cover"
              />
            ) : (
              secondInitials
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function LiveMatchReplica({
  title = "Live Match",
  currentSetNumber,
  sideAScore,
  sideBScore,
  setScores,
  bestOf,
  scoringLabel,
  sideAServing,
  sideBServing,
  sideALabel = "Kunal Verma",
  sideBLabel = "Anil Kumar",
  scorerLabel = sideALabel,
  matchTimer = "00:00:00",
  sideAActionLabel = sideALabel,
  sideBActionLabel = sideBLabel,
  sideAPlayers = [],
  sideBPlayers = [],
  showScorerCard = true,
  showSwitchServe,
  showWinnerConfirm,
  showExitConfirm,
  showSetTransition = false,
  onBack,
  onConfirmExit,
  onCloseExitConfirm,
  onUndo,
  onSideARally,
  onSideBRally,
  onSideAFault,
  onSideBFault,
  onCloseSwitch,
  onRestoreWinner,
  onConfirmWinner,
  winnerName = "Kunal Verma",
  winnerScore = "",
  showSwitchSides = false,
}: LiveMatchReplicaProps) {
  const visibleSetScores: SetScore[] = Array.from({ length: bestOf }).map(
    (_, index) => {
      const score = setScores[index];
      return score ? score : [null, null];
    },
  );

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto w-full max-w-[390px] px-4 pb-6 pt-4">
        <header className="mb-4 flex items-center justify-between">
          <button type="button" onClick={onBack} className="h-9 w-9 text-text">
            <ArrowLeftIcon size={20} />
          </button>
          <h1 className="text-[22px] font-semibold leading-none">{title}</h1>
          <button type="button" className="h-9 w-9 text-text">
            <MoreVerticalIcon size={18} />
          </button>
        </header>

        {/* Match Overview */}
        <section className="mb-4 rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Match Overview</h2>
            <button
              type="button"
              onClick={onUndo}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary active:scale-95 transition-transform"
            >
              <RotateCcwIcon size={14} strokeWidth={2.5} /> Undo
            </button>
          </div>

          <div
            className={`grid gap-4 ${showScorerCard ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {showScorerCard && (
              <div className="rounded-2xl border border-border bg-surface-elevated p-1.5">
                <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border">
                  <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
                    Change Scorer
                  </span>
                  <ChevronDownIcon size={12} className="text-muted" />
                </div>
                <p className="py-1 text-center text-sm font-bold">
                  {scorerLabel}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-surface-elevated p-1.5">
              <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
                  Match Timer
                </span>
                <TimerResetIcon size={12} className="text-muted" />
              </div>
              <p className="py-1 text-center text-sm font-bold tabular-nums">
                {matchTimer}
              </p>
            </div>
          </div>
        </section>

        {/* Scoreboard */}
        <section className="mb-4 rounded-card border border-border bg-surface p-3">
          <h3 className="mb-2.5 text-center text-[24px] font-semibold leading-none">
            Current Set: {String(currentSetNumber).padStart(2, "0")}
          </h3>

          <div className="rounded-[10px] border border-border p-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              <div>
                <PlayerPairIcons label={sideALabel} players={sideAPlayers} />
                <p className="text-[12px] font-semibold">{sideALabel}</p>
                <span
                  className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[8px] ${sideAServing ? "border-[#FF9E63] text-primary" : "border-border text-muted"}`}
                >
                  {sideAServing ? "Serving" : "Receiving"}
                </span>
              </div>

              <div className="text-[28px] font-semibold text-muted">Vs</div>

              <div>
                <PlayerPairIcons label={sideBLabel} players={sideBPlayers} />
                <p className="text-[12px] font-semibold">{sideBLabel}</p>
                <span
                  className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[8px] ${sideBServing ? "border-[#FF9E63] text-primary" : "border-border text-muted"}`}
                >
                  {sideBServing ? "Serving" : "Receiving"}
                </span>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-2 w-fit rounded-full border border-border px-2 py-0.5 text-[8px]">
            {scoringLabel}
          </div>

          <div className="mt-2 overflow-x-auto">
            <div className="flex min-w-full overflow-hidden rounded-[9px] border border-border">
              {visibleSetScores.map((setScore, index) => (
                <div
                  key={index}
                  className={`min-w-[92px] flex-1 p-1.5 text-center ${index < visibleSetScores.length - 1 ? "border-r border-border" : ""}`}
                >
                  <p className="text-[10px]">Set {index + 1}</p>
                  <p
                    className={`text-[14px] font-semibold ${setScore[0] == null ? "text-muted" : ""}`}
                  >
                    <SetScoreText value={setScore} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onSideARally}
            className="h-10 rounded-[10px] bg-primary text-[13px] font-semibold text-primary-contrast"
          >
            {sideAActionLabel} Won Rally
          </button>
          <button
            type="button"
            onClick={onSideBRally}
            className="h-10 rounded-[10px] bg-primary text-[13px] font-semibold text-primary-contrast"
          >
            {sideBActionLabel} Scored
          </button>
          <button
            type="button"
            onClick={onSideAFault}
            className="surface-row h-10 rounded-[10px] text-[13px] font-semibold"
          >
            {sideAActionLabel} Fault
          </button>
          <button
            type="button"
            onClick={onSideBFault}
            className="surface-row h-10 rounded-[10px] text-[13px] font-semibold"
          >
            {sideBActionLabel} Fault
          </button>
        </section>

        <p className="mt-2 text-center text-[13px] text-muted">
          Set 1: {String(sideAScore).padStart(2, "0")} -{" "}
          {String(sideBScore).padStart(2, "0")}
        </p>
      </div>

      {/* Switch Serve Dialog */}
      {showSwitchServe && (
        <div
          className="fixed inset-0 z-[280] bg-black/40 backdrop-blur-[4px] flex items-center justify-center p-6"
          onClick={onCloseSwitch}
        >
          <div
            className="bg-surface w-full max-w-[340px] rounded-[28px] border border-border p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-elevated">
              <TimerResetIcon
                size={28}
                className="text-primary"
                strokeWidth={2.5}
              />
            </div>
            <h3 className="text-2xl font-bold leading-tight tracking-tight">
              Switch Serve Now
            </h3>
            <p className="mx-auto mt-2 mb-8 text-sm text-muted leading-relaxed px-4">
              It&apos;s time for the players to switch serve on the court.
            </p>
            <button
              type="button"
              onClick={onCloseSwitch}
              className="h-14 w-full rounded-[20px] font-bold text-white text-base transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
              style={{ background: "linear-gradient(135deg,#ff8c00,#f97316)" }}
            >
              Switch Sides
            </button>
          </div>
        </div>
      )}

      {/* Switch Sides Dialog (Set End) */}
      {showSwitchSides && (
        <div
          className="fixed inset-0 z-[282] bg-black/40 backdrop-blur-[4px] flex items-center justify-center p-6"
          onClick={onCloseSwitch}
        >
          <div
            className="bg-surface w-full max-w-[340px] rounded-[28px] border border-border p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-elevated">
              <TimerResetIcon
                size={28}
                className="text-primary"
                strokeWidth={2.5}
              />
            </div>
            <h3 className="text-2xl font-bold leading-tight tracking-tight">
              Switch Sides Now
            </h3>
            <p className="mx-auto mt-2 mb-8 text-sm text-muted leading-relaxed px-4">
              The set has ended. Players must switch sides of the court.
            </p>
            <button
              type="button"
              onClick={onCloseSwitch}
              className="h-14 w-full rounded-[20px] font-bold text-white text-base transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
              style={{ background: "linear-gradient(135deg,#ff8c00,#f97316)" }}
            >
              Switch Sides
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirm Dialog */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-[285] bg-black/40 backdrop-blur-[4px] flex items-center justify-center p-6"
          onClick={onCloseExitConfirm}
        >
          <div
            className="bg-surface w-full max-w-[340px] rounded-[28px] border border-border p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold leading-tight tracking-tight">
              Leave Match?
            </h3>
            <div className="mt-2 mb-8 flex items-start gap-2 rounded-2xl bg-surface-elevated p-4 text-left">
              <TimerResetIcon
                size={18}
                className="shrink-0 text-primary mt-0.5"
              />
              <p className="text-sm text-muted leading-relaxed">
                Are you sure? The match will not be saved and you will return to
                match setup.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onCloseExitConfirm}
                className="h-12 rounded-[16px] border border-border bg-surface-elevated text-sm font-bold"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={onConfirmExit}
                className="h-12 rounded-[16px] bg-primary text-white text-sm font-bold"
              >
                Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Winner Confirm Dialog */}
      {showWinnerConfirm && (
        <div className="fixed inset-0 z-[290] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[320px] rounded-[24px] bg-[var(--color-surface)] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex items-center justify-center text-[#F7B31B]">
              <TrophyIcon size={48} strokeWidth={1.5} />
            </div>
            <p className="text-[16px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
              Winner
            </p>
            <p className="mt-1 text-[26px] font-extrabold leading-tight text-[var(--color-text)]">
              {winnerName}
            </p>
            {winnerScore ? (
              <p className="mt-2 text-[14px] font-medium text-[var(--color-text-secondary)]">
                Final Score: {winnerScore}
              </p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onRestoreWinner}
                className="flex-1 h-12 rounded-full border border-[var(--color-border)] text-[14px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] active:scale-[0.98] transition-all"
              >
                Undo Point
              </button>
              <button
                type="button"
                onClick={onConfirmWinner}
                className="flex-1 h-12 rounded-full bg-primary text-[14px] font-bold text-white shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Transition / Intermediate Popup */}
      {showSetTransition && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/40 backdrop-blur-md">
          <span className="text-[140px] font-black text-primary drop-shadow-2xl">
            {currentSetNumber}
          </span>
        </div>
      )}
    </div>
  );
}
