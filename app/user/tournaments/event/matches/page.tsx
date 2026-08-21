"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  CalendarIcon,
  GroupUsersIcon,
  ShareIcon,
  TimerIcon,
  TrophyIcon,
} from "@/components/Icons";
import LiveMatchViewerPopup from "@/components/LiveMatchViewerPopup";
import TeamLogo from "@/components/TeamLogo";
import { useApp } from "@/components/AppProvider";
import { eventApi, type EventResultStanding } from "@/lib/api/eventApi";
import { matchApi } from "@/lib/api/matchApi";
import { EventData, TournamentData } from "@/lib/models";
import { isEventRegistrationOpen } from "@/lib/statusLabels";
import { toQuery } from "@/lib/utils";

type ViewTab = "fixtures" | "matches";
type MatchStatus = "upcoming" | "live" | "ended";
type SetScore = { label: string; value: string };

type MatchRow = {
  id: string;
  label: string;
  status: MatchStatus;
  roundNumber: number;
  scheduledDate: string;
  scheduledTime: string;
  sideA: any;
  sideB: any;
  setsWonA: number;
  setsWonB: number;
  sets: SetScore[];
  winnerSide?: "a" | "b";
  court?: string;
  scorerName?: string;
  liveMatchData?: any;
};

function formatDate(value?: string | null, compact = false) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: compact ? "2-digit" : "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTeamName(team: any, fallback = "TBD") {
  if (!team) return fallback;
  const participants = Array.isArray(team.participants) ? team.participants : [];
  if (participants.length > 0) {
    return participants
      .map((p: any) => p?.user?.name || p?.name)
      .filter(Boolean)
      .join(" / ");
  }
  return team.name || team.teamName || team.displayName || fallback;
}

function teamHasUser(team: any, userId?: string | null) {
  if (!userId || !team) return false;
  const participants = Array.isArray(team.participants) ? team.participants : [];
  return participants.some(
    (p: any) => p?.user?.id === userId || p?.userId === userId,
  );
}

function getRegisteredPlayerCount(teams: any[] = []) {
  return teams.reduce((total, team) => {
    const participants = Array.isArray(team?.participants)
      ? team.participants
      : [];
    return total + Math.max(1, participants.length);
  }, 0);
}

function getParticipantId(participant: any) {
  return (
    participant?.user?.id ||
    participant?.userId ||
    participant?.id ||
    participant?.profile?.id ||
    null
  );
}

function getUniquePlayerCountFromMatches(matches: any[] = []) {
  const ids = new Set<string>();

  matches.forEach((match) => {
    [match?.teamAData, match?.teamBData, match?.teamA, match?.teamB].forEach(
      (team) => {
        if (!team || typeof team === "string") return;
        const participants = Array.isArray(team?.participants)
          ? team.participants
          : [];
        participants.forEach((participant: any) => {
          const id = getParticipantId(participant);
          if (id) ids.add(id);
        });
      },
    );
  });

  return ids.size;
}

function getTeamId(team: any) {
  return typeof team === "string" ? team : team?.id || null;
}

function getSetNumber(set: any) {
  return Number(set?.setNumber ?? set?.set_number ?? set?.setInteger ?? set?.set_integer);
}

function getSetStatus(set: any) {
  return String(set?.setStatus ?? set?.set_status ?? "").toLowerCase();
}

function getSetWinnerId(set: any) {
  return set?.winnerId ?? set?.winner_id ?? null;
}

function getSetTeamAScore(set: any) {
  return Number(set?.teamAScore ?? set?.team_a_score ?? set?.teamA ?? set?.team_a ?? 0);
}

function getSetTeamBScore(set: any) {
  return Number(set?.teamBScore ?? set?.team_b_score ?? set?.teamB ?? set?.team_b ?? 0);
}

function normalizeMatchSets(sets: any[] = []) {
  const statusRank: Record<string, number> = {
    in_progress: 3,
    completed: 2,
    not_started: 1,
  };
  const byNumber = new Map<number, any>();

  sets.forEach((set) => {
    const setNumber = getSetNumber(set);
    if (!Number.isFinite(setNumber)) return;

    const existing = byNumber.get(setNumber);
    const setRank = statusRank[getSetStatus(set)] ?? 0;
    const existingRank = existing ? statusRank[getSetStatus(existing)] ?? 0 : -1;
    const setScore = getSetTeamAScore(set) + getSetTeamBScore(set);
    const existingScore = existing
      ? getSetTeamAScore(existing) + getSetTeamBScore(existing)
      : -1;

    if (!existing || setRank > existingRank || (setRank === existingRank && setScore >= existingScore)) {
      byNumber.set(setNumber, set);
    }
  });

  return [...byNumber.values()].sort((a, b) => getSetNumber(a) - getSetNumber(b));
}

