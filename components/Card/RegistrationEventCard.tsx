"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  InfoIcon,
  CalendarIcon,
  TimerIcon,
  XIcon,
} from "@/components/Icons";
import { EventData, TeamData, ProfileData } from "@/lib/models";
import { teamApi } from "@/lib/api/teamApi";
import { inviteApi } from "@/lib/api/inviteApi";
import { userApi } from "@/lib/api/userApi";
import { getEventStatusMeta, isEventRegistrationOpen } from "@/lib/statusLabels";
import { useApp } from "@/components/AppProvider";
import {
  getCurrentAuthRedirect,
  saveAuthRedirect,
  withAuthRedirect,
} from "@/lib/authRedirect";
import { toQuery } from "@/lib/utils";

type EventStatus =
  | "joined"
  | "live"
  | "joined-live"
  | "waiting"
  | "ended"
  | "open"
  | "closed"
  | "scheduled";

const statusStyles: Record<EventStatus, string> = {
  joined: "bg-[#22C86A] text-white",
  live: "bg-[#269FF5] text-white",
  waiting: "bg-[#FF5058] text-white",
  ended: "bg-[#999999] text-white",
  "joined-live": "",
  open: "bg-[#22C86A] text-white",
  closed: "bg-[#FF5058] text-white",
  scheduled: "bg-[#269FF5] text-white",
};

const statusColors: Record<EventStatus, string> = {
  joined: "#22C86A",
  live: "#269FF5",
  waiting: "#FF5058",
  ended: "#999999",
  "joined-live": "#22C86A",
  open: "#22C86A",
  closed: "#FF5058",
  scheduled: "#269FF5",
};

function EventStatusTag({ status }: { status: EventStatus }) {
  if (status === "joined-live") {
    return (
      <div className="absolute right-0 top-0 flex overflow-hidden rounded-bl-xl text-[12px] font-bold text-white shadow-sm">
        <span className="bg-[#22C86A] px-4 py-1.5">Joined</span>
        <span className="bg-[#269FF5] px-4 py-1.5">Live</span>
      </div>
    );
  }

  const labels: Record<Exclude<EventStatus, "joined-live">, string> = {
    joined: "Joined",
    live: "Live",
    waiting: "In Waiting List",
    ended: "Event Ended",
    open: "Open",
    closed: "Closed",
    scheduled: "Scheduled",
  };

  return (
    <span
      className={`
        absolute right-0 top-0
        rounded-bl-xl
        px-4 py-1.5
        text-[12px] font-bold uppercase tracking-wider
        shadow-sm
        ${statusStyles[status]}
      `}
    >
      {labels[status]}
    </span>
  );
}

interface RegistrationEventCardProps {
  event: EventData;
  onAddedChange: (eventId: string, isAdded: boolean) => void;
  isInitiallyAdded?: boolean;
}

type LocalState =
  | "IDLE"
  | "LOADING"
  | "ADDING_PARTNER"
  | "INVITED"
  | "REJECTED"
  | "PAIRED"
  | "ADDED"
  | "REGISTERED"
  | "CLOSED"
  | "INELIGIBLE";

