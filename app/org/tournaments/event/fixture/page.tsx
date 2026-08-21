"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  SearchIcon,
  PlusIcon,
  ChevronDownIcon,
  XIcon,
  CheckIcon,
  TrophyIcon,
  TrashIcon,
} from "@/components/Icons";
import { toQuery } from "@/lib/utils";
import { eventApi } from "@/lib/api/eventApi";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { teamApi } from "@/lib/api/teamApi";
import { TournamentData, EventData } from "@/lib/models";
import TeamLogo from "@/components/TeamLogo";
import { useApp } from "@/components/AppProvider";

type FixtureMatch = {
  id: string;
  teamA: any | null;
  teamB: any | null;
  state: "upcoming" | "empty";
  startTime: string;
};

function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getMinStartTimeValue() {
  const date = new Date(Date.now() + 60 * 1000);
  date.setSeconds(0, 0);
  return toDateTimeLocalValue(date);
}

function isPastStartTime(value: string) {
  if (!value) return false;
  return new Date(value).getTime() <= Date.now();
}

function FixtureSetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { activeOrganization } = useApp();
  const tournamentId = searchParams.get("tournamentId") || "";
  const eventId = searchParams.get("eventId") || "";
  const requestedViewOnly =
    searchParams.get("viewOnly") === "1" || searchParams.get("mode") === "view";
  const detailPath = pathname.startsWith("/user/manage/")
    ? "/user/manage/tournament/detail"
    : "/org/tournaments/detail";

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fixture State
  const [matches, setMatches] = useState<FixtureMatch[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);

  const [isRemainingOpen, setIsRemainingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showByeModal, setShowByeModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const minStartTime = getMinStartTimeValue();
  const canManage =
    pathname.startsWith("/user/manage/") ||
    Boolean(
      (tournament?.organizationId || tournament?.organization?.id) &&
        activeOrganization?.id &&
        activeOrganization.id ===
          (tournament?.organizationId || tournament?.organization?.id),
    );
  const viewOnly = requestedViewOnly || !canManage;

  // Selection State for Assignment
  const [selectedSlot, setSelectedSlot] = useState<{
    matchId: string;
    position: "teamA" | "teamB";
  } | null>(null);

  useEffect(() => {
    if (!eventId || !tournamentId) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const [eventResult, teamsData] = await Promise.all([
          eventApi.getEventByIdSafe(eventId, tournamentId),
          teamApi.getTeamsByEvent(eventId),
        ]);

        setTournament((eventResult.tournament as TournamentData) || null);
        setEvent(eventResult.event || null);

        const participatingTeams = Array.isArray(teamsData)
          ? teamsData
              .filter(
                (t: any) =>
                  String(t?.eventId || t?.event?.id || "") === eventId,
              )
              .filter(
                (t: any) =>
                  t.teamStatus === "participating" ||
                  t.teamStatus === "confirmed",
              )
          : [];

        setTeams(participatingTeams);
        autoPair(participatingTeams);
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [eventId, tournamentId]);

  const autoPair = (teamList: any[]) => {
    if (teamList.length < 2) {
      setUnassigned(teamList);
      setMatches([]);
      return;
    }

    const shuffled = [...teamList].sort(() => Math.random() - 0.5);
    const N = shuffled.length;
    const matchCount = N - 1;

    const newMatches: FixtureMatch[] = [];
    // We can only pair N/2 matches initially
    const initialPairCount = Math.floor(N / 2);

    for (let i = 0; i < matchCount; i++) {
      if (i < initialPairCount) {
        newMatches.push({
          id: `m-${Date.now()}-${i}`,
          teamA: shuffled.pop(),
          teamB: shuffled.pop(),
          state: "upcoming",
          startTime: "",
        });
      } else {
        newMatches.push({
          id: `m-${Date.now()}-${i}`,
          teamA: null,
          teamB: null,
          state: "empty",
          startTime: "",
        });
      }
    }

    setMatches(newMatches);
    setUnassigned(shuffled); // Remaining teams (if N was odd)
  };

  const handleResetBrackets = () => {
    if (confirm("Reset fixtures? All teams will be shuffled and re-paired.")) {
      autoPair(teams);
      setSelectedSlot(null);
    }
  };

  const handleRemoveFixture = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const returnedTeams: any[] = [];
    if (match.teamA) returnedTeams.push(match.teamA);
    if (match.teamB) returnedTeams.push(match.teamB);

    setUnassigned((prev) => [...prev, ...returnedTeams]);
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    if (selectedSlot?.matchId === matchId) setSelectedSlot(null);
  };

  const handleSlotClick = (
    matchId: string,
    position: "teamA" | "teamB",
    currentTeam: any,
  ) => {
    if (currentTeam) {
      // Unassign
      setUnassigned((prev) => [...prev, currentTeam]);
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId ? { ...m, [position]: null, state: "empty" } : m,
        ),
      );
    } else {
      // Select for assignment
      setSelectedSlot({ matchId, position });
      setIsRemainingOpen(true);
    }
  };

  const handleAssignClick = (team: any) => {
    if (!selectedSlot) return;

    setUnassigned((prev) => prev.filter((t) => t.id !== team.id));
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === selectedSlot.matchId) {
          const updated = { ...m, [selectedSlot.position]: team };
          if (updated.teamA && updated.teamB) updated.state = "upcoming";
          return updated;
        }
        return m;
      }),
    );
    setSelectedSlot(null);
  };

  const handleAddFixture = () => {
    setMatches((prev) => [
      ...prev,
      {
        id: `m-manual-${Date.now()}`,
        teamA: null,
        teamB: null,
        state: "empty",
        startTime: "",
      },
    ]);
  };

  const handleStartTimeChange = (matchId: string, startTime: string) => {
    if (startTime && isPastStartTime(startTime)) {
      alert("Start time cannot be in the past.");
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, startTime: "" } : m)),
      );
      return;
    }

    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, startTime } : m)),
    );
  };

  const handlePublishClick = () => {
    if (matches.length === 0) {
      alert("Please create at least one match for this round.");
      return;
    }

    const incomplete = matches.some((m) => !m.teamA || !m.teamB);
    if (incomplete) {
      alert(
        "Some matches are not filled properly. Please fill or remove them.",
      );
      return;
    }

    const missingStartTime = matches.some((m) => !m.startTime);
    if (missingStartTime) {
      alert("Please set a start time for every match.");
      return;
    }

    const pastStartTime = matches.some((m) => isPastStartTime(m.startTime));
    if (pastStartTime) {
      alert("Match start time cannot be in the past.");
      return;
    }

    setShowByeModal(true);
  };

  const handleConfirmPublish = async () => {
    try {
      setIsPublishing(true);

      const matchesToCreate = matches
        .filter((m) => m.teamA && m.teamB)
        .map((m) => ({
          roundNumber: event?.activeRound || 1,
          teamA: m.teamA.id,
          teamB: m.teamB.id,
          matchState: "scheduled",
          pointsPerSet: event?.pointsPerSet || 11,
          setsPerMatch: event?.setsPerMatch || 1,
          startTime: new Date(m.startTime).toISOString(),
        }));

      if (matchesToCreate.length > 0) {
        // Use the atomic finalizeSchedule pipeline
        await eventApi.finalizeSchedule(eventId, matchesToCreate);
      } else {
        // Fallback for edge cases if matches are already created or not needed
        await eventApi.updateEventState(eventId, "scheduled");
      }

      // Sync tournament status
      await tournamentApi.syncTournamentStatus(tournamentId);

      router.push(`${detailPath}${toQuery({ t: tournamentId })}`);
    } catch (error) {
      console.error("Failed to publish matches", error);
      alert("Failed to publish fixtures. Please try again.");
    } finally {
      setIsPublishing(false);
      setShowByeModal(false);
    }
  };

  const isAlreadyScheduled = !!(
    event?.eventState &&
    !["created", "registration_closed", "participants_finalized"].includes(
      event.eventState,
    )
  );

  const filteredUnassigned = unassigned.filter((t) => {
    const teamName =
      t.name || t.participants?.map((p: any) => p.user?.name).join(" & ") || "";
    return teamName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getTeamName = (t: any) => {
    const participants = t.participants || [];
    if (participants.length === 0) return t.name || "Unknown Team";

    if (participants.length === 1) {
      // Singles: User name of the player
      return participants[0].user?.name || t.name || "Player";
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] font-sans pb-24">
      {/* 1. Header Section */}
      <div className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] rounded-full transition-colors"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <h1 className="font-bold text-lg text-[var(--color-text)] tracking-tight">
            Fixture & Bracket Setup
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* 2. Tournament Info Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-bold text-lg text-[var(--color-text)]">
                {event?.name || tournament?.name}
              </h2>
              <p className="text-sm font-medium text-[var(--color-muted)] mt-0.5">
                {event?.teamType?.label || "Open"} •{" "}
                {event?.startDate
                  ? new Date(event.startDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Date TBA"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <div className="flex flex-col">
              <span className="text-xl font-bold text-[var(--color-text)]">
                {unassigned.length}
              </span>
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                Teams with Bye
              </span>
            </div>
            {!isAlreadyScheduled && !viewOnly && (
              <button
                onClick={handleResetBrackets}
                className="px-4 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-sm font-bold text-red-500 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Reset Brackets
              </button>
            )}
          </div>
        </div>

        {/* 3. Unassigned Teams Section */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden transition-all">
          <button
            onClick={() => setIsRemainingOpen(!isRemainingOpen)}
            className="w-full flex items-center justify-between p-4 bg-[var(--color-surface-elevated)]"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--color-text)] text-sm">
                Unassigned Teams (Bye)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {unassigned.length}
              </span>
            </div>
            <ChevronDownIcon
              size={18}
              className={`text-[var(--color-muted)] transition-transform duration-300 ${isRemainingOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isRemainingOpen && (
            <div className="p-4 border-t border-[var(--color-border)] space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="relative">
                <SearchIcon
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                />
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl text-sm outline-none focus:border-primary text-[var(--color-text)]"
                />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                {filteredUnassigned.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)] text-center py-4">
                    No unassigned teams found.
                  </p>
                ) : (
                  filteredUnassigned.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-2 hover:bg-[var(--color-surface-elevated)] rounded-lg cursor-pointer transition-colors group border border-transparent hover:border-[var(--color-border)]"
                    >
                      <div className="flex items-center gap-3">
                        <TeamLogo team={team} size="sm" />
                        <span className="text-sm font-semibold text-[var(--color-text)]">
                          {getTeamName(team)}
                        </span>
                      </div>
                      {!isAlreadyScheduled && !viewOnly && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAssignClick(team)}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg transition-all"
                          >
                            Assign to Slot
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5. Matches Section */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-[var(--color-text)]">
              Round {event?.activeRound || 1} Matches
            </h3>
            <span className="text-xs font-bold text-primary uppercase tracking-widest">
              {matches.length} Matches
            </span>
          </div>

          <div className="space-y-3">
            {matches.map((match: any, index: number) => (
              <div key={match.id} className="relative group">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2 ml-1 mr-1">
                  <div className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">
                    Match {index + 1}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    {!isAlreadyScheduled && !viewOnly && (
                      <label className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-bold text-[var(--color-text-secondary)] shadow-sm">
                        <span className="whitespace-nowrap">
                          {match.startTime ? "Start:" : "Set start time:"}
                        </span>
                        <input
                          type="datetime-local"
                          value={match.startTime}
                          min={minStartTime}
                          onChange={(e) =>
                            handleStartTimeChange(match.id, e.target.value)
                          }
                          className="h-8 w-full sm:w-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 text-xs font-semibold text-[var(--color-text)] outline-none focus:border-primary cursor-pointer"
                          aria-label={`Set start time for match ${index + 1}`}
                        />
                      </label>
                    )}
                    {!isAlreadyScheduled && !viewOnly && (
                      <button
                        onClick={() => handleRemoveFixture(match.id)}
                        className="text-[var(--color-muted)] hover:text-red-500 transition-colors p-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl shrink-0"
                        title="Remove Match"
                      >
                        <TrashIcon size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className={`border-2 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 transition-all min-h-[110px] ${
                    match.state === "empty"
                      ? "bg-[var(--color-surface)] border-dashed border-[var(--color-border)] hover:border-primary/50"
                      : "bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm"
                  } ${selectedSlot?.matchId === match.id ? "border-primary ring-2 ring-primary/10" : ""}`}
                >
                  <div className="flex gap-4 items-center w-full justify-center">
                    {/* Team A Slot */}
                    <button
                      onClick={() =>
                        !isAlreadyScheduled && !viewOnly &&
                        handleSlotClick(match.id, "teamA", match.teamA)
                      }
                      disabled={isAlreadyScheduled || viewOnly}
                      className="relative group/slot"
                    >
                      <TeamLogo
                        team={match.teamA}
                        size="lg"
                        isSelected={
                          selectedSlot?.matchId === match.id &&
                          selectedSlot?.position === "teamA"
                        }
                      />
                      {match.teamA && !isAlreadyScheduled && !viewOnly && (
                        <div className="absolute inset-0 bg-red-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity backdrop-blur-sm">
                          <XIcon size={16} />
                        </div>
                      )}
                    </button>

                    <div className="flex flex-col items-center gap-1">
                      <div className="text-[10px] font-black text-[var(--color-muted)] uppercase tracking-tighter">
                        VS
                      </div>
                      <div className="h-4 w-px bg-[var(--color-border)]" />
                    </div>

                    {/* Team B Slot */}
                    <button
                      onClick={() =>
                        !isAlreadyScheduled && !viewOnly &&
                        handleSlotClick(match.id, "teamB", match.teamB)
                      }
                      disabled={isAlreadyScheduled || viewOnly}
                      className="relative group/slot"
                    >
                      <TeamLogo
                        team={match.teamB}
                        size="lg"
                        isSelected={
                          selectedSlot?.matchId === match.id &&
                          selectedSlot?.position === "teamB"
                        }
                      />
                      {match.teamB && !isAlreadyScheduled && !viewOnly && (
                        <div className="absolute inset-0 bg-red-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity backdrop-blur-sm">
                          <XIcon size={16} />
                        </div>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col items-center">
                    <p className="text-[11px] font-bold text-[var(--color-text)] text-center px-4 line-clamp-1">
                      {match.teamA ? getTeamName(match.teamA) : "Empty"} vs{" "}
                      {match.teamB ? getTeamName(match.teamB) : "Empty"}
                    </p>
                    {selectedSlot?.matchId === match.id && (
                      <span className="text-[10px] font-bold text-primary animate-pulse mt-1">
                        Select a team from the list above ↑
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {!isAlreadyScheduled && !viewOnly && (
              <button
                onClick={handleAddFixture}
                className="w-full mt-4 py-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-primary hover:bg-primary/5 font-bold text-sm transition-all flex items-center justify-center gap-2 group"
              >
                <PlusIcon
                  size={18}
                  className="group-hover:scale-110 transition-transform"
                />{" "}
                Add Manual Match
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6. Publish Fixtures Button */}
      {!isAlreadyScheduled && !viewOnly && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handlePublishClick}
              className="w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              style={{ background: "var(--gradient-orange)" }}
            >
              Publish Fixtures
            </button>
          </div>
        </div>
      )}

      {/* 7. Bye Confirmation Modal */}
      {showByeModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200"
            onClick={() => setShowByeModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[var(--color-surface)] rounded-3xl shadow-2xl z-50 p-6 animate-in zoom-in-95 duration-200 border border-[var(--color-border)]">
            <div className="w-12 h-12 bg-orange-100 dark:bg-[#60394a] rounded-full flex items-center justify-center mb-5 border-4 border-white dark:border-[var(--color-surface)] shadow-sm -mt-10 mx-auto">
              <TrophyIcon
                size={20}
                className="text-orange-600 dark:text-orange-500"
              />
            </div>

            <h3 className="text-center font-black text-lg text-[var(--color-text)] tracking-tight uppercase mb-2">
              Confirm Byes
            </h3>

            <p className="text-center text-[var(--color-text)] font-medium text-sm mb-4">
              The following{" "}
              <span className="font-bold text-orange-500">
                {unassigned.length} teams
              </span>{" "}
              will receive a bye and advance to the next round.
            </p>

            <div className="bg-[var(--color-surface-elevated)] rounded-xl p-3 mb-6 border border-[var(--color-border)] max-h-32 overflow-y-auto space-y-1.5">
              {unassigned.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckIcon size={10} className="text-green-600" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-text)] truncate">
                    {getTeamName(t)}
                  </span>
                </div>
              ))}
              {unassigned.length === 0 && (
                <p className="text-[11px] text-[var(--color-muted)] text-center">
                  No teams receiving byes.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-md hover:bg-orange-600 transition-colors flex justify-center items-center gap-2"
              >
                {isPublishing ? "Publishing..." : "Confirm & Create Matches"}
              </button>
              <button
                onClick={() => setShowByeModal(false)}
                className="w-full py-3 rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-text)] font-bold text-sm hover:bg-[var(--color-border)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function FixtureSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      }
    >
      <FixtureSetupContent />
    </Suspense>
  );
}