function hasExactSetScores(sets: any[] = []) {
  return normalizeMatchSets(sets).some(
    (set: any) =>
      getSetTeamAScore(set) > 0 ||
      getSetTeamBScore(set) > 0 ||
      getSetStatus(set) === "completed" ||
      getSetStatus(set) === "in_progress",
  );
}

function getEventMatchSets(event: any, matchId: string) {
  const eventMatches = Array.isArray(event?.matches) ? event.matches : [];
  const match = eventMatches.find((item: any) => item?.id === matchId);
  return Array.isArray(match?.setRows)
    ? match.setRows
    : Array.isArray(match?.sets)
      ? match.sets
      : [];
}

function getMatchSetRows(match: any) {
  return Array.isArray(match?.setRows)
    ? match.setRows
    : Array.isArray(match?.sets)
      ? match.sets
      : [];
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

function getTeamPlayers(team: any, userId?: string | null, fallback = "Team") {
  const participants = Array.isArray(team?.participants) ? team.participants : [];
  const players = participants
    .map((participant: any) => {
      const participantId = getParticipantId(participant);
      if (userId && participantId === userId) return "You";
      return participant?.user?.name || participant?.name || participant?.profile?.name;
    })
    .filter(Boolean);

  return players.length > 0 ? players : [getTeamName(team, fallback)];
}

function getTeamImages(team: any) {
  const participants = Array.isArray(team?.participants) ? team.participants : [];
  return participants.map(getProfilePicUrl).filter(Boolean);
}

function toLivePopupTeam(team: any, userId?: string | null, fallback = "Team") {
  return {
    ...team,
    id: getTeamId(team),
    players: getTeamPlayers(team, userId, fallback),
    images: getTeamImages(team),
  };
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function FixtureTeamAvatar({ team }: { team: any }) {
  const participants = Array.isArray(team?.participants) ? team.participants : [];

  if (participants.length > 1) {
    return (
      <div className="relative h-9 w-11 shrink-0">
        {participants.slice(0, 2).map((participant: any, index: number) => {
          const name = participant?.user?.name || participant?.name || "Player";
          const photoUrl = getProfilePicUrl(participant);

          return (
            <div
              key={participant?.user?.id || participant?.userId || index}
              className={`absolute top-0 grid h-9 w-9 place-items-center overflow-hidden rounded-full border-2 border-white bg-orange-500 text-[10px] font-black text-white shadow-sm ${
                index === 0 ? "left-0 z-10" : "right-0"
              }`}
            >
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                getInitials(name)
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const participant = participants[0];
  const name = participant?.user?.name || participant?.name || getTeamName(team);
  const photoUrl = getProfilePicUrl(participant);

  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-orange-500 text-xs font-black text-white shadow-sm">
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

function getStatusMeta(status: MatchStatus) {
  if (status === "live") {
    return {
      label: "Live",
      dot: "bg-green-500",
      badge:
        "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]",
    };
  }
  if (status === "ended") {
    return {
      label: "Ended",
      dot: "bg-[var(--color-dot)]",
      badge: "bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]",
    };
  }
  return {
    label: "Upcoming",
    dot: "bg-orange-400",
    badge: "bg-[var(--badge-live-bg)] text-[var(--badge-live-text)]",
  };
}

function StandingAvatar({ row }: { row: EventResultStanding }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-orange-500 bg-orange-100">
      {row.avatarUrl ? (
        <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-black text-orange-600">
          {row.teamName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-orange-500 text-[9px] font-black text-white">
        {row.rank}
      </span>
    </div>
  );
}

function RoundSelector({
  rounds,
  activeRound,
  onSelect,
}: {
  rounds: number[];
  activeRound: number;
  onSelect: (round: number) => void;
}) {
  if (rounds.length <= 1) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
        <span className="inline-flex h-8 items-center rounded-full bg-orange-500 px-4 text-[11px] font-black text-white">
          Round {activeRound || 1}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-4">
      <div className="flex items-center overflow-x-auto pb-0.5">
        {rounds.map((round, index) => (
          <React.Fragment key={round}>
            <button
              type="button"
              onClick={() => onSelect(round)}
              className={`h-7 min-w-[72px] shrink-0 rounded-full px-3 text-[11px] font-bold transition-colors ${
                activeRound === round
                  ? "bg-orange-500 text-white"
                  : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-muted)]"
              }`}
            >
              Round {round}
            </button>
            {index < rounds.length - 1 && (
              <div className="mx-2 min-w-5 flex-1 border-t-2 border-dotted border-[var(--color-border)]" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function FixtureCard({
  match,
  userId,
  onViewLive,
}: {
  match: MatchRow;
  userId?: string | null;
  onViewLive?: (match: MatchRow) => void;
}) {
  const involvesUser =
    teamHasUser(match.sideA, userId) || teamHasUser(match.sideB, userId);
  const statusMeta = getStatusMeta(match.status);
  const leftName = teamHasUser(match.sideA, userId)
    ? "You"
    : getTeamName(match.sideA);
  const rightName = teamHasUser(match.sideB, userId)
    ? "You"
    : getTeamName(match.sideB);
  const showScore = match.status !== "upcoming";

  return (
    <div
      className={`rounded-xl border px-3 py-3 shadow-sm ${
        involvesUser
          ? "border-[var(--color-primary)] bg-[var(--badge-live-bg)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
        <span className="font-bold text-[var(--color-text)]">{match.label}</span>
        <span>
          {match.scheduledDate} {match.scheduledTime}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <FixtureTeamAvatar team={match.sideA} />
          <span className="max-w-full truncate text-center text-xs font-semibold text-[var(--color-text)]">
            {leftName}
          </span>
        </div>

        <div className="text-center">
          {showScore ? (
            <div className="text-2xl font-black text-[var(--color-text)]">
              {match.setsWonA} - {match.setsWonB}
            </div>
          ) : (
            <div className="text-sm font-bold text-[var(--color-muted)]">VS</div>
          )}
          <span
            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.badge}`}
          >
            {statusMeta.label}
          </span>
        </div>

        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <FixtureTeamAvatar team={match.sideB} />
          <span className="max-w-full truncate text-center text-xs font-semibold text-[var(--color-text)]">
            {rightName}
          </span>
        </div>
      </div>

      {match.status === "live" && (
        <button
          type="button"
          onClick={() => onViewLive?.(match)}
          className="mt-3 flex w-full items-center justify-center rounded-full bg-green-500 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-green-600"
        >
          View Live Match
        </button>
      )}
    </div>
  );
}

function SetGrid({ sets }: { sets: SetScore[] }) {
  const visibleSets = sets.length > 0 ? sets : [{ label: "Set 1", value: "-- : --" }];
  const gridTemplateColumns =
    visibleSets.length === 1
      ? "grid-cols-1"
      : visibleSets.length === 2
        ? "grid-cols-2"
        : visibleSets.length === 3
          ? "grid-cols-3"
          : "grid-cols-2 min-[360px]:grid-cols-4";

  return (
    <div
      className={`mx-auto grid overflow-hidden rounded-lg border border-[var(--color-border)] ${
        visibleSets.length === 1
          ? "w-fit min-w-[96px]"
          : visibleSets.length === 2
            ? "w-full max-w-[150px]"
            : visibleSets.length === 3
              ? "w-full max-w-[210px]"
              : "w-full max-w-[260px]"
      } ${gridTemplateColumns}`}
    >
      {visibleSets.map((set, index) => (
        <div
          key={set.label}
          className={`text-center ${
            index < visibleSets.length - 1 ? "border-r border-[var(--color-border)]" : ""
          }`}
        >
          <div className="border-b border-[var(--color-border)] py-1 text-[10px] font-medium text-[var(--color-text-secondary)]">
            {set.label}
          </div>
          <div className="py-1 text-xs font-bold text-[var(--color-text)]">{set.value}</div>
        </div>
      ))}
    </div>
  );
}

function DetailedMatchCard({
  match,
  userId,
  onViewLive,
}: {
  match: MatchRow;
  userId?: string | null;
  onViewLive?: (match: MatchRow) => void;
}) {
  const statusMeta = getStatusMeta(match.status);
  const leftName = teamHasUser(match.sideA, userId)
    ? "You"
    : getTeamName(match.sideA, "Team A");
  const rightName = teamHasUser(match.sideB, userId)
    ? "You"
    : getTeamName(match.sideB, "Team B");

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div className="bg-green-500 px-4 py-3 text-center text-sm font-black text-white">
        {match.label}
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <CalendarIcon size={13} />
            {match.scheduledDate}
          </span>
          <span className="flex items-center gap-1.5">
            <TimerIcon size={13} />
            {match.scheduledTime}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex min-w-0 flex-col items-center gap-2">
            <TeamLogo team={match.sideA} size="md" />
            <span className="max-w-full truncate text-center text-xs font-bold text-[var(--color-text)]">
              {leftName}
            </span>
          </div>

          <div className="min-w-[92px] text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-text-secondary)]">
              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
              {statusMeta.label}
            </div>
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)]">Sets Won</div>
            {match.status === "upcoming" ? (
              <div className="text-2xl font-black text-[var(--color-text)]">VS</div>
            ) : (
              <div className="text-3xl font-black text-[var(--color-text)]">
                {String(match.setsWonA).padStart(2, "0")} -{" "}
                {String(match.setsWonB).padStart(2, "0")}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col items-center gap-2">
            <TeamLogo team={match.sideB} size="md" />
            <span className="max-w-full truncate text-center text-xs font-bold text-[var(--color-text)]">
              {rightName}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {match.court?.trim() && (
            <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">
              {match.court}
            </span>
          )}
          {match.scorerName?.trim() && (
            <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">
              {match.scorerName}
            </span>
          )}
        </div>

        <SetGrid sets={match.sets} />

        {match.status === "live" ? (
          <button
            type="button"
            onClick={() => onViewLive?.(match)}
            className="w-full rounded-full bg-green-500 py-3 text-center text-sm font-black text-white transition-colors hover:bg-green-600"
          >
            View Live Match
          </button>
        ) : (
          <div className="rounded-full bg-[var(--color-surface-elevated)] py-3 text-center text-sm font-black text-[var(--color-muted)]">
            {match.status === "upcoming" ? "Match Pending" : "Match Record"}
          </div>
        )}

        {match.status === "ended" && match.winnerSide && (
          <div className="border-t border-[var(--color-border)] pt-3 text-center text-xs font-black text-[var(--color-text)]">
            <TrophyIcon size={14} className="mr-1 inline text-orange-500" />
            {match.winnerSide === "a" ? leftName : rightName}
          </div>
        )}
      </div>
    </div>
  );
}

function WinnersPanel({
  tournamentName,
  standings,
}: {
  tournamentName: string;
  standings: EventResultStanding[];
}) {
  const champion = standings[0];
  if (!champion) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div className="bg-orange-500 px-5 py-8 text-center text-white">
        <TrophyIcon size={72} className="mx-auto text-yellow-200" />
        <p className="mt-3 text-2xl font-black">CHAMPION!</p>
        <p className="text-sm font-semibold">{tournamentName}</p>
        <div className="mx-auto mt-4 w-fit">
          <StandingAvatar row={champion} />
        </div>
        <p className="mt-2 text-xl font-black">{champion.teamName}</p>
      </div>

      <div className="space-y-3 p-4">
        <h2 className="text-lg font-black text-[var(--color-text)]">Final Standings</h2>
        {standings.slice(0, 3).map((row) => (
          <div
            key={row.teamId}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3"
          >
            <StandingAvatar row={row} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-[var(--color-text)]">
                {row.teamName}
              </p>
              <p className="text-xs font-semibold text-[var(--color-muted)]">
                {row.label ?? `Rank ${row.rank}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-orange-500">{row.wins}</p>
              <p className="text-[10px] font-bold uppercase text-[var(--color-muted)]">
                Wins
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function UserTournamentEventMatchesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      }
    >
      <UserTournamentEventMatchesContent />
    </React.Suspense>
  );
}

function UserTournamentEventMatchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useApp();

  const tournamentId = searchParams.get("tournamentId") || "";
  const eventId = searchParams.get("eventId") || "";
  const initialTab =
    searchParams.get("tab") === "matches" ? "matches" : "fixtures";

  const [activeTab, setActiveTab] = useState<ViewTab>(initialTab);
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [activeRound, setActiveRound] = useState(1);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [standings, setStandings] = useState<EventResultStanding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMatchesLoading, setIsMatchesLoading] = useState(false);
  const [selectedLiveMatch, setSelectedLiveMatch] = useState<any>(null);

  useEffect(() => {
    if (!eventId || !tournamentId) return;

    let cancelled = false;
    async function loadCore() {
      try {
        setIsLoading(true);
        const eventResult = await eventApi.getEventByIdSafe(
          eventId,
          tournamentId,
        );

        if (cancelled) return;
        const nextEvent = eventResult.event;
        const nextTournament = eventResult.tournament;
        setEvent(nextEvent);
        setTournament(nextTournament);
        setActiveRound(Number(nextEvent?.activeRound || 1));

        try {
          const eventParticipants = await eventApi.getEventParticipants(eventId);
          if (!cancelled) {
            setParticipantsCount(
              getRegisteredPlayerCount(
                Array.isArray(eventParticipants) ? eventParticipants : [],
              ),
            );
          }
        } catch (participantsError) {
          console.error("Failed to load selected event participants", participantsError);
          const selectedEvent =
            nextEvent ||
            (nextTournament?.events ?? []).find((item) => item.id === eventId);
          if (!cancelled) {
            setParticipantsCount(
              getRegisteredPlayerCount(
                Array.isArray(selectedEvent?.teams) ? selectedEvent.teams : [],
              ),
            );
          }
        }
      } catch (error) {
        console.error("Failed to load event overview", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadCore();
    return () => {
      cancelled = true;
    };
  }, [eventId, tournamentId]);

  useEffect(() => {
    if (!eventId || !activeRound) return;

    let cancelled = false;
    let firstLoad = true;
    async function loadMatches() {
      try {
        setIsMatchesLoading(firstLoad);
        const data = await matchApi.getMatchesByEventAndRound(
          eventId,
          activeRound,
        );
        if (cancelled) return;

        const eventMatchesRaw = Array.isArray(data)
          ? data.filter(
              (m: any) => String(m?.eventId || m?.event?.id || "") === eventId,
            )
          : [];
        const eventMatches = await Promise.all(
          eventMatchesRaw.map(async (match: any) => {
            if (hasExactSetScores(getMatchSetRows(match))) return match;

            const eventSets = getEventMatchSets(event, match.id);
            if (hasExactSetScores(eventSets)) {
              return {
                ...match,
                sets: eventSets,
                setRows: eventSets,
              };
            }

            try {
              const details = await matchApi.getMatchInfo(match.id);
              const detailSets = getMatchSetRows(details);
              const matchSets = getMatchSetRows(match);
              const nextSets = detailSets.length ? detailSets : matchSets;
              return {
                ...match,
                ...details,
                sets: nextSets,
                setRows: nextSets,
                teamAData: details?.teamAData || match.teamAData,
                teamBData: details?.teamBData || match.teamBData,
                scorerUser: details?.scorerUser || match.scorerUser,
              };
          } catch {
              return match;
            }
          }),
        );
        const mapped = eventMatches.map((m: any, index: number): MatchRow => {
          const rawSets = getMatchSetRows(m);
          const sets = normalizeMatchSets(rawSets);
          const expectedSets = Math.max(
            1,
            Number(event?.setsPerMatch || m.setsPerMatch || sets.length || 1),
          );
          const teamA =
            m.teamAData || (typeof m.teamA === "object" ? m.teamA : null);
          const teamB =
            m.teamBData || (typeof m.teamB === "object" ? m.teamB : null);
          const teamAId = getTeamId(m.teamA) || getTeamId(teamA);
          const teamBId = getTeamId(m.teamB) || getTeamId(teamB);
          let setsWonA = 0;
          let setsWonB = 0;
          const setScores: SetScore[] = Array.from({ length: expectedSets }).map(
            (_, setIndex) => {
              const setNumber = setIndex + 1;
              const set = sets.find((row: any) => getSetNumber(row) === setNumber);
              const setStatus = getSetStatus(set);
              const teamAScore = getSetTeamAScore(set);
              const teamBScore = getSetTeamBScore(set);
              const setWinnerId = getSetWinnerId(set);

              if (setStatus === "completed") {
                if (setWinnerId === teamAId || (!setWinnerId && teamAScore > teamBScore))
                  setsWonA += 1;
                if (setWinnerId === teamBId || (!setWinnerId && teamBScore > teamAScore))
                  setsWonB += 1;
              }

              const hasScore =
                Boolean(set) &&
                (setStatus !== "not_started" ||
                  teamAScore > 0 ||
                  teamBScore > 0);

              return {
                label: `Set ${setNumber}`,
                value: hasScore
                  ? `${String(teamAScore).padStart(2, "0")} - ${String(
                      teamBScore,
                    ).padStart(2, "0")}`
                  : "-- : --",
              };
            },
          );

          const hasLiveSet = sets.some(
            (set: any) =>
              getSetStatus(set) === "in_progress" ||
              getSetTeamAScore(set) > 0 ||
              getSetTeamBScore(set) > 0,
          );
          let status: MatchStatus = "upcoming";
          if (["completed", "abandoned", "walkover"].includes(m.matchState)) {
            status = "ended";
          } else if (m.matchState === "in_progress" || hasLiveSet) {
            status = "live";
          }

          const scheduledStart = m.startTime || m.scheduledAt;
          const winnerSide =
            m.winnerId === teamAId
              ? "a"
              : m.winnerId === teamBId
                ? "b"
                : undefined;
          if (status === "ended" && setsWonA === 0 && setsWonB === 0 && winnerSide) {
            if (winnerSide === "a") setsWonA = 1;
            if (winnerSide === "b") setsWonB = 1;
          }
          const currentSet =
            sets.find((set: any) => getSetStatus(set) === "in_progress") ||
            [...sets]
              .filter(
                (set: any) =>
                  getSetStatus(set) !== "not_started" ||
                  getSetTeamAScore(set) > 0 ||
                  getSetTeamBScore(set) > 0,
              )
              .sort((a, b) => getSetNumber(b) - getSetNumber(a))[0] ||
            sets[0];
          const liveMatchData =
            status === "live"
              ? {
                  id: m.id,
                  tournamentId,
                  tournamentName: tournament?.name || event?.name || "Tournament",
                  matchTitle: `${event?.name || "Event"} · Match #${String(m.id).split("-")[0]}`,
                  matchState: m.matchState,
                  teamA: toLivePopupTeam(teamA, session?.user?.id, "Team A"),
                  teamB: toLivePopupTeam(teamB, session?.user?.id, "Team B"),
                  score: {
                    teamA: setsWonA,
                    teamB: setsWonB,
                    currentSet: currentSet ? getSetNumber(currentSet) : 1,
                  },
                  sets: sets.map((set: any) => ({
                    id: set?.id,
                    setNumber: getSetNumber(set),
                    teamAScore: getSetTeamAScore(set),
                    teamBScore: getSetTeamBScore(set),
                    setStatus: getSetStatus(set) || "not_started",
                    winnerId: getSetWinnerId(set),
                  })),
                  court: m.courtName || null,
                  isLive: true,
                }
              : null;

          return {
            id: m.id,
            label: `Match ${m.slotIndex || index + 1}`,
            status,
            roundNumber: m.roundNumber || activeRound,
            scheduledDate: formatDate(scheduledStart, true),
            scheduledTime: formatTime(scheduledStart),
            sideA: teamA,
            sideB: teamB,
            setsWonA,
            setsWonB,
            sets: setScores,
            winnerSide,
            court: m.courtName || "",
            scorerName: m.scorerUser?.name || m.scorerName || m.scorer?.name || "",
            liveMatchData,
          };
        });

        setMatches(mapped);
        setSelectedLiveMatch((prev: any) => {
          if (!prev?.id) return prev;
          const latest = mapped.find(
            (match) => match.status === "live" && match.id === prev.id,
          );
          return latest?.liveMatchData ?? null;
        });
      } catch (error) {
        console.error("Failed to load matches", error);
        if (!cancelled) setMatches([]);
      } finally {
        firstLoad = false;
        if (!cancelled) setIsMatchesLoading(false);
      }
    }

    void loadMatches();
    const intervalId = window.setInterval(() => {
      void loadMatches();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeRound, event, eventId, session?.user?.id, tournament?.name, tournamentId]);

  useEffect(() => {
    if (!eventId || event?.eventState !== "completed") {
      setStandings([]);
      return;
    }

    let cancelled = false;
    async function loadResults() {
      try {
        const results = await eventApi.getEventResults(eventId);
        if (!cancelled) setStandings(results.standings || []);
      } catch (error) {
        console.error("Failed to load event results", error);
      }
    }

    void loadResults();
    return () => {
      cancelled = true;
    };
  }, [event?.eventState, eventId]);

  const rounds = useMemo(() => {
    const maxRound = Math.max(1, Number(event?.activeRound || activeRound || 1));
    return Array.from({ length: maxRound }, (_, index) => index + 1);
  }, [activeRound, event?.activeRound]);

  const registrationOpen = isEventRegistrationOpen(
    event?.eventState,
    event?.dueDate,
  );
  const tournamentName = event?.name || tournament?.name || "Tournament Event";

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: tournamentName, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  function handleViewLiveMatch(match: MatchRow) {
    if (match.status !== "live" || !match.liveMatchData) return;
    router.push(
      `/user/tournaments/event/match/live${toQuery({
        tournamentId,
        eventId,
        matchId: match.id,
        viewOnly: "1",
      })}`,
    );
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
      <header className="sticky top-0 z-40 bg-orange-500 text-white shadow-sm">
        <div className="px-4 pb-5 pt-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/tournaments/detail${toQuery({
                    id: tournamentId,
                    tab: "events",
                  })}`,
                )
              }
              className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white"
              aria-label="Back"
            >
              <ArrowLeftIcon size={20} />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-center text-lg font-black text-white">
              {tournamentName}
            </h1>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white"
              aria-label="Share"
            >
              <ShareIcon size={18} />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-zinc-900 dark:border-[var(--color-border)] dark:bg-[var(--color-surface-elevated)] dark:text-[var(--color-text)]">
              <div className="grid h-10 w-10 place-items-center rounded-full border border-orange-100 text-orange-500 dark:border-[var(--color-border)]">
                <GroupUsersIcon size={21} strokeWidth={2.25} />
              </div>
              <div>
                <p className="text-lg font-black leading-none">
                  {participantsCount}
                </p>
                <p className="text-xs font-medium text-zinc-600 dark:text-[var(--color-text-secondary)]">Registered</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-center text-zinc-900 dark:border-[var(--color-border)] dark:bg-[var(--color-surface-elevated)] dark:text-[var(--color-text)]">
              <p className="text-sm font-black">Registration</p>
              <p
                className={`mx-auto mt-2 w-fit rounded-full px-6 py-1 text-[11px] font-black ${
                  registrationOpen
                    ? "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]"
                    : "bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]"
                }`}
              >
                {registrationOpen ? "Open" : "Closed"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-white/20 bg-[var(--color-surface)] text-sm font-bold">
          {(["fixtures", "matches"] as ViewTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative h-11 capitalize ${
                activeTab === tab ? "text-orange-500" : "text-[var(--color-muted)]"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-orange-500" />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-5">
        <RoundSelector
          rounds={rounds}
          activeRound={activeRound}
          onSelect={setActiveRound}
        />

        {event?.eventState === "completed" && (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/user/tournaments/event/champion${toQuery({
                  tournamentId,
                  eventId,
                })}`,
              )
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-primary)] bg-[var(--badge-live-bg)] px-4 py-3 text-sm font-black text-[var(--color-primary)]"
          >
            <TrophyIcon size={16} />
            View Champion
          </button>
        )}

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3">
          {isMatchesLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <p className="mt-3 text-sm font-semibold text-[var(--color-muted)]">
                Fetching matches...
              </p>
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-10 text-center text-sm font-semibold text-[var(--color-muted)]">
              No matches found for Round {activeRound}.
            </div>
          ) : activeTab === "fixtures" ? (
            <div className="space-y-3">
              {matches.map((match) => (
                <FixtureCard
                  key={match.id}
                  match={match}
                  userId={session?.user?.id}
                  onViewLive={handleViewLiveMatch}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <DetailedMatchCard
                  key={match.id}
                  match={match}
                  userId={session?.user?.id}
                  onViewLive={handleViewLiveMatch}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <LiveMatchViewerPopup
        isOpen={!!selectedLiveMatch}
        onClose={() => setSelectedLiveMatch(null)}
        match={selectedLiveMatch}
      />
    </div>
  );
}