export default function RegistrationEventCard({
  event,
  onAddedChange,
  isInitiallyAdded = false,
}: RegistrationEventCardProps) {
  const router = useRouter();
  const { userProfile, session } = useApp();
  const [state, setState] = useState<LocalState>("LOADING");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerProfile, setPartnerProfile] =
    useState<Partial<ProfileData> | null>(null);
  const [error, setError] = useState("");

  const isRegistrationClosed = useMemo(() => {
    return !isEventRegistrationOpen(event.eventState, event.dueDate);
  }, [event.eventState, event.dueDate]);

  const isEligible = !event.gender || event.gender === userProfile?.gender;
  const isDoubles =
    event.teamTypeId === 2 ||
    event.teamTypeCode?.toLowerCase().includes("double") ||
    event.teamType?.label?.toLowerCase().includes("double") ||
    event.name?.toLowerCase().includes("double");
  const eventStatusMeta = getEventStatusMeta(event.eventState, event.dueDate);
  const useChampionPage =
    event.eventState === "completed" ||
    event.eventState === "round_over" ||
    Boolean(event.winnerId);
  const viewHref = useChampionPage
    ? `/user/tournaments/event/champion${toQuery({
        tournamentId: event.tournamentId,
        eventId: event.id || "",
      })}`
    : `/user/tournaments/event/matches${toQuery({
        tournamentId: event.tournamentId,
        eventId: event.id || "",
      })}`;

  const loadRegistrationState = useCallback(async () => {
    if (!event.id) {
      setHasLoaded(true);
      return;
    }
    if (!session?.user?.id) {
      setState("IDLE");
      setHasLoaded(true);
      return;
    }
    if (!userProfile) {
      setState("IDLE");
      setHasLoaded(true);
      return;
    }

    try {
      if (!hasLoaded) {
        setState("LOADING");
      } else {
        setIsBusy(true);
      }
      setError("");
      const myTeam = await teamApi.getMyTeam(event.id).catch(() => null);

      if (myTeam) {
        setTeam(myTeam);

        const status = (myTeam.teamStatus || myTeam.status)?.toLowerCase();
        // If the team is not in 'created' state, it means it's finalized (registered/participating)
        if (status && status !== "created") {
          setState("REGISTERED");
          return;
        }

        if (isRegistrationClosed) {
          setState("CLOSED");
          return;
        }

        if (isDoubles) {
          // Check for invites if team has only 1 participant
          const participantsCount = myTeam.participants?.length || 0;
          if (participantsCount === 1) {
            const invites = await inviteApi.getEventTeamInvites(event.id);
            // The invites are returned as { invite: {...}, receiver: {...} }
            const pendingInviteItem = invites?.find(
              (inv: any) => inv.invite?.inviteState === "pending",
            );
            const rejectedInviteItem = invites?.find(
              (inv: any) => inv.invite?.inviteState === "rejected",
            );

            if (pendingInviteItem) {
              const pendingInvite = pendingInviteItem.invite;
              setInvite(pendingInvite);
              setState("INVITED");

              // Use receiver info from the invite item if available
              if (pendingInviteItem.receiver) {
                setPartnerProfile(pendingInviteItem.receiver);
              } else {
                // Fallback to fetching by phone
                const phone =
                  pendingInvite.receiverPhone ||
                  pendingInvite.phone ||
                  (pendingInvite.receiver as any)?.phone;
                if (phone) {
                  userApi
                    .getUserProfileInfo(phone)
                    .then(setPartnerProfile)
                    .catch(console.error);
                }
              }
            } else if (rejectedInviteItem) {
              const rejectedInvite = rejectedInviteItem.invite;
              setInvite(rejectedInvite);
              setState("REJECTED");
              if (rejectedInviteItem.receiver) {
                setPartnerProfile(rejectedInviteItem.receiver);
              }
            } else {
              setState("ADDING_PARTNER");
            }
          } else if (participantsCount === 2) {
            // If it's already 'created' but has 2 people, check if it was already "confirmed" (Added)
            // For now, let's assume if it has 2 people it's either PAIRED or ADDED
            // We can use isInitiallyAdded to distinguish
            setState(isInitiallyAdded ? "ADDED" : "PAIRED");
          }
        } else {
          // Singles
          setState("ADDED");
          if (!isInitiallyAdded) {
            onAddedChange(event.id, true);
          }
        }
      } else {
        if (isRegistrationClosed) {
          setState("CLOSED");
          return;
        }

        if (!isEligible) {
          setState("INELIGIBLE");
        } else {
          setState("IDLE");
        }
      }
    } catch (err) {
      console.error("Failed to load registration state", err);
      setError("Failed to load state");
    } finally {
      setHasLoaded(true);
      setIsBusy(false);
    }
  }, [
    event.id,
    session?.user?.id,
    userProfile,
    isDoubles,
    isEligible,
    isInitiallyAdded,
    isRegistrationClosed,
    onAddedChange,
    hasLoaded,
  ]);

  useEffect(() => {
    loadRegistrationState();
  }, [loadRegistrationState]);

  const handleAdd = async () => {
    if (!event.id) return;
    if (isRegistrationClosed) {
      setError("Registration is closed for this event.");
      setState("CLOSED");
      return;
    }
    if (!session?.user?.id) {
      const nextPath = saveAuthRedirect(getCurrentAuthRedirect());
      router.push(withAuthRedirect("/login", nextPath));
      return;
    }
    if (!userProfile) {
      const nextPath = saveAuthRedirect(getCurrentAuthRedirect());
      router.push(withAuthRedirect("/register", nextPath));
      return;
    }

    try {
      setIsBusy(true);
      setError("");
      const existingTeam = await teamApi.getMyTeam(event.id).catch(() => null);
      if (existingTeam?.id) {
        setTeam(existingTeam);
        setError("");
        setState("REGISTERED");
        onAddedChange(event.id, true);
        return;
      }

      const result = await teamApi.createTeam({
        eventId: event.id,
        participantIds: [session.user.id],
      });

      const teamId = result.teamId || result.id || result;
      const newTeam = await teamApi.getTeamInfo(teamId);
      setTeam(newTeam);

      if (isDoubles) {
        setState("ADDING_PARTNER");
      } else {
        setState("ADDED");
        onAddedChange(event.id, true);
      }
    } catch (err) {
      console.error("Failed to create team", err);
      const message =
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "";
      if (message.toLowerCase().includes("already registered")) {
        await loadRegistrationState();
        return;
      }
      setError(message || "Failed to add event");
      setState("IDLE");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDiscard = async () => {
    if (!team?.id || !event.id || !session?.user?.id) return;

    try {
      setState("LOADING");
      // If there's an invite, delete it first
      const inviteId = invite?.id || invite?.inviteId;
      if (inviteId) {
        await inviteApi.deleteInvite(inviteId).catch(console.error);
      }

      // Use removeParticipant instead of deleteTeam because deleteTeam is Admin-only
      // If we are the only participant, the backend will delete the team.
      await teamApi.removeParticipant(team.id, session.user.id);

      setTeam(null);
      setInvite(null);
      setPartnerPhone("");
      setPartnerProfile(null);
      setState("IDLE");
      onAddedChange(event.id, false);
    } catch (err) {
      console.error("Failed to discard team", err);
      setError("Failed to discard");
      // Fallback: reload state
      loadRegistrationState();
    }
  };

  const handleSendInvite = async () => {
    if (!event.id || !team?.id || !partnerPhone) return;

    try {
      setState("LOADING");
      const result = await inviteApi.sendEventTeamInvite({
        phone: partnerPhone,
        eventId: event.id,
        teamId: team.id,
        eventDisplayName: event.name,
        inviterName: userProfile?.name || "A player",
      });
      setInvite(result);

      // Fetch partner profile
      try {
        const profile = await userApi.getUserProfileInfo(partnerPhone);
        setPartnerProfile(profile);
      } catch (err) {
        console.error("Failed to fetch partner profile", err);
      }

      setState("INVITED");
    } catch (err) {
      console.error("Failed to send invite", err);
      setError("Player does not exist.");
      setState("ADDING_PARTNER");
    }
  };

  const handleConfirmPair = () => {
    if (!event.id) return;
    setState("ADDED");
    onAddedChange(event.id, true);
  };

  const handleRemovePartner = async () => {
    if (!team?.id || !session?.user?.id) return;

    const inviteId = invite?.id || invite?.inviteId;
    if (inviteId) {
      try {
        setState("LOADING");
        await inviteApi.deleteInvite(inviteId);
        setInvite(null);
        setPartnerProfile(null);
        setState("ADDING_PARTNER");
      } catch (err) {
        console.error("Failed to remove invite", err);
      }
    } else {
      // If partner already joined, remove them from the team
      try {
        const partner = team?.participants?.find(
          (p: any) => p.userId !== session?.user?.id,
        );
        if (partner?.userId) {
          setState("LOADING");
          await teamApi.removeParticipant(team.id, partner.userId);
          // Reload state to refresh team participants and revert to ADDING_PARTNER
          loadRegistrationState();
        } else {
          // Fallback: discard team
          handleDiscard();
        }
      } catch (err) {
        console.error("Failed to remove partner", err);
      }
    }
  };

  const handleRetryAfterRejection = async () => {
    const inviteId = invite?.id || invite?.inviteId;
    if (inviteId) {
      try {
        setState("LOADING");
        await inviteApi.deleteInvite(inviteId);
        setInvite(null);
        setPartnerProfile(null);
        setState("ADDING_PARTNER");
      } catch (err) {
        console.error("Failed to delete rejected invite", err);
        setState("ADDING_PARTNER");
      }
    } else {
      setState("ADDING_PARTNER");
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "TBA";
    const date = new Date(value);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (state === "LOADING") {
    return (
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 animate-pulse h-40" />
    );
  }

  const isEnded = event.eventState === "completed" || event.eventState === "round_over";
  const isLive = event.eventState === "in_progress";
  const isJoined = state === "REGISTERED"; 
  const isWaitlisted = (team?.teamStatus || team?.status)?.toLowerCase() === "waitlist" || (team?.teamStatus || team?.status)?.toLowerCase() === "waiting";
  
  let currentStatus: EventStatus;
  if (isWaitlisted) {
    currentStatus = "waiting";
  } else if (isJoined && isLive) {
    currentStatus = "joined-live";
  } else if (isJoined) {
    currentStatus = "joined";
  } else if (isEnded) {
    currentStatus = "ended";
  } else if (isLive) {
    currentStatus = "live";
  } else if (isRegistrationClosed) {
    currentStatus = "closed";
  } else if (event.eventState === "scheduled") {
    currentStatus = "scheduled";
  } else {
    currentStatus = "open";
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/30 bg-[#563F70] p-4 shadow-lg transition-all">
      <EventStatusTag status={currentStatus} />
      
      <div className="flex items-start justify-between">
        <div className="pr-16">
          <h3 
            className="text-[20px] font-bold"
            style={{ color: statusColors[currentStatus] || "#ffffff" }}
          >
            {event.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {state === "INELIGIBLE" && (
              <span className="inline-flex rounded-full border border-red-300 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-100">
                {event.gender} only
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[max-content_max-content] sm:gap-x-6">
            <div className="flex items-start gap-2.5 text-[13px] text-white/70">
              <CalendarIcon size={14} className="mt-0.5 text-[#ff7a1a]" />
              <span className="leading-snug">Starts: {formatDate(event.startDate)}</span>
            </div>
            <div className="flex items-start gap-2.5 text-[13px] text-white/70">
              <TimerIcon size={14} className="mt-0.5 text-[#ff7a1a]" />
              <span className="leading-snug">Closes: {formatDate(event.dueDate)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-white/20 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p 
            className="text-[18px] font-bold"
            style={{ color: statusColors[currentStatus] || "#ffffff" }}
          >
            {event.amount === 0 ? (
              "Free Entry"
            ) : (
              <>
                <span className="currency-inr mr-0.5">&#8377;</span>
                {event.amount}
              </>
            )}
          </p>
          {event.amount > 0 && event.paymentMode && (
            <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
              {event.paymentMode.label}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={viewHref}
            style={{ 
              borderColor: statusColors[currentStatus],
              color: statusColors[currentStatus]
            }}
            className="inline-flex h-11 min-w-0 items-center justify-center rounded-full border-2 bg-white px-4 text-[16px] font-bold transition-all active:scale-95"
          >
            View
          </a>

          {(state === "ADDING_PARTNER" ||
            state === "INVITED" ||
            state === "PAIRED" ||
            state === "REJECTED") && (
            <button
              onClick={handleDiscard}
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border-2 border-red-500/50 px-4 text-[16px] font-bold text-red-500 transition-all active:scale-95"
            >
              Discard
            </button>
          )}

          {state === "IDLE" && !isRegistrationClosed && (
            <button
              onClick={handleAdd}
              disabled={isBusy}
              style={{ 
                backgroundColor: statusColors[currentStatus],
                borderColor: statusColors[currentStatus]
              }}
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border-2 px-4 text-[16px] font-bold text-white shadow-lg transition-all active:scale-95 disabled:cursor-wait disabled:opacity-70"
            >
              {isBusy ? "Registering..." : "Register"}
            </button>
          )}

          {state === "IDLE" && isRegistrationClosed && (
            <button
              disabled
              style={{
                borderColor: statusColors[currentStatus],
                color: statusColors[currentStatus]
              }}
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border-2 bg-transparent px-4 text-[16px] font-bold opacity-70 cursor-not-allowed"
            >
              Register
            </button>
          )}

          {state === "ADDED" && (
            <button
              onClick={() => {
                setState(isDoubles ? "PAIRED" : "IDLE");
                if (isDoubles) {
                  // Go back to managing team
                } else {
                  handleDiscard();
                }
              }}
              style={{ 
                backgroundColor: statusColors[currentStatus],
                borderColor: statusColors[currentStatus]
              }}
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border-2 px-4 text-[16px] font-bold text-white shadow-lg transition-all active:scale-95"
            >
              Added
            </button>
          )}

          {state === "REGISTERED" && (
            <button
              disabled
              style={{ 
                backgroundColor: statusColors[currentStatus],
                borderColor: statusColors[currentStatus]
              }}
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border-2 px-4 text-[16px] font-bold text-white cursor-default"
            >
              {(team?.teamStatus || team?.status)?.toLowerCase() ===
              "participating"
                ? "Participating"
                : "Registered"}
            </button>
          )}

          {state === "CLOSED" && (
            <button
              disabled
              style={{
                borderColor: statusColors[currentStatus],
                color: statusColors[currentStatus],
                backgroundColor: `${statusColors[currentStatus]}1A` // 10% opacity
              }}
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border-2 px-4 text-[16px] font-bold opacity-70 cursor-not-allowed"
            >
              Register
            </button>
          )}

          {state === "INELIGIBLE" && (
            <button
              disabled
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border-2 border-red-500/50 bg-red-500/10 px-4 text-[16px] font-bold text-red-500 cursor-not-allowed"
            >
              Ineligible
            </button>
          )}
        </div>
      </div>


      {isDoubles &&
        (state === "ADDING_PARTNER" ||
          state === "INVITED" ||
          state === "PAIRED" ||
          state === "REJECTED") && (
          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
            {state === "ADDING_PARTNER" && (
              <>
                <p className="text-[18px] font-bold text-[var(--color-text)]">
                  Add your partner
                </p>
                <input
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  placeholder="Enter partner's Phone No."
                  className="mt-3 h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 text-[15px] text-[var(--color-text)] outline-none focus:border-[#ff7a1a]/50"
                />
                <div className="mt-3 flex items-start gap-2 text-[12px] text-[var(--color-text-secondary)]">
                  <InfoIcon size={14} className="mt-0.5 text-[#ff7a1a]" />
                  <p>Your partner must be registered on the app to enroll.</p>
                </div>
                <button
                  onClick={handleSendInvite}
                  disabled={partnerPhone.length < 10}
                  className="mt-4 h-11 w-full rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[16px] font-bold text-[var(--color-text)] transition-all hover:bg-[var(--color-border)] active:scale-95 disabled:opacity-50"
                >
                  Send Invite
                </button>
              </>
            )}

            {state === "INVITED" && (
              <>
                <p className="text-[18px] font-bold text-[var(--color-text)]">
                  Invite Sent
                </p>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-[15px]">
                  <div className="flex items-center gap-3">
                    {partnerProfile?.profilePicUrl ? (
                      <img
                        src={partnerProfile.profilePicUrl}
                        alt={partnerProfile.name || "Partner"}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]" />
                    )}
                    <span className="font-medium">
                      {partnerProfile?.name ||
                        invite?.receiverName ||
                        partnerPhone}
                    </span>
                  </div>
                  <span className="rounded-lg bg-[#ff7a1a]/20 px-2.5 py-1 text-[11px] font-bold text-[#ff7a1a]">
                    Pending
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
                  <InfoIcon size={14} className="text-[#ff7a1a]" />
                  <p>
                    Waiting for your partner to accept. You can refresh to check
                    status.
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleRemovePartner}
                    className="flex-1 h-11 rounded-full border border-[var(--color-border)] text-[14px] font-bold"
                  >
                    Cancel Invite
                  </button>
                  <button
                    onClick={loadRegistrationState}
                    className="flex-1 h-11 rounded-full bg-[#ff7a1a] text-white text-[14px] font-bold"
                  >
                    Check Status
                  </button>
                </div>
              </>
            )}

            {state === "REJECTED" && (
              <>
                <p className="text-[18px] font-bold text-red-500">
                  Invite Rejected
                </p>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[15px]">
                  <div className="flex items-center gap-3">
                    {partnerProfile?.profilePicUrl ? (
                      <img
                        src={partnerProfile.profilePicUrl}
                        alt={partnerProfile.name || "Partner"}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]" />
                    )}
                    <span className="font-medium">
                      {partnerProfile?.name ||
                        invite?.receiverName ||
                        "Partner"}
                    </span>
                  </div>
                  <span className="rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-500">
                    Rejected
                  </span>
                </div>
                <p className="mt-3 text-[12px] text-red-500/80">
                  The user has rejected your invitation to join the team.
                </p>
                <button
                  onClick={handleRetryAfterRejection}
                  className="mt-4 h-11 w-full rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[16px] font-bold text-[var(--color-text)] transition-all hover:bg-[var(--color-border)] active:scale-95"
                >
                  Try Another Partner
                </button>
              </>
            )}

            {state === "PAIRED" && (
              <>
                <p className="text-[18px] font-bold text-[var(--color-text)]">
                  Pair Ready
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between rounded-xl bg-[var(--color-background)] p-3 border border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                      {userProfile?.profilePicUrl ? (
                        <img
                          src={userProfile.profilePicUrl}
                          alt={userProfile.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary" />
                      )}
                      <span className="font-medium">You</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[var(--color-background)] p-3 border border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const partner = team?.participants?.find(
                          (p: any) => p.userId !== session?.user?.id,
                        )?.user;
                        return (
                          <>
                            {partner?.profilePicUrl ? (
                              <img
                                src={partner.profilePicUrl}
                                alt={partner.name || "Partner"}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]" />
                            )}
                            <span className="font-medium">
                              {partner?.name || "Partner"}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <button
                      onClick={handleRemovePartner}
                      className="text-red-500"
                    >
                      <XIcon size={18} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleConfirmPair}
                  className="mt-4 h-11 w-full rounded-full bg-[#ff7a1a] text-[16px] font-bold text-white shadow-lg active:scale-95"
                >
                  Confirm & Add to Checkout
                </button>
              </>
            )}
          </div>
        )}

      {error && state !== "CLOSED" && (
        <p className="mt-3 text-[12px] text-red-500 font-medium">{error}</p>
      )}
    </section>
  );
}
