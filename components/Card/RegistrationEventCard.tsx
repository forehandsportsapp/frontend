"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  TrashIcon,
  InfoIcon,
  CalendarIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
} from "@/components/Icons";
import { EventData, TeamData, TeamStatus, ProfileData } from "@/lib/models";
import { teamApi } from "@/lib/api/teamApi";
import { inviteApi } from "@/lib/api/inviteApi";
import { userApi } from "@/lib/api/userApi";
import { notificationApi } from "@/lib/api/notificationApi";
import { useApp } from "@/components/AppProvider";
import {
  getCurrentAuthRedirect,
  saveAuthRedirect,
  withAuthRedirect,
} from "@/lib/authRedirect";

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
  const [team, setTeam] = useState<TeamData | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerProfile, setPartnerProfile] =
    useState<Partial<ProfileData> | null>(null);
  const [error, setError] = useState("");

  const isRegistrationClosed = useMemo(() => {
    if (event.eventState === "registration_closed") return true;
    if (!event.dueDate) return false;

    const dueDate = new Date(event.dueDate);
    if (Number.isNaN(dueDate.getTime())) return false;

    dueDate.setHours(23, 59, 59, 999);
    return Date.now() > dueDate.getTime();
  }, [event.dueDate, event.eventState]);

  const isEligible = !event.gender || event.gender === userProfile?.gender;
  const isDoubles =
    event.teamTypeId === 2 ||
    event.teamTypeCode?.toLowerCase().includes("double") ||
    event.teamType?.label?.toLowerCase().includes("double") ||
    event.name?.toLowerCase().includes("double");

  const loadRegistrationState = useCallback(async () => {
    if (!event.id) return;
    if (!session?.user?.id) {
      setState("IDLE");
      return;
    }
    if (!userProfile) {
      setState("IDLE");
      return;
    }

    try {
      setState("LOADING");
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
          setError("Registration is closed for this event.");
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
          setError("Registration is closed for this event.");
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
      setState("LOADING");
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
      setError(message || "Failed to add event");
      setState("IDLE");
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

      // Send a direct notification for better UI feedback (with accept/reject buttons)
      try {
        await notificationApi.sendTeamInviteNotification({
          phone: partnerPhone,
          eventId: event.id,
          eventDisplayName: event.name,
          inviterName: userProfile?.name || "A player",
        });
      } catch (err) {
        console.warn("Failed to send teammate invite notification", err);
      }

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

  return (
    <section
      className={`rounded-3xl border p-5 shadow-lg transition-all ${
        state === "ADDED"
          ? "border-[#ff7a1a] bg-[#ff7a1a]/5"
          : state === "REGISTERED"
            ? "border-green-500 bg-green-500/5"
            : state === "CLOSED"
              ? "border-amber-500/30 bg-amber-500/5 opacity-90"
            : state === "INELIGIBLE"
              ? "border-red-500/20 bg-red-500/5 opacity-80"
              : "border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[20px] font-bold text-[var(--color-text)]">
            {event.name}
            {state === "REGISTERED" && (
              <span className="ml-2 text-[10px] uppercase tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                {(team?.teamStatus || team?.status)?.toLowerCase() ===
                "participating"
                  ? "Participating"
                  : "Registered"}
              </span>
            )}
            {state === "INELIGIBLE" && (
              <span className="ml-2 text-[10px] uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                {event.gender} only
              </span>
            )}
            {state === "CLOSED" && (
              <span className="ml-2 text-[10px] uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Closed
              </span>
            )}
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] opacity-60">
              <CalendarIcon size={14} className="text-[#ff7a1a]" />
              <span>Starts: {formatDate(event.startDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] opacity-60">
              <SearchIcon size={14} className="text-[#ff7a1a]" />
              <span>Closes: {formatDate(event.dueDate)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-5">
        <div>
          <p className="text-[24px] font-bold text-[#ff7a1a]">
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
            <p className="mt-1 text-[12px] font-medium text-[var(--color-text-secondary)] opacity-60 uppercase tracking-wider">
              {event.paymentMode.label}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {(state === "ADDING_PARTNER" ||
            state === "INVITED" ||
            state === "PAIRED" ||
            state === "REJECTED") && (
            <button
              onClick={handleDiscard}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-red-500/50 px-6 text-[16px] font-bold text-red-500 transition-all active:scale-95"
            >
              Discard
            </button>
          )}

          {state === "IDLE" && !isRegistrationClosed && (
            <button
              onClick={handleAdd}
              className="inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 text-[16px] font-bold text-[var(--color-text)] transition-all hover:border-gray-400 active:scale-95"
            >
              <PlusIcon size={14} /> Add
            </button>
          )}

          {state === "IDLE" && isRegistrationClosed && (
            <button
              disabled
              className="inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-full border-2 border-amber-500/40 bg-amber-500/10 px-6 text-[16px] font-bold text-amber-500 cursor-not-allowed"
            >
              Closed
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
              className="inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-full border-2 border-[#ff7a1a] bg-[#ff7a1a] text-white shadow-lg shadow-orange-500/20 px-6 text-[16px] font-bold transition-all active:scale-95"
            >
              Added
            </button>
          )}

          {state === "REGISTERED" && (
            <button
              disabled
              className="inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-full border-2 border-green-500 bg-green-500 text-white px-6 text-[16px] font-bold cursor-default"
            >
              {(team?.teamStatus || team?.status)?.toLowerCase() ===
              "participating"
                ? "Participating"
                : "Registered"}
            </button>
          )}

          {state === "INELIGIBLE" && (
            <button
              disabled
              className="inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-full border-2 border-red-500/50 text-red-500 bg-red-500/10 px-6 text-[16px] font-bold cursor-not-allowed"
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

      {error && (
        <p className="mt-3 text-[12px] text-red-500 font-medium">{error}</p>
      )}
    </section>
  );
}
