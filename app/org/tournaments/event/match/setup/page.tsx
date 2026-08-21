"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { animate, motion, useMotionValue } from "framer-motion";
import Layout from "@/components/Layout";
import { setItem } from "@/lib/storage";
import type { MatchConfigData } from "@/lib/models";
import MatchReadyPopup from "@/components/QuickMatch/MatchReadyPopup";
import { toQuery } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/Icons";
import { matchApi } from "@/lib/api/matchApi";
import { eventApi } from "@/lib/api/eventApi";

type SidePlayer = { name: string; initials: string; avatarUrl?: string | null };

type MatchSetupDraft = {
  config: MatchConfigData;
  side0: SidePlayer[];
  side1: SidePlayer[];
};

const POINTS_OPTIONS = [7, 11, 15, 21] as const;
const BEST_OF_OPTIONS = [1, 3, 5] as const;

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "P";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function getTeamPlayers(team: any): SidePlayer[] {
  const participants = Array.isArray(team?.participants)
    ? team.participants
    : [];
  if (!participants.length) {
    const fallbackName = team?.name || "Player";
    return [
      {
        name: fallbackName,
        initials: initialsFromName(fallbackName),
        avatarUrl: null,
      },
    ];
  }
  return participants.map((p: any) => {
    const name = p?.user?.name || p?.name || "Player";
    return {
      name,
      initials: initialsFromName(name),
      avatarUrl: p?.user?.profilePicUrl || null,
    };
  });
}

