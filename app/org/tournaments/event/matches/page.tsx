"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  EllipsisIcon,
  CalendarIcon,
  TrophyIcon,
  CheckIcon,
} from "@/components/Icons";
import { toQuery } from "@/lib/utils";
import TeamLogo from "@/components/TeamLogo";
import { eventApi } from "@/lib/api/eventApi";
import { matchApi, type AvailableScorer } from "@/lib/api/matchApi";
import { teamApi } from "@/lib/api/teamApi";
import { TournamentData, EventData } from "@/lib/models";
import { useApp } from "@/components/AppProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

type SetScore = { a: string; b: string };

type MatchRow = {
  id: string;
  status: "upcoming" | "live" | "ended";
  label: string;
  scheduledDate: string;
  scheduledTime: string;
  sideA: any;
  sideB: any;
  setsWonA: number;
  setsWonB: number;
  sets: SetScore[];
  winner?: "a" | "b";
  court?: string;
  scorerId?: string;
  scorerName?: string;
  roundNumber: number;
};

type FilterId = "all" | "upcoming" | "past" | "ongoing";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "ongoing", label: "Ongoing" },
];

function formatDate(value?: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const getTeamName = (t: any) => {
  if (!t) return "Empty Slot";

  const participants = t.participants || [];
  const fallbackName = t.name || t.teamName || t.displayName || t.fullName;

  // If no participants, but we have a name, use it
  if (participants.length === 0) return fallbackName || "Unknown Team";

  if (participants.length === 1) {
    // Singles: User name of the player
    return participants[0].user?.name || fallbackName || "Player";
  }

  // Doubles: Mix of both players initials (e.g., "AB & CD")
  return participants
    .map((p: any) => {
      const name = p.user?.name || "P";
      return name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase();
    })
    .join(" & ");
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SetScoreGrid({ sets }: { sets: SetScore[] }) {
  return (
    <div className="flex border border-[var(--color-border)] rounded-xl overflow-hidden mt-3">
      {sets.map((s, i) => (
        <div
          key={i}
          className={`flex-1 text-center py-2 ${i < sets.length - 1 ? "border-r border-[var(--color-border)]" : ""}`}
        >
          <p className="text-[10px] text-[var(--color-muted)] font-medium mb-1">
            Set {i + 1}
          </p>
          <p className="text-sm font-bold text-[var(--color-text)]">
            {s.a === "--" ? (
              <span className="text-[var(--color-muted)]">--</span>
            ) : (
              <>
                {s.a} - {s.b}
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

function MatchCard({
  match,
  tournamentId,
  eventId,
  onScorerClick,
  viewOnly = false,
}: {
  match: MatchRow;
  tournamentId: string;
  eventId: string;
  onScorerClick?: (match: MatchRow) => void;
  viewOnly?: boolean;
}) {
  const headerBg =
    match.status === "live"
      ? "bg-green-500"
      : match.status === "ended"
        ? "bg-green-600"
        : "bg-green-500";
  const isEnded = match.status === "ended";
  const isLive = match.status === "live";
  const viewMatchHref = isEnded
    ? "/org/tournaments/event/match/result" +
      toQuery({ tournamentId, eventId, matchId: match.id, viewOnly: "1" })
    : "/org/tournaments/event/match/live" +
      toQuery({ tournamentId, eventId, matchId: match.id, viewOnly: "1" });

  const scoreA = String(match.setsWonA).padStart(2, "0");
  const scoreB = String(match.setsWonB).padStart(2, "0");
  const scorerLabel = match.scorerName?.trim() || "Select Scorer";
  const selectedCourt = match.court?.trim();
  const selectedScorer = match.scorerName?.trim();
  const showViewOnlyMeta = Boolean(selectedCourt || selectedScorer);

  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-sm bg-[var(--color-surface)]">
      {/* Green header bar */}
      <div
        className={`${headerBg} px-4 py-2.5 flex items-center justify-center`}
      >
        <span className="text-white font-bold text-sm">{match.label}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Date / Time row */}
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
          <div className="flex items-center gap-1.5">
            <CalendarIcon size={12} />
            <span>{match.scheduledDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>{match.scheduledTime}</span>
          </div>
        </div>

        {/* Players + Score */}
        <div className="flex items-center justify-between gap-2">
          {/* Side A */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-1">
              <TeamLogo team={match.sideA} size="md" />
              {match.status === "live" && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Live
                </span>
              )}
              {match.status === "ended" && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] inline-block" />
                  Ended
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-[var(--color-text)] text-center leading-tight">
              {getTeamName(match.sideA)}
            </span>
          </div>

          {/* Center score */}
          <div className="flex flex-col items-center flex-shrink-0">
            {match.status === "upcoming" ? (
              <span className="text-base font-bold uppercase tracking-widest text-[var(--color-muted)]">
                Pending
              </span>
            ) : (
              <>
                <span className="text-[10px] text-[var(--color-muted)] font-semibold mb-0.5">
                  Sets Won
                </span>
                <span className="text-2xl font-black text-[var(--color-text)] leading-none">
                  {scoreA} - {scoreB}
                </span>
              </>
            )}
          </div>

          {/* Side B */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-1">
              <TeamLogo team={match.sideB} size="md" />
            </div>
            <span className="text-xs font-bold text-[var(--color-text)] text-center leading-tight">
              {getTeamName(match.sideB)}
            </span>
          </div>
        </div>

        {/* Court / Scorer pills */}
        {viewOnly ? (
          showViewOnlyMeta && (
            <div className="flex gap-2 justify-center">
              {selectedCourt && (
                <span className="text-[11px] px-3 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium">
                  {selectedCourt}
                </span>
              )}
              {selectedScorer && (
                <span className="text-[11px] px-3 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium">
                  {selectedScorer}
                </span>
              )}
            </div>
          )
        ) : (
          <div className="flex gap-2 justify-center">
            <span className="text-[11px] px-3 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium">
              {match.court}
            </span>
            <button
              type="button"
              onClick={() => onScorerClick?.(match)}
              className="text-[11px] px-3 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium transition-colors hover:border-orange-400 hover:text-orange-500"
            >
              {scorerLabel}
            </button>
          </div>
        )}

        {/* Set score grid */}
        <SetScoreGrid sets={match.sets} />

        {/* Winner label for ended matches */}
        {match.status === "ended" && match.winner && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <TrophyIcon size={14} className="text-orange-500" />
            <span className="text-sm font-semibold text-[var(--color-text)]">
              {match.winner === "a"
                ? getTeamName(match.sideA)
                : getTeamName(match.sideB)}
            </span>
          </div>
        )}

        {/* CTA for live/upcoming */}
        {!viewOnly && match.status !== "ended" && (
          <Link
            href={
              "/org/tournaments/event/match/setup" +
              toQuery({ tournamentId, eventId, matchId: match.id })
            }
            className="block w-full py-3 rounded-full text-center text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{ background: "var(--gradient-orange)" }}
          >
            {match.status === "live" ? "Manage Match" : "Start Match"}
          </Link>
        )}
        {viewOnly && (
          <>
            {match.status === "upcoming" ? (
              <div className="block w-full py-3 rounded-full text-center text-sm font-bold bg-[var(--color-surface-elevated)] text-[var(--color-muted)]">
                Pending
              </div>
            ) : (
              <Link
                href={viewMatchHref}
                className="block w-full py-3 rounded-full text-center text-sm font-bold text-white transition-all active:scale-[0.98]"
                style={{ background: "var(--gradient-orange)" }}
              >
                {isLive ? "View Live Match" : "View Score"}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrgManageMatchesPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
      <OrgManageMatchesContent />
    </React.Suspense>
  );
}

function OrgManageMatchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganization } = useApp();

  const tournamentId = searchParams.get("tournamentId") || "";
  const eventId = searchParams.get("eventId") || "";
  const requestedViewOnly =
    searchParams.get("viewOnly") === "1" || searchParams.get("mode") === "view";
  const safeBackHref = "/user/tournaments";

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teams, setTeams] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMatchesLoading, setIsMatchesLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [activeRound, setActiveRound] = useState<number>(1);
  const [scorerSheetMatch, setScorerSheetMatch] = useState<MatchRow | null>(
    null,
  );
  const [availableScorers, setAvailableScorers] = useState<AvailableScorer[]>(
    [],
  );
  const [isScorerSheetLoading, setIsScorerSheetLoading] = useState(false);
  const [isAssigningScorer, setIsAssigningScorer] = useState(false);
  const [scorerSheetMessage, setScorerSheetMessage] = useState("");
  const canManage = Boolean(
    (tournament?.organizationId || tournament?.organization?.id) &&
      activeOrganization?.id &&
      activeOrganization.id ===
        (tournament?.organizationId || tournament?.organization?.id),
  );
  const viewOnly = requestedViewOnly || !canManage;
  const canViewWinners = event?.eventState === "completed";

  // 1. Load Tournament, Event and Teams Info
  useEffect(() => {
    if (!eventId || !tournamentId) return;

    const loadCoreData = async () => {
      try {
        setIsLoading(true);
        const [eventResult, teamsData] = await Promise.all([
          eventApi.getEventByIdSafe(eventId, tournamentId),
          viewOnly ? Promise.resolve(null) : teamApi.getTeamsByEvent(eventId),
        ]);

        setTournament((eventResult.tournament as TournamentData) || null);
        setEvent(eventResult.event || null);

        if (eventResult.event?.activeRound) {
          setActiveRound(eventResult.event.activeRound);
        }

        // Create a teams lookup map
        if (Array.isArray(teamsData)) {
          const map: Record<string, any> = {};
          teamsData
            .filter(
              (t: any) =>
                String(t?.eventId || t?.event?.id || "") === eventId,
            )
            .forEach((t) => {
            map[t.id] = t;
          });
          setTeams(map);
        } else {
          setTeams({});
        }
      } catch (error) {
        console.error("Failed to load core data", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCoreData();
  }, [eventId, tournamentId]);

  // 2. Load Matches for the Active Round
  useEffect(() => {
    if (!eventId || !activeRound) return;

    let cancelled = false;
    let firstLoad = true;
    const loadRoundMatches = async () => {
      try {
        setIsMatchesLoading(firstLoad);
        const mData = await matchApi.getMatchesByEventAndRound(
          eventId,
          activeRound,
        );

        if (Array.isArray(mData)) {
          const mapped: MatchRow[] = mData
            .filter((m: any) => String(m?.eventId || m?.event?.id || "") === eventId)
            .map((m: any) => {
            let swA = 0;
            let swB = 0;
            const expectedSets = Number(event?.setsPerMatch || 1);
            const setScores = (m.sets || []).map((s: any) => {
              if (s.setStatus === "completed") {
                if (s.teamAScore > s.teamBScore) swA++;
                else if (s.teamBScore > s.teamAScore) swB++;
              }
              return {
                a:
                  s.setStatus === "not_started"
                    ? "--"
                    : String(s.teamAScore).padStart(2, "0"),
                b:
                  s.setStatus === "not_started"
                    ? "--"
                    : String(s.teamBScore).padStart(2, "0"),
              };
            });

            while (setScores.length < expectedSets) {
              setScores.push({ a: "--", b: "--" });
            }

            let status: "upcoming" | "live" | "ended" = "upcoming";
            if (
              m.matchState === "completed" ||
              m.matchState === "abandoned" ||
              m.matchState === "walkover"
            )
              status = "ended";
            else if (m.matchState === "in_progress") status = "live";

            // Robust team enrichment
            // Check all common property names for team IDs, including if teamA/teamB are direct strings
            const tAId =
              (typeof m.teamA === "string" ? m.teamA : null) ||
              m.teamAId ||
              m.team_a_id ||
              m.team1Id ||
              m.team1_id ||
              m.teamA?.id;
            const tBId =
              (typeof m.teamB === "string" ? m.teamB : null) ||
              m.teamBId ||
              m.team_b_id ||
              m.team2Id ||
              m.team2_id ||
              m.teamB?.id;

            const teamA =
              m.teamAData ||
              (tAId && teams[tAId]) ||
              (typeof m.teamA === "object" ? m.teamA : null);
            const teamB =
              m.teamBData ||
              (tBId && teams[tBId]) ||
              (typeof m.teamB === "object" ? m.teamB : null);
            const scheduledStart = m.startTime || m.scheduledAt;
            const scorerName =
              m.scorerUser?.name || m.scorerName || m.scorer?.name || "";

            return {
              id: m.id,
              status,
              label: `Match ${m.slotIndex || ""}`,
              scheduledDate: scheduledStart ? formatDate(scheduledStart) : "TBA",
              scheduledTime: scheduledStart
                ? new Date(scheduledStart).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "--:--",
              sideA: teamA,
              sideB: teamB,
              setsWonA: swA,
              setsWonB: swB,
              sets: setScores.slice(0, expectedSets),
              winner:
                m.winnerId === teamA?.id
                  ? "a"
                  : m.winnerId === teamB?.id
                  ? "b"
                    : undefined,
              court: m.courtName || "Select Court",
              scorerId: m.scorer || m.scorerUser?.id || undefined,
              scorerName,
              roundNumber: m.roundNumber || activeRound,
            };
            });
          if (!cancelled) setMatches(mapped);
        } else {
          if (!cancelled) setMatches([]);
        }
      } catch (error) {
        console.error("Failed to load round matches", error);
        if (!cancelled) setMatches([]);
      } finally {
        firstLoad = false;
        if (!cancelled) setIsMatchesLoading(false);
      }
    };

    void loadRoundMatches();
    const intervalId = window.setInterval(() => {
      void loadRoundMatches();
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [eventId, activeRound, teams, event?.setsPerMatch]);

  const rounds = useMemo(() => {
    const maxRound = event?.activeRound || 1;
    const list = [];
    for (let i = 1; i <= maxRound; i++) {
      list.push(i);
    }
    return list;
  }, [event?.activeRound]);

  const isRoundOver = useMemo(() => {
    if (matches.length === 0) return false;
    return matches.every((m) => m.status === "ended");
  }, [matches]);

  const handleNextRound = async () => {
    if (!tournamentId || !eventId) return;
    router.push(
      `/org/tournaments/event/fixture${toQuery({
        tournamentId,
        eventId,
      })}`,
    );
  };

  const handleOpenScorerSheet = async (match: MatchRow) => {
    try {
      setScorerSheetMatch(match);
      setAvailableScorers([]);
      setScorerSheetMessage("");
      setIsScorerSheetLoading(true);

      const data = await matchApi.getAvailableScorers(match.id);
      const options = Array.isArray(data.scorers) ? data.scorers : [];

      setAvailableScorers(options);
      setScorerSheetMessage(options.length === 0 ? "No scorers left." : "");
    } catch (error) {
      console.error("Failed to load available scorers", error);
      setAvailableScorers([]);
      setScorerSheetMessage(
        error instanceof Error
          ? error.message
          : "Unable to load scorer options right now.",
      );
    } finally {
      setIsScorerSheetLoading(false);
    }
  };

  const handleAssignScorer = async (scorer: AvailableScorer) => {
    if (!scorerSheetMatch) return;

    try {
      setIsAssigningScorer(true);
      await matchApi.assignScorer(scorerSheetMatch.id, scorer.id);

      setMatches((prev) =>
        prev.map((match) =>
          match.id === scorerSheetMatch.id
            ? {
                ...match,
                scorerId: scorer.id,
                scorerName: scorer.name,
              }
            : match,
        ),
      );

      setScorerSheetMatch(null);
      setAvailableScorers([]);
      setScorerSheetMessage("");
    } catch (error) {
      console.error("Failed to assign scorer", error);
      setScorerSheetMessage(
        error instanceof Error
          ? error.message
          : "Unable to assign scorer right now.",
      );
    } finally {
      setIsAssigningScorer(false);
    }
  };

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "upcoming") return m.status === "upcoming";
      if (activeFilter === "past") return m.status === "ended";
      if (activeFilter === "ongoing") return m.status === "live";
      return true;
    });
  }, [matches, activeFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() =>
            viewOnly
              ? router.push(safeBackHref)
              : router.back()
          }
          className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-elevated)] transition-colors text-[var(--color-text)]"
        >
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold text-base text-[var(--color-text)]">
          {viewOnly ? "Event Overview" : "Manage Matches"}
        </h1>
      </div>

      <div className="flex-1 p-4 space-y-4 pb-24">
        {/* ── Round Over Banner ── */}
        {!viewOnly && isRoundOver && event?.eventState !== "completed" && (
          <div className="bg-green-100 border border-green-200 rounded-2xl p-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-green-800">
              <CheckIcon size={20} className="text-green-600" />
              <span className="font-bold">Round {activeRound} Complete!</span>
            </div>
            <p className="text-sm text-green-700 text-center">
              All matches for this round have finished. You can now set up
              fixtures for the next round.
            </p>
            <button
              onClick={handleNextRound}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all"
            >
              Set Up Round {activeRound + 1}
            </button>
          </div>
        )}

        {/* ── Tournament Info Card ── */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
            <TrophyIcon size={22} className="text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[var(--color-text)] text-sm truncate">
              {tournament?.name || "Loading..."}
            </p>
            <p className="text-xs text-[var(--color-muted)] truncate">
              {tournament?.organization?.name || ""}
            </p>
          </div>
        </div>

        {/* ── Event / Category Card ── */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-base text-[var(--color-text)]">
                {event?.name || "Loading Event..."}
              </h2>
              <p className="text-sm text-[var(--color-muted)] mt-0.5">
                {event?.teamType?.label || "Open"} |{" "}
                {event?.startDate ? formatDate(event.startDate) : "TBA"}
              </p>
            </div>
            {!viewOnly && (
              <button className="text-[var(--color-muted)] p-1">
                <EllipsisIcon size={20} />
              </button>
            )}
          </div>
          <p className="text-xs font-semibold text-orange-500 mt-2">
            Round {activeRound} active
          </p>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-0.5 no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                activeFilter === f.id
                  ? "bg-orange-500 text-white"
                  : "bg-[var(--color-surface-elevated)] text-[var(--color-muted)]"
              }`}
            >
              {f.label}
            </button>
          ))}
          {canViewWinners && (
            <Link
              href={`/org/tournaments/event/champion${toQuery({
                tournamentId,
                eventId,
                viewOnly: "1",
              })}`}
              className="shrink-0 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-1.5 text-sm font-semibold text-[var(--color-primary-contrast)] shadow-sm shadow-orange-200 transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              View Winners
            </Link>
          )}
        </div>

        {/* ── Round Navigator ── */}
        <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-2 no-scrollbar">
          {rounds.map((roundNum, i) => (
            <React.Fragment key={roundNum}>
              <button
                onClick={() => setActiveRound(roundNum)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  activeRound === roundNum
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)]"
                }`}
              >
                Round {roundNum}
              </button>
              {i < rounds.length - 1 && (
                <div className="min-w-[20px] flex-1 border-t-2 border-dashed border-[var(--color-border)]" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Match Cards ── */}
        <div className="space-y-5">
          {isMatchesLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                Fetching matches...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-muted)]">
              No matches found for Round {activeRound}.
            </div>
          ) : (
            filtered.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                tournamentId={tournamentId}
                eventId={eventId}
                onScorerClick={handleOpenScorerSheet}
                viewOnly={viewOnly}
              />
            ))
          )}
        </div>

      </div>
      {!viewOnly && scorerSheetMatch && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text)]">
                  Select Scorer
                </h2>
                <p className="text-sm text-[var(--color-muted)]">
                  {scorerSheetMatch.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isAssigningScorer) return;
                  setScorerSheetMatch(null);
                  setAvailableScorers([]);
                  setScorerSheetMessage("");
                }}
                className="rounded-full px-3 py-1 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-elevated)]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {isScorerSheetLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                    Loading scorers...
                  </p>
                </div>
              ) : (
                <>
                  {scorerSheetMatch.scorerId && (
                    <button
                      type="button"
                      disabled={isAssigningScorer}
                      onClick={async () => {
                        try {
                          setIsAssigningScorer(true);
                          await matchApi.assignScorer(scorerSheetMatch.id, null);
                          setMatches((prev) =>
                            prev.map((match) =>
                              match.id === scorerSheetMatch.id
                                ? { ...match, scorerId: undefined, scorerName: "" }
                                : match
                            )
                          );
                          setScorerSheetMatch(null);
                        } catch (error) {
                          setScorerSheetMessage("Failed to remove scorer.");
                        } finally {
                          setIsAssigningScorer(false);
                        }
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 mb-2"
                    >
                      Remove Current Scorer
                    </button>
                  )}
                  {availableScorers.length > 0 ? (
                    availableScorers.map((scorer) => (
                      <button
                        key={scorer.id}
                    type="button"
                    disabled={isAssigningScorer}
                    onClick={() => void handleAssignScorer(scorer)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:border-orange-400 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                      {scorer.avatarUrl ? (
                        <img
                          src={scorer.avatarUrl}
                          alt={scorer.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                          {scorer.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {scorer.name}
                    </span>
                  </button>
                ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
                      {scorerSheetMessage || "No scorers left."}
                    </div>
                  )}
                </>
              )}

              {!!scorerSheetMessage && availableScorers.length > 0 && (
                <p className="text-sm text-red-500">{scorerSheetMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
