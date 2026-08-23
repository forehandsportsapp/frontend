"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
  EllipsisIcon,
  RotateCcwIcon,
  TrashIcon,
} from "@/components/Icons";
import { toQuery } from "@/lib/utils";
import { teamApi } from "@/lib/api/teamApi";
import { eventApi } from "@/lib/api/eventApi";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { EventData } from "@/lib/models";
import TeamLogo from "@/components/TeamLogo";

type FilterTab = "all" | "pending" | "confirmed" | "rejected";

function EventParticipantsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tournamentId = searchParams.get("tournamentId") || "";
  const eventId = searchParams.get("eventId") || "";
  const detailPath = pathname.startsWith("/user/manage/")
    ? "/user/manage/tournament/detail"
    : "/org/tournaments/detail";

  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuTeamId, setOpenMenuTeamId] = useState<string | null>(null);
  const [rowAction, setRowAction] = useState<{
    teamId: string;
    action: "participating" | "rejected" | "created" | "remove";
  } | null>(null);

  // Track which team is in "confirming" state and for what decision
  const [confirming, setConfirming] = useState<{
    teamId: string;
    decision: "participating" | "rejected";
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

        setEvent(eventResult.event as EventData | null);
        const scopedTeams = Array.isArray(teamsData)
          ? teamsData.filter(
              (team: any) =>
                String(team?.eventId || team?.event?.id || "") === eventId,
            )
          : [];
        setTeams(scopedTeams);
      } catch (error) {
        console.error("Failed to load participants data", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [eventId, tournamentId]);
  const filtered = useMemo(() => {
    return teams.filter((t) => {
      const rawStatus = t.teamStatus || t.teamState || t.status || "";
      const status = String(rawStatus).toLowerCase();

      const matchesFilter =
        filter === "all" ||
        (filter === "pending" &&
          (status === "registered" ||
            status === "created" ||
            status === "pending")) ||
        (filter === "confirmed" &&
          (status === "participating" || status === "confirmed")) ||
        (filter === "rejected" && status === "rejected");

      const teamName =
        t.name ||
        t.participants?.map((p: any) => p.user?.name).join(" & ") ||
        "Unknown Team";

      const matchesSearch = teamName
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [teams, filter, search]);

  const pendingCount = teams.filter((t) => {
    const rawStatus = t.teamStatus || t.teamState || t.status || "";
    const s = String(rawStatus).toLowerCase();
    return s === "registered" || s === "created" || s === "pending";
  }).length;

  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleUpdateStatus = async (
    teamId: string,
    state: "participating" | "rejected" | "created",
  ) => {
    try {
      setRowAction({ teamId, action: state });
      setOpenMenuTeamId(null);
      await teamApi.updateTeamState(teamId, state);
      // Refresh local state
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, teamStatus: state, status: state } : t,
        ),
      );
      setConfirming(null);
    } catch (error) {
      console.error("Failed to update team status", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setRowAction(null);
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!confirm("Remove this player from the event?")) return;

    try {
      setRowAction({ teamId, action: "remove" });
      setOpenMenuTeamId(null);
      await teamApi.deleteTeam(teamId);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      if (confirming?.teamId === teamId) {
        setConfirming(null);
      }
    } catch (error) {
      console.error("Failed to remove player", error);
      alert("Failed to remove player. Please try again.");
    } finally {
      setRowAction(null);
    }
  };

  const handleProceed = async () => {
    const participatingTeamsCount = teams.filter((t) => {
      const rawStatus = t.teamStatus || t.teamState || t.status || "";
      const status = String(rawStatus).toLowerCase();
      return status === "participating" || status === "confirmed";
    }).length;

    if (participatingTeamsCount < 2) {
      const type =
        event?.teamType?.label?.toLowerCase().includes("double") ||
        event?.teamTypeCode?.toLowerCase().includes("double")
          ? "pairs"
          : "players";
      alert(
        `At least 2 ${type} are required so that we can finalize teams for the event.`,
      );
      return;
    }

    const pendingTeams = teams.filter((t) => {
      const rawStatus = t.teamStatus || t.teamState || t.status || "";
      const status = String(rawStatus).toLowerCase();
      return (
        status === "registered" || status === "created" || status === "pending"
      );
    });

    if (pendingTeams.length > 0) {
      if (
        !confirm(
          `There are ${pendingTeams.length} pending registrations. Finalizing will mark them all as rejected. Continue?`,
        )
      ) {
        return;
      }
    }

    try {
      setIsFinalizing(true);
      // 1. Finalize the current event (locks participants, sets round 1, handles statuses)
      await eventApi.finalizeParticipants(eventId);

      // 2. Sync tournament status (sets to in_progress if all events are ready)
      await tournamentApi.syncTournamentStatus(tournamentId);

      // 3. Redirect back to tournament detail
      router.push(`${detailPath}${toQuery({ t: tournamentId })}`);
    } catch (error) {
      console.error("Failed to finalize participants", error);
      alert("Failed to finalize participants. Please try again.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const isAlreadyFinalized =
    event?.eventState &&
    !["created", "registration_closed"].includes(event.eventState);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

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

  const getParticipantDetails = (t: any) => {
    if (t.participants?.length > 0) {
      const p = t.participants[0];
      return `${p.user?.gender || "Open"} • ${p.user?.dob ? new Date().getFullYear() - new Date(p.user.dob).getFullYear() : "N/A"} years`;
    }
    return "No details";
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-elevated)] transition-colors text-[var(--color-text)]"
        >
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-semibold text-[var(--color-text)] text-lg">
          Participant Confirmation
        </h1>
      </div>

      {/* Event Info */}
      <div className="bg-[var(--color-surface)] px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="font-bold text-base text-[var(--color-text)]">
          {event?.name || "Loading Event..."}
        </h2>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">
          {event?.teamType?.label || "Open"} |{" "}
          {event?.startDate
            ? new Date(event.startDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "TBA"}
        </p>
        <p className="text-xs text-orange-500 font-medium mt-1">
          {pendingCount} Registration Pending
        </p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 pb-28">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(["all", "pending", "confirmed", "rejected"] as FilterTab[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize whitespace-nowrap ${
                  filter === f
                    ? "bg-orange-500 text-white"
                    : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]"
                }`}
              >
                {f === "all"
                  ? "All"
                  : f === "confirmed"
                    ? "Confirmed"
                    : f === "pending"
                      ? "Pending"
                      : "Rejected"}
              </button>
            ),
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            type="text"
            placeholder="Search Participants by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Participants List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-sm text-[var(--color-muted)]">
              No participants found.
            </div>
          )}
          {filtered.map((t) => (
            <div
              key={t.id}
              className="relative bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)] shadow-sm"
            >
              <div className="flex items-center gap-3">
                {/* Team Logo */}
                <TeamLogo team={t} size="md" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--color-text)] truncate">
                    {getTeamName(t)}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {getParticipantDetails(t)}
                  </p>
                </div>

                {/* Actions based on status */}
                {(() => {
                  const rawStatus =
                    t.teamStatus || t.teamState || t.status || "";
                  const status = String(rawStatus).toLowerCase();
                  const isRowBusy = rowAction?.teamId === t.id;

                  if (
                    (status === "registered" ||
                      status === "created" ||
                      status === "pending") &&
                    !isAlreadyFinalized
                  ) {
                    return (
                      <div className="flex gap-2 shrink-0">
                        {confirming?.teamId === t.id ? (
                          <button
                            onClick={() => {
                              if (confirming && !isRowBusy) {
                                handleUpdateStatus(t.id, confirming.decision);
                              }
                            }}
                            disabled={isRowBusy}
                            className={`min-w-[112px] px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-80 flex items-center justify-center gap-1.5 ${
                              confirming?.decision === "participating"
                                ? "bg-green-600"
                                : "bg-red-600"
                            }`}
                          >
                            {isRowBusy ? (
                              <>
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                {rowAction?.action === "participating"
                                  ? "Accepting"
                                  : "Rejecting"}
                              </>
                            ) : (
                              <>
                                Confirm{" "}
                                {confirming?.decision === "participating"
                                  ? "Accept"
                                  : "Reject"}
                              </>
                            )}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                setConfirming({
                                  teamId: t.id,
                                  decision: "participating",
                                })
                              }
                              disabled={isRowBusy}
                              className="px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                setConfirming({
                                  teamId: t.id,
                                  decision: "rejected",
                                })
                              }
                              disabled={isRowBusy}
                              className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    );
                  }

                  if (status === "participating" || status === "confirmed") {
                    return (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                          {isRowBusy ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
                          ) : (
                            <CheckIcon size={12} />
                          )}{" "}
                          {rowAction?.action === "created"
                            ? "Updating"
                            : rowAction?.action === "remove"
                              ? "Removing"
                              : "Accepted"}
                        </div>
                        {!isAlreadyFinalized && (
                          <button
                            onClick={() =>
                              setOpenMenuTeamId((current) =>
                                current === t.id ? null : t.id,
                              )
                            }
                            disabled={isRowBusy}
                            className="text-[var(--color-muted)] p-1 rounded-full hover:bg-[var(--color-surface-elevated)] disabled:opacity-60"
                            aria-label={`More actions for ${getTeamName(t)}`}
                          >
                            <EllipsisIcon size={18} />
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (status === "rejected") {
                    return (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                          {isRowBusy ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-700 border-t-transparent" />
                          ) : (
                            <XIcon size={12} />
                          )}{" "}
                          {rowAction?.action === "created"
                            ? "Updating"
                            : rowAction?.action === "remove"
                              ? "Removing"
                              : "Rejected"}
                        </div>
                        {!isAlreadyFinalized && (
                          <button
                            onClick={() =>
                              setOpenMenuTeamId((current) =>
                                current === t.id ? null : t.id,
                              )
                            }
                            disabled={isRowBusy}
                            className="text-[var(--color-muted)] p-1 rounded-full hover:bg-[var(--color-surface-elevated)] disabled:opacity-60"
                            aria-label={`More actions for ${getTeamName(t)}`}
                          >
                            <EllipsisIcon size={18} />
                          </button>
                        )}
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>
              {openMenuTeamId === t.id && !isAlreadyFinalized && (
                <div className="absolute right-3 top-12 z-30 w-44 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
                  <button
                    onClick={() => handleUpdateStatus(t.id, "created")}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
                  >
                    <RotateCcwIcon size={14} />
                    Unconfirm user
                  </button>
                  <button
                    onClick={() => handleRemoveTeam(t.id)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-red-500 hover:bg-[var(--color-surface-elevated)]"
                  >
                    <TrashIcon size={14} />
                    Remove player
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      {!isAlreadyFinalized && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-40">
          <button
            onClick={handleProceed}
            disabled={isFinalizing}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center"
            style={{ background: "var(--gradient-orange)" }}
          >
            {isFinalizing ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              "Confirm and Finalize Participants"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function EventParticipantsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      }
    >
      <EventParticipantsContent />
    </Suspense>
  );
}
