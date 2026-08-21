"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  MapPinIcon,
  MoreVerticalIcon,
  PhoneIcon,
  TimerIcon,
  UserIcon,
} from "@/components/Icons";
import { matchApi } from "@/lib/api/matchApi";
import { getItem } from "@/lib/storage";
import { toQuery } from "@/lib/utils";
import type { LiveMatchStateData, MatchConfigData } from "@/lib/models";

type SidePlayer = {
  name: string;
  initials: string;
  avatarUrl?: string | null;
};

type SetCell = {
  label: string;
  value: string;
  isActive: boolean;
};

function getMatchSetRows(match: any) {
  return Array.isArray(match?.setRows)
    ? match.setRows
    : Array.isArray(match?.sets)
      ? match.sets
      : [];
}

function getSetNumber(set: any) {
  return Number(
    set?.setNumber ?? set?.set_number ?? set?.setInteger ?? set?.set_integer,
  );
}

function getSetStatus(set: any) {
  return String(set?.setStatus ?? set?.set_status ?? "").toLowerCase();
}

function getSetTeamAScore(set: any) {
  return Number(set?.teamAScore ?? set?.team_a_score ?? 0);
}

function getSetTeamBScore(set: any) {
  return Number(set?.teamBScore ?? set?.team_b_score ?? 0);
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "P";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

function getProfilePicUrl(participant: any) {
  const user = participant?.user || participant?.profile || participant;
  return (
    user?.profilePicUrl ||
    user?.profile_pic_url ||
    user?.avatarUrl ||
    user?.avatar_url ||
    user?.imageUrl ||
    null
  );
}

function getTeamPlayers(team: any, fallback: string): SidePlayer[] {
  const participants = Array.isArray(team?.participants) ? team.participants : [];
  if (!participants.length) {
    const name = team?.name || team?.teamName || team?.displayName || fallback;
    return [
      {
        name,
        initials: initialsFromName(name),
        avatarUrl: null,
      },
    ];
  }

  return participants.map((participant: any) => {
    const name =
      participant?.user?.name ||
      participant?.name ||
      participant?.profile?.name ||
      fallback;
    return {
      name,
      initials: initialsFromName(name),
      avatarUrl: getProfilePicUrl(participant),
    };
  });
}

function getTeamName(team: any, fallback: string) {
  const players = getTeamPlayers(team, fallback).map((player) => player.name);
  return players.length > 1 ? players.join(" / ") : players[0] || fallback;
}

function formatElapsed(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function secondsSince(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
}

function getStoredConfig(matchId: string | null): MatchConfigData | null {
  return matchId ? getItem<MatchConfigData>(`match:${matchId}:config`) : null;
}

function getStoredState(matchId: string | null): LiveMatchStateData | null {
  return matchId ? getItem<LiveMatchStateData>(`match:${matchId}:state`) : null;
}

function buildVenue(matchInfo: any) {
  const tournament = matchInfo?.event?.tournament || matchInfo?.tournament || {};
  const venue = [
    tournament?.venueName,
    tournament?.venueAddress,
    tournament?.venueCity,
    tournament?.venueState,
  ]
    .filter(Boolean)
    .join(", ");
  return [venue, matchInfo?.courtName].filter(Boolean).join(" - ") || "Venue TBA";
}

function PlayerAvatar({ player }: { player: SidePlayer }) {
  return (
    <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xl font-black text-[var(--color-text)] shadow-sm">
      {player.avatarUrl ? (
        <img
          src={player.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        player.initials
      )}
    </div>
  );
}

function PlayerSide({
  players,
  label,
  isServing,
}: {
  players: SidePlayer[];
  label: string;
  isServing: boolean;
}) {
  const primaryPlayer = players[0] || {
    name: label,
    initials: initialsFromName(label),
    avatarUrl: null,
  };

  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <PlayerAvatar player={primaryPlayer} />
      <p className="mt-2 w-full truncate text-[11px] font-medium text-[var(--color-text)]">
        {label}
      </p>
      <span
        className={`mt-1 rounded-full border px-2.5 py-0.5 text-[9px] font-semibold ${
          isServing
            ? "border-orange-300 bg-orange-50 text-orange-600"
            : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-muted)]"
        }`}
      >
        {isServing ? "Serving" : "Receiving"}
      </span>
    </div>
  );
}

function SetScoreboard({ sets }: { sets: SetCell[] }) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${sets.length}, minmax(76px, 1fr))`,
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        style={gridStyle}
      >
        {sets.map((set, index) => (
          <div
            key={set.label}
            className={`min-w-[76px] text-center ${
              index < sets.length - 1 ? "border-r border-[var(--color-border)]" : ""
            } ${set.isActive ? "bg-orange-50 dark:bg-orange-500/10" : ""}`}
          >
            <div
              className={`border-b border-[var(--color-border)] py-1 text-[10px] font-semibold ${
                set.isActive ? "text-orange-600" : "text-[var(--color-text-secondary)]"
              }`}
            >
              {set.label}
            </div>
            <div className="py-1.5 text-sm font-black text-[var(--color-text)]">
              {set.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-xs leading-5 text-[var(--color-text)]">
      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--color-text)]" />
      <span className="min-w-0">
        <span className="font-black">{label}: </span>
        {icon && <span className="mr-1 inline-flex align-[-2px]">{icon}</span>}
        <span>{value}</span>
      </span>
    </div>
  );
}

function UserTournamentLiveMatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournamentId");
  const eventId = searchParams.get("eventId");
  const matchId = searchParams.get("matchId");

  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!matchId) {
      setIsLoading(false);
      setLoadError("Match not found.");
      return;
    }

    const currentMatchId = matchId;
    let cancelled = false;
    async function loadMatch() {
      try {
        setIsLoading(true);
        const info = await matchApi.getMatchInfo(currentMatchId);
        if (cancelled) return;
        setMatchInfo(info);
        setLoadError("");
        setElapsedSeconds(secondsSince(info?.startTime || info?.startedAt));
      } catch (error) {
        console.error("Failed to load live match", error);
        if (!cancelled) setLoadError("Unable to load this live match right now.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadMatch();
    const refreshId = window.setInterval(() => {
      void loadMatch();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshId);
    };
  }, [matchId]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const storedConfig = useMemo(() => getStoredConfig(matchId), [matchId, matchInfo]);
  const storedState = useMemo(() => getStoredState(matchId), [matchId, matchInfo]);
  const teamA = matchInfo?.teamAData || matchInfo?.teamA;
  const teamB = matchInfo?.teamBData || matchInfo?.teamB;
  const sideAPlayers = useMemo(() => getTeamPlayers(teamA, "Player 1"), [teamA]);
  const sideBPlayers = useMemo(() => getTeamPlayers(teamB, "Player 2"), [teamB]);
  const sideALabel = getTeamName(teamA, "Player 1");
  const sideBLabel = getTeamName(teamB, "Player 2");
  const sets = useMemo(
    () =>
      getMatchSetRows(matchInfo)
        .filter((set: any) => Number.isFinite(getSetNumber(set)))
        .sort((a: any, b: any) => getSetNumber(a) - getSetNumber(b)),
    [matchInfo],
  );
  const bestOf = Math.max(
    1,
    Number(
      storedConfig?.bestOf ||
        matchInfo?.setsPerMatch ||
        matchInfo?.event?.setsPerMatch ||
        sets.length ||
        3,
    ),
  );
  const activeSetNumber =
    (storedState?.currentSet ?? -1) >= 0
      ? Math.min((storedState?.currentSet ?? 0) + 1, bestOf)
      : getSetNumber(
          sets.find((set: any) => getSetStatus(set) === "in_progress") ||
            [...sets]
              .filter(
                (set: any) =>
                  getSetStatus(set) !== "not_started" ||
                  getSetTeamAScore(set) > 0 ||
                  getSetTeamBScore(set) > 0,
              )
              .sort((a: any, b: any) => getSetNumber(b) - getSetNumber(a))[0],
        ) || 1;
  const currentScore = storedState?.setScores?.[activeSetNumber - 1] || [
    getSetTeamAScore(sets.find((set: any) => getSetNumber(set) === activeSetNumber)),
    getSetTeamBScore(sets.find((set: any) => getSetNumber(set) === activeSetNumber)),
  ];
  const setCells: SetCell[] = Array.from({ length: bestOf }).map((_, index) => {
    const setNumber = index + 1;
    const storedScore = storedState?.setScores?.[index];
    const set = sets.find((row: any) => getSetNumber(row) === setNumber);
    const teamAScore = storedScore?.[0] ?? getSetTeamAScore(set);
    const teamBScore = storedScore?.[1] ?? getSetTeamBScore(set);
    const hasScore =
      Boolean(storedScore) ||
      (Boolean(set) &&
        (getSetStatus(set) !== "not_started" ||
          teamAScore > 0 ||
          teamBScore > 0));

    return {
      label: `Set ${setNumber}`,
      value: hasScore
        ? `${String(teamAScore).padStart(2, "0")} - ${String(teamBScore).padStart(2, "0")}`
        : "--:--",
      isActive: setNumber === activeSetNumber,
    };
  });
  const scoringSystem =
    storedConfig?.scoringSystem ||
    matchInfo?.scoringSystem ||
    matchInfo?.event?.scoringSystem ||
    "sideout";
  const scoringLabel =
    scoringSystem === "rally" ? "Rally Scoring" : "Side-Out Scoring";
  const serverSide = storedState?.serverSide ?? 0;
  const eventName = matchInfo?.event?.name || "Tournament event";
  const tournament = matchInfo?.event?.tournament || matchInfo?.tournament || {};
  const tournamentName = tournament?.name || "Tournament";
  const about = [eventName, tournamentName].filter(Boolean).join(", ");
  const contact = tournament?.contactPhone || matchInfo?.organizerContact || "Not available";
  const scorer =
    matchInfo?.scorerUser?.name ||
    matchInfo?.scorerName ||
    matchInfo?.scorer?.name ||
    "Match Scorer";

  function goBack() {
    if (eventId || tournamentId) {
      router.replace(
        `/user/tournaments/event/matches${toQuery({
          tournamentId,
          eventId,
          tab: "matches",
        })}`,
      );
      return;
    }
    router.back();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <header className="sticky top-0 z-40 bg-[var(--color-background)]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-elevated)]"
            aria-label="Back"
          >
            <ArrowLeftIcon size={21} />
          </button>
          <h1 className="text-base font-black">Live Match</h1>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-elevated)]"
            aria-label="Match actions"
          >
            <MoreVerticalIcon size={20} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-5 pb-8">
        {loadError ? (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-sm font-semibold text-[var(--color-muted)]">
            {loadError}
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-sm">
              <h2 className="text-center text-sm font-black">Match Overview</h2>
              <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="overflow-hidden rounded-md border border-[var(--color-border)] text-center">
                    <div className="flex h-7 items-center justify-center gap-1 border-b border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)]">
                      <UserIcon size={12} />
                      Scorer
                    </div>
                    <p className="truncate px-2 py-2 text-xs font-black">
                      {scorer}
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-md border border-[var(--color-border)] text-center">
                    <div className="flex h-7 items-center justify-center gap-1 border-b border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)]">
                      Match Timer
                      <TimerIcon size={12} />
                    </div>
                    <p className="px-2 py-2 text-xs font-black tabular-nums">
                      {formatElapsed(elapsedSeconds)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-sm">
              <h2 className="text-center text-lg font-black">
                Current Set: {String(activeSetNumber).padStart(2, "0")}
              </h2>

              <div className="mt-3 rounded-lg border border-[var(--color-border)] p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                  <PlayerSide
                    players={sideAPlayers}
                    label={sideALabel}
                    isServing={serverSide === 0}
                  />
                  <div className="px-1 text-2xl font-black text-[var(--color-muted)]">
                    Vs
                  </div>
                  <PlayerSide
                    players={sideBPlayers}
                    label={sideBLabel}
                    isServing={serverSide === 1}
                  />
                </div>

                <div className="mt-4 text-center">
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                    {scoringLabel}
                  </span>
                </div>

                <div className="mt-3 text-center text-[11px] font-semibold text-[var(--color-muted)]">
                  Current score{" "}
                  <span className="font-black text-[var(--color-text)]">
                    {String(currentScore[0] ?? 0).padStart(2, "0")} -{" "}
                    {String(currentScore[1] ?? 0).padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <SetScoreboard sets={setCells} />
              </div>
            </section>

            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <h2 className="text-sm font-black">Match Info</h2>
              <div className="mt-3 space-y-2">
                <InfoRow label="About" value={about} />
                <InfoRow
                  label="Venue"
                  value={buildVenue(matchInfo)}
                  icon={<MapPinIcon size={12} />}
                />
                <InfoRow
                  label="Organizer Contact"
                  value={contact}
                  icon={<PhoneIcon size={12} />}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default function UserTournamentLiveMatchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      }
    >
      <UserTournamentLiveMatchContent />
    </React.Suspense>
  );
}