// ─── Court Layout ─────────────────────────────────────────────────────────────
function CourtLayout({
  side0,
  side1,
  isDoubles,
}: {
  side0: SidePlayer[];
  side1: SidePlayer[];
  isDoubles: boolean;
}) {
  return (
    <div className="relative w-full h-40 rounded-xl overflow-hidden select-none">
      {/* Court background */}
      <div className="absolute inset-0 bg-green-600" />
      {/* Center net line */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-px w-0.5 bg-white/60" />
      {/* Center circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white/60 bg-green-600" />
      {/* Horizontal mid lines */}
      <div className="absolute top-1/2 -translate-y-px left-0 right-0 h-px bg-white/30" />
      {/* Court boundary */}
      <div className="absolute inset-2 border border-white/50 rounded" />

      {/* Side A players – left half */}
      {isDoubles ? (
        <>
          <div className="absolute top-3 left-3">
            <PlayerPin player={side0[0]} />
          </div>
          <div className="absolute bottom-3 left-[20%]">
            <PlayerPin player={side0[1]} />
          </div>
        </>
      ) : (
        <div className="absolute top-1/2 left-[22%] -translate-y-1/2">
          <PlayerPin player={side0[0]} />
        </div>
      )}

      {/* Side B players – right half */}
      {isDoubles ? (
        <>
          <div className="absolute top-3 right-[20%]">
            <PlayerPin player={side1[0]} />
          </div>
          <div className="absolute bottom-3 right-3">
            <PlayerPin player={side1[1]} />
          </div>
        </>
      ) : (
        <div className="absolute top-1/2 right-[22%] -translate-y-1/2">
          <PlayerPin player={side1[0]} />
        </div>
      )}
    </div>
  );
}

function PlayerPin({ player }: { player: SidePlayer }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md overflow-hidden">
        {player.avatarUrl ? (
          <img
            src={player.avatarUrl}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        ) : (
          player.initials
        )}
      </div>
      <span className="text-[9px] font-semibold text-white bg-black/40 px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-[60px] truncate text-center">
        {player.name.split(" ")[0]}
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrgMatchSetupPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchParams, setSearchParams] = useState<URLSearchParams>(
    new URLSearchParams(),
  );

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const tournamentId = searchParams.get("tournamentId");
  const eventId = searchParams.get("eventId");
  const matchId = searchParams.get("matchId");
  const liveMatchPath = pathname.startsWith("/user/manage/")
    ? "/user/manage/tournament/event/match/live"
    : "/org/tournaments/event/match/live";

  const [isReadyPopupOpen, setIsReadyPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isEventLocked = true;
  const [isStarting, setIsStarting] = useState(false);

  const defaultDraft: MatchSetupDraft = useMemo(
    () => ({
      config: {
        scoringSystem: "rally",
        format: "doubles",
        bestOf: 3,
        pointsToWin: 11,
        winByTwo: true,
        initialServer: 1,
        warmupMinutes: 0,
        timeoutPerSet: 1,
        switchSidesEvery: -1,
      },
      side0: [
        { name: "Player 1", initials: "P1" },
        { name: "Player 2", initials: "P2" },
      ],
      side1: [
        { name: "Player 3", initials: "P3" },
        { name: "Player 4", initials: "P4" },
      ],
    }),
    [],
  );

  const [draft, setDraft] = useState<MatchSetupDraft>(defaultDraft);

  useEffect(() => {
    if (!tournamentId || !eventId || !matchId) {
      if (searchParams.size > 0) {
        setIsLoading(false);
      }
      return;
    }
    let cancelled = false;

    const loadMatchSetup = async () => {
      try {
        setIsLoading(true);
        const [matchInfo, eventResult] = await Promise.all([
          matchApi.getMatchInfo(matchId),
          eventApi.getEventByIdSafe(eventId, tournamentId),
        ]);

        const event = eventResult.event || null;
        const bestOf = Number(
          event?.setsPerMatch || matchInfo?.sets?.length || 1,
        );
        const normalizedBestOf =
          bestOf === 1 || bestOf === 3 || bestOf === 5 ? bestOf : 1;

        const side0FromMatch = getTeamPlayers(
          matchInfo?.teamAData || matchInfo?.teamA,
        );
        const side1FromMatch = getTeamPlayers(
          matchInfo?.teamBData || matchInfo?.teamB,
        );
        const inferredDoubles =
          side0FromMatch.length > 1 || side1FromMatch.length > 1;
        const format: MatchConfigData["format"] = inferredDoubles
          ? "doubles"
          : "singles";

        const side0 =
          format === "doubles"
            ? side0FromMatch.slice(0, 2)
            : side0FromMatch.slice(0, 1);
        const side1 =
          format === "doubles"
            ? side1FromMatch.slice(0, 2)
            : side1FromMatch.slice(0, 1);
        if (format === "doubles" && side0.length < 2) {
          side0.push({ name: "Player 2", initials: "P2" });
        }
        if (format === "doubles" && side1.length < 2) {
          side1.push({ name: "Player 2", initials: "P2" });
        }

        if (!cancelled) {
          setDraft({
            config: {
              scoringSystem: "rally",
              format,
              bestOf: normalizedBestOf,
              pointsToWin: Number(event?.pointsPerSet || 11),
              winByTwo: true,
              initialServer: 1,
              warmupMinutes: 0,
              timeoutPerSet: 1,
              switchSidesEvery: -1,
            },
            side0,
            side1,
          });
        }
      } catch (error) {
        console.error("Failed to load match setup data", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadMatchSetup();
    return () => {
      cancelled = true;
    };
  }, [tournamentId, eventId, matchId]);

  // Swipe slider
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [maxDrag, setMaxDrag] = useState(200);

  // THUMB constants (must match the style below exactly)
  const THUMB_W = 70; // px — width of the white pill
  const LEFT_PAD = 12; // px — left inset
  const RIGHT_PAD = 6; // px — keep a small gap before track end

  useEffect(() => {
    const update = () => {
      const track = trackRef.current;
      if (!track) return;
      // trackWidth - thumbWidth - leftPad - rightPad
      setMaxDrag(
        Math.max(0, track.clientWidth - THUMB_W - LEFT_PAD - RIGHT_PAD),
      );
      x.set(0);
    };
    update();
    const observer = new ResizeObserver(update);
    if (trackRef.current) observer.observe(trackRef.current);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [THUMB_W, LEFT_PAD, RIGHT_PAD, x]);

  const handleSwipeEnd = () => {
    if (isStarting || maxDrag <= 0) {
      animate(x, 0, { type: "spring", stiffness: 360, damping: 26 });
      return;
    }
    const cur = x.get();
    // Fire when user drags past 80% of the available track
    if (cur >= maxDrag * 0.8) {
      animate(x, maxDrag, {
        type: "spring",
        stiffness: 500,
        damping: 30,
      });
      window.setTimeout(() => {
        startMatch();
      }, 200);
      return;
    }
    // Snap back
    animate(x, 0, { type: "spring", stiffness: 360, damping: 26 });
  };

  const save = () => {
    setItem(`match:${matchId}:config`, draft.config);
    setItem(`match:${matchId}:players`, {
      side0: draft.side0,
      side1: draft.side1,
    });
  };

  const startMatch = () => {
    if (isStarting || !matchId) return;
    setIsStarting(true);
    save();
    void matchApi.startMatch(matchId).catch((error) => {
      console.error("Failed to start match via pipeline", error);
      // Fallback to simple state update if /start is not ready
      void matchApi.updateMatchState(matchId, "in_progress").catch((err) => {
        console.error("Fallback start match failed", err);
      });
    });
    router.replace(
      liveMatchPath +
        toQuery({ tournamentId, eventId, matchId }),
    );
  };

  const setConfig = (next: Partial<MatchConfigData>) =>
    setDraft((d) => ({ ...d, config: { ...d.config, ...next } }));

  const updatePlayer = (side: 0 | 1, index: number, name: string) => {
    setDraft((d) => {
      const nextSide = (side === 0 ? d.side0 : d.side1).map((p, i) =>
        i === index ? { ...p, name, initials: initialsFromName(name) } : p,
      );
      return side === 0 ? { ...d, side0: nextSide } : { ...d, side1: nextSide };
    });
  };

  const isDoubles = draft.config.format === "doubles";

  if (isLoading) {
    return (
      <Layout
        title="Match Setup"
        showBack
        showBottomNav={false}
        onBack={() => router.back()}
      >
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Match Setup"
      showBack
      showBottomNav={false}
      onBack={() => router.back()}
    >
      <div className="p-4 space-y-4 pb-32">
        {/* ── Court Layout ── */}
        <div>
          <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-2">
            Select Player Sides
          </p>
          <CourtLayout
            side0={draft.side0}
            side1={draft.side1}
            isDoubles={isDoubles}
          />
          <p className="text-[10px] text-[var(--color-muted)] mt-2 flex items-center justify-center gap-1">
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            Side may switch during the match per rules.
          </p>
        </div>

        {/* ── Initial Server ── */}
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)] mb-2">
            Who'll serve first?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((v) => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="server"
                  checked={draft.config.initialServer === v}
                  onChange={() => setConfig({ initialServer: v as 1 | 2 })}
                  disabled={isEventLocked}
                  className="accent-primary"
                />
                <span className="text-sm text-[var(--color-text)]">
                  {v === 1
                    ? isDoubles
                      ? "Pair A"
                      : "Player 1"
                    : isDoubles
                      ? "Pair B"
                      : "Player 2"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Scoring System ── */}
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)] mb-2">
            Scoring System
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["sideout", "rally"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  !isEventLocked && setConfig({ scoringSystem: s })
                }
                disabled={isEventLocked}
                className={`min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${
                  draft.config.scoringSystem === s
                    ? "bg-primary text-white border-primary"
                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-muted)]"
                }`}
              >
                {s === "sideout" ? "Side-out Scoring" : "Rally Scoring"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Match Format ── */}
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)] mb-2">
            Match Format
          </p>
          <div className="space-y-2">
            <div className="relative">
              <select
                value={draft.config.bestOf}
                onChange={(e) => setConfig({ bestOf: Number(e.target.value) })}
                disabled={isEventLocked}
                className="w-full appearance-none py-3 px-4 pr-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)]"
              >
                {BEST_OF_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    Best of {n}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none"
              />
            </div>
            <div className="relative">
              <select
                value={draft.config.pointsToWin}
                onChange={(e) =>
                  setConfig({ pointsToWin: Number(e.target.value) })
                }
                disabled={isEventLocked}
                className="w-full appearance-none py-3 px-4 pr-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)]"
              >
                {POINTS_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} points to win
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* ── Time out Rules ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-[var(--color-text)]">
              Time out Rules
            </p>
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              className="text-[var(--color-text)]"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden divide-y divide-[var(--color-border)]">
            {[
              {
                label: "1 Timeout per set",
                key: "timeoutPerSet",
                getChecked: () => draft.config.timeoutPerSet === 1,
              },
              {
                label: "Win by 2 points",
                key: "winByTwo",
                getChecked: () => !!draft.config.winByTwo,
              },
            ].map((opt) => {
              const checked = opt.getChecked();
              return (
                <label
                  key={opt.key}
                  className="flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors hover:bg-[var(--color-surface-elevated)]"
                >
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {opt.label}
                  </span>
                  {/* Custom checkbox */}
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                      checked
                        ? "bg-orange-500 border-orange-500"
                        : "bg-transparent border-[var(--color-border)]"
                    }`}
                  >
                    {checked && (
                      <svg
                        width={11}
                        height={11}
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="white"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={isEventLocked}
                    onChange={(e) => {
                      if (opt.key === "winByTwo")
                        setConfig({ winByTwo: e.target.checked });
                      else
                        setConfig({ timeoutPerSet: e.target.checked ? 1 : 0 });
                    }}
                  />
                </label>
              );
            })}
          </div>


        </div>

        {/* ── Serve Rotation ── */}
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)] mb-2">
            Serve Rotation
          </p>
          <div className="relative">
            <select
              value={draft.config.switchSidesEvery}
              onChange={(e) =>
                setConfig({ switchSidesEvery: Number(e.target.value) })
              }
              disabled={isEventLocked}
              className="w-full appearance-none py-3 px-4 pr-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)]"
            >
              <option value={0}>No side switching</option>
              <option value={-1}>Switch side every set</option>
              <option value={6}>Switch sides at 6 points (Set 1 to 1)</option>
              <option value={8}>Switch sides at 8 points (Set 1 to N)</option>
            </select>
            <ChevronDownIcon
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* ── Swipe to Start Match – capsule ── */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[var(--color-background)] via-[var(--color-background)] to-transparent flex justify-center">
        <div
          ref={trackRef}
          className="relative flex h-14 w-full max-w-[340px] select-none items-center overflow-hidden rounded-full shadow-xl"
          style={{
            background: "linear-gradient(135deg,#ff8c00,#f97316)",
            boxShadow: "none",
          }}
        >
          {/* Centered label — sits behind thumb via z-index */}
          <span className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-[14px] font-bold tracking-wide text-white">
            Swipe to start match
          </span>

          {/* White pill thumb — fixed size, positioned with left inset */}
          <motion.button
            drag="x"
            dragConstraints={{ left: 0, right: maxDrag }}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => {
              if (!isStarting) {
                setIsReadyPopupOpen(false);
              }
            }}
            style={{
              x,
              position: "absolute",
              left: `${LEFT_PAD}px`,
              height: "40px", // Slightly smaller vertically
              width: `${THUMB_W}px`,
              minWidth: `${THUMB_W}px`,
              flexShrink: 0,
            }}
            onDragEnd={handleSwipeEnd}
            type="button"
            aria-label="Swipe to start match"
            className="z-10 touch-none cursor-grab flex items-center justify-center rounded-full bg-white shadow-md active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-80"
            disabled={isStarting}
          >
            {/* Orange arrow icon */}
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f97316"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </div>

      <MatchReadyPopup
        isOpen={isReadyPopupOpen}
        variant="confirm"
        onClose={() => setIsReadyPopupOpen(false)}
        onPrimaryAction={startMatch}
        confirmTitle="Begin Official Match?"
        confirmDescription="This match is part of an official organization tournament. Results will be recorded to the event standings."
      />
    </Layout>
  );
}
