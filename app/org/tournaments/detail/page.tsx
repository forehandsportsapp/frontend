"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeftIcon,
  ShareIcon,
  EllipsisIcon,
  UsersIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  TrophyIcon,
  CheckIcon,
  ClipboardIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
  PlusIcon,
  CalendarIcon,
  CircleIcon,
  TimerIcon,
  XIcon,
} from "@/components/Icons";
import { toQuery } from "@/lib/utils";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { eventApi } from "@/lib/api/eventApi";
import {
  EventData,
  TournamentData,
  TournamentSummaryEventData,
} from "@/lib/models";
import { useApp } from "@/components/AppProvider";
import { inviteApi } from "@/lib/api/inviteApi";
import { notificationApi } from "@/lib/api/notificationApi";
import { sanitizeLogoUrl } from "@/lib/logo";
import { getTournamentStatusMeta } from "@/lib/statusLabels";

function formatDate(value?: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function genderLabel(gender?: string | null) {
  if (gender === "male") return "Men's";
  if (gender === "female") return "Women's";
  return "Open";
}

function isEventRegistrationOpen(
  event?: { eventState?: string | null; dueDate?: string | null } | null,
) {
  if (!event) return false;
  if (event.eventState === "registration_closed") return false;
  if (!event.dueDate) return true;

  const dueDate = new Date(event.dueDate);
  if (Number.isNaN(dueDate.getTime())) return true;

  dueDate.setHours(23, 59, 59, 999);
  return Date.now() <= dueDate.getTime();
}

// ==========================================
// 1. SHARED COMPONENTS & TOURNAMENT HEADER
// ==========================================
const TopAppBar = ({
  onShare,
  settingsHref,
  canManage,
}: {
  onShare: () => void;
  settingsHref: string;
  canManage: boolean;
}) => (
  <div className="flex items-center justify-between">
    <Link
      href="/org/tournaments"
      className="w-10 h-10 rounded-full bg-[var(--color-surface)] shadow-sm flex items-center justify-center text-[var(--color-text)] border border-[var(--color-border)]"
    >
      <ArrowLeftIcon size={20} />
    </Link>
    <div className="flex gap-3">
      <button
        onClick={onShare}
        className="w-10 h-10 rounded-full bg-[var(--color-surface)] shadow-sm flex items-center justify-center text-[var(--color-text)] border border-[var(--color-border)]"
        aria-label="Share"
      >
        <ShareIcon size={18} />
      </button>
      {canManage ? (
        <Link
          href={settingsHref}
          className="w-10 h-10 rounded-full bg-[var(--color-surface)] shadow-sm flex items-center justify-center text-[var(--color-text)] border border-[var(--color-border)]"
          aria-label="Tournament settings"
        >
          <EllipsisIcon size={20} />
        </Link>
      ) : (
        <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] shadow-sm flex items-center justify-center text-[var(--color-text-secondary)] border border-[var(--color-border)]">
          <EllipsisIcon size={20} />
        </div>
      )}
    </div>
  </div>
);

const ShareTournamentSheet = ({
  open,
  tournamentName,
  shareUrl,
  isCopied,
  onClose,
  onCopy,
}: {
  open: boolean;
  tournamentName: string;
  shareUrl: string;
  isCopied: boolean;
  onClose: () => void;
  onCopy: () => void;
}) => {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-[32px] border-t border-[var(--color-border)] bg-[var(--color-surface)] p-6 pb-[max(env(safe-area-inset-bottom),24px)] shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-tournament-title"
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="min-w-0">
            <h2
              id="share-tournament-title"
              className="text-[20px] font-bold text-[var(--color-text)]"
            >
              Share Tournament
            </h2>
            <p className="mt-1 truncate text-[13px] text-[var(--color-text-secondary)]">
              {tournamentName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-content-center rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
            aria-label="Close share sheet"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <QRCodeSVG
              value={shareUrl}
              size={196}
              bgColor="#ffffff"
              fgColor="#111111"
              level="M"
              includeMargin
            />
          </div>

          <p className="mt-4 w-full truncate rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-center text-[13px] font-medium text-[var(--color-text-secondary)]">
            {shareUrl}
          </p>

          <button
            onClick={onCopy}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#ff811f] px-5 text-[17px] font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
          >
            {isCopied ? <CheckIcon size={18} /> : <ClipboardIcon size={18} />}
            {isCopied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>
    </>
  );
};

const EventHeader = ({ tournament }: { tournament: TournamentData | null }) => {
  const safeLogoUrl = sanitizeLogoUrl(tournament?.logoUrl);
  const [imageFailed, setImageFailed] = useState(false);
  const showFallback = imageFailed || !safeLogoUrl;

  useEffect(() => {
    setImageFailed(false);
  }, [safeLogoUrl]);

  return (
    <div className="flex gap-3 items-center">
      <div className="w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden shrink-0">
        {!showFallback ? (
          <img
            src={safeLogoUrl || ""}
            alt="Tournament logo"
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <TrophyIcon size={24} className="text-[var(--color-muted)]" />
        )}
      </div>
      <div>
        <h1 className="font-semibold text-lg leading-tight text-[var(--color-text)]">
          {tournament?.name || "Tournament"}
        </h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">
          {tournament?.organization?.name || "Organization"}
        </p>
      </div>
    </div>
  );
};

const EventStats = ({
  tournament,
  onSync,
  canManage,
}: {
  tournament: TournamentData | null;
  onSync: () => void;
  canManage: boolean;
}) => {
  const scopedEvents = Array.isArray(tournament?.events)
    ? tournament.events.map((event: any) => ({
        ...event,
        teams: Array.isArray(event?.teams) ? event.teams : [],
      }))
    : [];
  const registeredCount =
    scopedEvents.reduce((total, event) => {
      const eventTeams = Array.isArray(event.teams) ? event.teams : [];
      return total + eventTeams.length;
    }, 0) ?? 0;

  const isRegistrationOpen = tournament?.tournamentState === "published";
  const statusMeta = getTournamentStatusMeta(tournament?.tournamentState);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!tournament?.id) return;
    try {
      setIsSyncing(true);
      await tournamentApi.syncTournamentStatus(tournament.id);
      onSync();
    } catch (error) {
      console.error("Failed to sync tournament status", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-[var(--color-surface)] p-4 flex gap-3 items-center shadow-sm border border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 shrink-0">
          <UsersIcon size={20} />
        </div>
        <div>
          <p className="text-lg font-semibold text-[var(--color-text)] leading-tight">
            {registeredCount}
          </p>
          <p className="text-sm text-[var(--color-muted)]">Registered</p>
        </div>
      </div>
      <div className="rounded-xl bg-[var(--color-surface)] p-4 shadow-sm border border-[var(--color-border)] flex flex-col justify-center">
        <div className="flex justify-between items-center mb-1">
          <p className="font-medium text-[var(--color-text)] text-sm">Status</p>
          {canManage ? (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="text-[10px] font-bold text-orange-500 uppercase tracking-wider hover:underline disabled:opacity-50"
            >
              {isSyncing ? "Syncing..." : "Sync"}
            </button>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Viewer
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold text-center flex-1 capitalize border ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
        </div>
      </div>
    </div>
  );
};

const PrimaryTabs = ({
  tabs,
  activeTab,
  setActiveTab,
}: {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => (
  <div className="flex justify-center my-2">
    <div className="flex gap-1 bg-[var(--color-surface-elevated)] p-1 rounded-full overflow-x-auto overflow-y-hidden no-scrollbar max-w-full items-center">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? "bg-orange-500 text-white shadow-sm" : "text-[var(--color-muted)] bg-transparent hover:text-[var(--color-text)]"}`}
        >
          {tab}
        </button>
      ))}
    </div>
  </div>
);

// ==========================================
// 2. TOURNAMENT LEVEL TABS (About, Events, Summary, Crew)
// ==========================================
const AboutTab = ({ tournament }: { tournament: TournamentData | null }) => {
  const venue = [
    tournament?.venueName,
    tournament?.venueAddress,
    tournament?.venueCity,
    tournament?.venueState,
    tournament?.venuePostalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="bg-[var(--color-surface)] rounded-xl p-4 space-y-4 shadow-sm border border-[var(--color-border)]">
        <h2 className="font-semibold text-[var(--color-text)]">Overview</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-surface-elevated)]">
            <p className="text-xs text-[var(--color-muted)] mb-1">Start Date</p>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {formatDate(tournament?.startDate)}
            </p>
          </div>
          <div className="border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-surface-elevated)]">
            <p className="text-xs text-[var(--color-muted)] mb-1">End Date</p>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {formatDate(tournament?.endDate)}
            </p>
          </div>
          <div className="border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-surface-elevated)] col-span-2 flex gap-3 items-start">
            <MapPinIcon
              size={18}
              className="text-[var(--color-muted)] shrink-0 mt-0.5"
            />
            <div>
              <p className="text-xs text-[var(--color-muted)] mb-1">Venue</p>
              <p className="text-sm font-medium text-[var(--color-text)] leading-snug">
                {venue || "Venue TBA"}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[var(--color-surface)] rounded-xl p-4 shadow-sm border border-[var(--color-border)] mt-4">
        <h2 className="font-semibold text-[var(--color-text)] mb-2">
          Description
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {tournament?.description || "No description added."}
        </p>
      </div>
      <div className="bg-[var(--color-surface)] rounded-xl p-4 space-y-4 shadow-sm border border-[var(--color-border)] mt-4">
        <h2 className="font-semibold text-[var(--color-text)]">
          Contact Information
        </h2>
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center overflow-hidden shrink-0 border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-secondary)]">
              {(tournament?.contactName || "C")[0].toUpperCase()}
            </div>
            <p className="font-medium text-[var(--color-text)]">
              {tournament?.contactName || "Contact person"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] ml-1">
            <PhoneIcon
              size={16}
              className="text-[var(--color-muted)] shrink-0"
            />
            <p>{tournament?.contactPhone || "No phone added"}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] ml-1">
            <MailIcon
              size={16}
              className="text-[var(--color-muted)] shrink-0"
            />
            <p>{tournament?.contactEmail || "No email added"}</p>
          </div>
        </div>
      </div>
    </>
  );
};

const StepRow = ({
  title,
  state,
  subtext,
  actionLabel,
  href,
  isLast = false,
}: any) => {
  const isCompleted = state === "completed";
  const isActive = state === "active";
  const isInactive = state === "inactive";

  const buttonClass = `px-3 py-1.5 rounded-full text-xs font-medium text-center transition-all inline-block ${isCompleted ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100" : isActive ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm" : "bg-[var(--color-surface-elevated)] text-[var(--color-muted)] cursor-not-allowed"}`;

  return (
    <div className="flex gap-3 relative">
      <div className="flex flex-col items-center w-5 shrink-0">
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center z-10 ${isCompleted ? "bg-green-500 text-white" : isActive ? "bg-orange-500 border-2 border-orange-500" : "bg-[var(--color-surface)] border-2 border-[var(--color-border)]"}`}
        >
          {isCompleted && <CheckIcon size={12} />}
        </div>
        {!isLast && (
          <div
            className={`w-px flex-1 my-1 border-l-2 ${isCompleted ? "border-green-500" : "border-dashed border-[var(--color-border)]"}`}
          />
        )}
      </div>
      <div className="flex justify-between w-full items-center pb-5 -mt-0.5">
        <div>
          <p
            className={`font-medium text-sm ${isInactive ? "text-[var(--color-muted)]" : "text-[var(--color-text)]"}`}
          >
            {title}
          </p>
          {subtext && (
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              {subtext}
            </p>
          )}
        </div>
        {isInactive || !href ? (
          <button disabled className={buttonClass}>
            {isCompleted
              ? "View"
              : isActive
                ? actionLabel || "Manage"
                : "Not Started"}
          </button>
        ) : (
          <Link href={href} className={buttonClass}>
            {isCompleted
              ? "View"
              : isActive
                ? actionLabel || "Manage"
                : "Not Started"}
          </Link>
        )}
      </div>
    </div>
  );
};

const getQuickAction = (state: string): string => {
  switch (state) {
    case "created":
      return "Open registration to start accepting participants.";
    case "registration_closed":
      return "Finalize your participant list to proceed.";
    case "participants_finalized":
      return "Set up fixtures to define the bracket.";
    case "scheduled":
      return "Matches are scheduled. Start when ready.";
    case "in_progress":
      return "Now, you can manage your matches.";
    case "round_over":
      return "A round is complete. Begin the next round.";
    case "completed":
      return "Event is complete. View the champion.";
    case "cancelled":
      return "This event has been cancelled.";
    default:
      return "Manage your event progress below.";
  }
};

const getWorkflowSteps = (event: EventData, tournamentId: string) => {
  const eventId = event.id || "";
  const participantCount = Array.isArray(event.teams) ? event.teams.length : 0;
  const state = event.eventState || "created";

  const participantsHref = `/org/tournaments/event/participants${toQuery({ tournamentId, eventId })}`;
  const fixtureHref = `/org/tournaments/event/fixture${toQuery({ tournamentId, eventId })}`;
  const matchesHref = `/org/tournaments/event/matches${toQuery({ tournamentId, eventId })}`;
  const championHref = `/org/tournaments/event/champion${toQuery({ tournamentId, eventId })}`;

  const steps = [
    {
      title: "Participants",
      state: "inactive",
      subtext:
        participantCount > 0
          ? `${participantCount} Participants Playing`
          : undefined,
      actionLabel: "View Participants",
      href: participantsHref,
      isLast: false,
    },
    {
      title: "Fixtures",
      state: "inactive",
      subtext: undefined as string | undefined,
      actionLabel: "Assign Players",
      href: fixtureHref,
      isLast: false,
    },
    {
      title: "Matches",
      state: "inactive",
      subtext: undefined as string | undefined,
      actionLabel: "Manage Matches",
      href: matchesHref,
      isLast: false,
    },
    {
      title: "Results",
      state: "inactive",
      subtext: undefined as string | undefined,
      actionLabel: "View Champion",
      href: championHref,
      isLast: true,
    },
  ];

  if (state === "cancelled") return steps;

  // Participants step
  if (state === "created" || state === "registration_closed") {
    steps[0].state = "active";
    steps[0].actionLabel =
      state === "registration_closed" ? "Finalize" : "Manage Participants";
  } else {
    steps[0].state = "completed";
    steps[0].actionLabel = "View Participants";
  }

  // Fixtures step
  if (state === "participants_finalized") {
    steps[1].state = "active";
    steps[1].actionLabel = "Assign Players";
    steps[1].subtext = "Best of 3, Round of 64";
  } else if (
    ["scheduled", "in_progress", "round_over", "completed"].includes(state)
  ) {
    steps[1].state = "completed";
    steps[1].actionLabel = "View Fixtures";
    steps[1].subtext = "Best of 3, Round of 64";
  }

  // Matches step
  if (state === "scheduled") {
    steps[2].state = "active";
    steps[2].actionLabel = "Start Matches";
  } else if (state === "in_progress" || state === "round_over") {
    steps[2].state = "active";
    steps[2].actionLabel =
      state === "round_over" ? "Next Round" : "Manage Matches";
  } else if (state === "completed") {
    steps[2].state = "completed";
    steps[2].actionLabel = "View Matches";
  }

  // Results step
  if (state === "completed") {
    steps[3].state = "completed";
    steps[3].actionLabel = "View Champion";
  }

  return steps;
};

// Extend Due Date Modal
const ExtendDueDateModal = ({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (date: string) => Promise<void>;
}) => {
  const [selected, setSelected] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[calc(100dvh-1rem)] overflow-y-auto bg-[var(--color-surface)] rounded-t-3xl p-6 pb-[max(env(safe-area-inset-bottom),24px)] shadow-2xl border-t border-[var(--color-border)] animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-base text-[var(--color-text)]">
            Extend Due Date
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <XIcon size={16} />
          </button>
        </div>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Select a new registration due date for this event.
        </p>
        <label className="block mb-5">
          <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider block mb-2">
            New Due Date
          </span>
          <div className="relative">
            <CalendarIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none"
            />
            <input
              type="date"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>
        </label>
        <button
          onClick={async () => {
            if (selected) {
              try {
                setIsSaving(true);
                await onSave(selected);
                setSelected("");
                onClose();
              } finally {
                setIsSaving(false);
              }
            }
          }}
          disabled={!selected || isSaving}
          className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          style={{
            background: selected ? "var(--gradient-orange)" : undefined,
            backgroundColor: !selected ? "#ccc" : undefined,
          }}
        >
          {isSaving ? "Saving..." : "Confirm New Date"}
        </button>
      </div>
    </>
  );
};

const EventsTab = ({
  tournamentId,
  events,
  onRefresh,
}: {
  tournamentId: string;
  events: EventData[];
  onRefresh: () => void;
}) => {
  const [activeFilter, setActiveFilter] = useState("All");
  const filters = ["All", "Upcoming", "Past", "Ongoing"];
  const [extendModalEventId, setExtendModalEventId] = useState<string | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleExtendDueDate = async (date: string) => {
    if (!extendModalEventId) return;
    try {
      setIsUpdating(extendModalEventId);
      await eventApi.updateEventDueDate(extendModalEventId, date);
      onRefresh();
    } catch (error) {
      console.error("Failed to extend due date", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update due date. Please try again.",
      );
      throw error;
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCloseRegistration = async (eventId: string) => {
    try {
      setIsUpdating(eventId);
      await eventApi.updateEventState(eventId, "registration_closed");
      onRefresh();
    } catch (error) {
      console.error("Failed to close registration", error);
      alert("Failed to close registration. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="space-y-4">
      <ExtendDueDateModal
        open={extendModalEventId !== null}
        onClose={() => setExtendModalEventId(null)}
        onSave={handleExtendDueDate}
      />
      <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeFilter === filter ? "bg-orange-500 text-white" : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      {events.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-xl p-6 shadow-sm border border-[var(--color-border)] text-center text-sm text-[var(--color-muted)]">
          No events found for this tournament.
        </div>
      ) : (
        events.map((event, index) => {
          const eventId = event.id || String(index + 1);
          const state = event.eventState || "created";
          const isCancelled = state === "cancelled";
          const steps = getWorkflowSteps(event, tournamentId);
          const quickAction = getQuickAction(state);

          const badgeClass = isCancelled
            ? "bg-red-100 text-red-700"
            : state === "completed"
              ? "bg-green-100 text-green-700"
              : state === "in_progress" || state === "round_over"
                ? "bg-orange-100 text-orange-700"
                : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]";

          return (
            <div
              key={eventId}
              className="bg-[var(--color-surface)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-semibold text-[var(--color-text)] leading-tight">
                    {event.name || `Event ${index + 1}`}
                  </h3>
                  <p className="text-sm text-[var(--color-muted)] mt-0.5">
                    {[
                      genderLabel(event.gender),
                      event.sportsOption?.label || event.sportsOption?.code,
                      formatDate(event.startDate),
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                </div>
                <button className="text-[var(--color-muted)] shrink-0">
                  <EllipsisIcon size={20} />
                </button>
              </div>

              {/* Actions row */}
              <div className="flex justify-between items-center mt-3 mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setExtendModalEventId(eventId)}
                    className="border border-[var(--color-border)] px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] transition-colors flex items-center gap-1.5"
                  >
                    <CalendarIcon size={14} />
                    Extend
                  </button>
                  {state === "created" && (
                    <button
                      onClick={() => handleCloseRegistration(eventId)}
                      disabled={isUpdating === eventId}
                      className="border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-lg text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <TimerIcon size={14} />
                      {isUpdating === eventId ? "Closing..." : "Close Reg."}
                    </button>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide capitalize ${badgeClass}`}
                >
                  {state.replace(/_/g, " ")}
                </span>
              </div>

              {/* Quick Action Banner */}
              {!isCancelled && (
                <div className="mb-4 border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 rounded-xl p-3 flex gap-2 items-start">
                  <CalendarIcon
                    size={16}
                    className="text-orange-500 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-0.5">
                      Quick Action:
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      {quickAction}
                    </p>
                  </div>
                </div>
              )}

              {/* Steps */}
              <div>
                <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-3">
                  Steps
                </p>
                {steps.map((step, idx) => (
                  <StepRow
                    key={idx}
                    title={step.title}
                    state={step.state}
                    subtext={step.subtext}
                    actionLabel={step.actionLabel}
                    href={step.href}
                    isLast={step.isLast}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

const SummaryTab = ({ tournamentId }: { tournamentId: string }) => {
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const [summaryEvents, setSummaryEvents] = useState<TournamentSummaryEventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const toggleCard = (eventId: string) => {
    setExpandedById((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const getEventStatePill = (state?: string | null) => {
    switch (state) {
      case "created":
        return { label: "Draft", className: "bg-muted text-primary-contrast" };
      case "registration_closed":
        return { label: "Reg Closed", className: "bg-muted text-primary-contrast" };
      case "participants_finalized":
        return { label: "Finalized", className: "bg-success text-primary-contrast" };
      case "scheduled":
        return { label: "Scheduled", className: "bg-success text-primary-contrast" };
      case "in_progress":
        return { label: "Live", className: "bg-error text-primary-contrast" };
      case "round_over":
        return { label: "Round Over", className: "bg-success text-primary-contrast" };
      case "completed":
        return { label: "Completed", className: "bg-success text-primary-contrast" };
      case "cancelled":
        return { label: "Cancelled", className: "bg-muted text-primary-contrast" };
      default:
        return { label: "Draft", className: "bg-muted text-primary-contrast" };
    }
  };

  const buildSummaryFromInfo = (events: EventData[] = []): TournamentSummaryEventData[] =>
    events.map((event) => {
      const teams = Array.isArray(event.teams) ? event.teams : [];
      const totalTeams = teams.length;

      // Count teams that have paid/confirmed (participating or registered status).
      // Falls back to totalTeams when status is absent (older API responses).
      const confirmedTeams = teams.filter((t) => {
        const s = t?.status ?? t?.teamStatus;
        return s === "participating" || s === "registered";
      }).length;
      // If no team carries a status field, treat all teams as confirmed.
      const hasStatusInfo = teams.some((t) => t?.status != null || t?.teamStatus != null);
      const confirmedParticipants = hasStatusInfo ? confirmedTeams : totalTeams;

      // Enrolled = every team that registered (totalTeams), regardless of payment status.
      const enrolledParticipants = totalTeams;

      const amount = Number(event.amount ?? 0);
      const totalCollected = amount * confirmedParticipants;

      let stageText = isEventRegistrationOpen(event)
        ? "Registrations Open"
        : "Registration Closed";
      if (event.eventState === "registration_closed") stageText = "Registration Closed";
      if (event.eventState === "participants_finalized") stageText = "Participants Finalized";
      if (event.eventState === "scheduled") stageText = "Fixtures Scheduled";
      if (event.eventState === "in_progress") stageText = "Matches in Progress";
      if (event.eventState === "round_over") stageText = "Round Over";
      if (event.eventState === "completed") stageText = "Event Completed";
      if (event.eventState === "cancelled") stageText = "Event Cancelled";

      return {
        eventId: event.id || "",
        eventName: event.name || "Event",
        eventState: event.eventState,
        amount,
        totalCollected,
        totalTeams,
        enrolledParticipants,
        confirmedParticipants,
        totalMatches: 0,
        completedMatches: 0,
        liveMatches: 0,
        remainingMatches: 0,
        activeRound: event.activeRound,
        dueDate: event.dueDate,
        startDate: event.startDate,
        stageText,
      };
    });

  const loadSummary = async () => {
    if (!tournamentId || tournamentId === "dummy-system-1") {
      setSummaryEvents([]);
      setIsLoading(false);
      return;
    }

    try {
      setError("");
      const info = await tournamentApi.getInfo(tournamentId);
      setSummaryEvents(buildSummaryFromInfo(info?.events ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tournament summary");
      setSummaryEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    void loadSummary();

    const intervalId = window.setInterval(() => {
      void loadSummary();
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [tournamentId]);

  const cards = summaryEvents.map((event, index) => {
    const eventId = event.eventId || (event as any).id || `event-${index}`;
    const eventName = event.eventName || (event as any).name || `Event ${index + 1}`;
    const totalTeams = Number(event.totalTeams ?? (event as any).teams ?? 0);
    const remainingMatches = Number(
      event.remainingMatches ??
        Math.max((event.totalMatches ?? 0) - (event.completedMatches ?? 0), 0),
    );
    const enrolled = event.enrolledParticipants ?? 0;
    const confirmed = event.confirmedParticipants ?? 0;
    const totalMatches = event.totalMatches ?? 0;
    const completedMatches = event.completedMatches ?? 0;
    const liveMatches = event.liveMatches ?? 0;

    const contextText =
      event.eventState === "in_progress"
        ? `${liveMatches} live | ${completedMatches}/${totalMatches} completed`
        : isEventRegistrationOpen(event)
          ? `Closes ${formatDate(event.dueDate)}`
          : `Closed ${formatDate(event.dueDate)}`;

    const detailItems = [
      {
        id: `${eventId}-a`,
        tone: "warning",
        title: "Participants Registered",
        subtitle: `${enrolled} teams enrolled`,
        href: `/org/tournaments/event/participants${toQuery({
          tournamentId,
          eventId,
        })}`,
      },
      {
        id: `${eventId}-b`,
        tone: "warning",
        title: "Teams Confirmed",
        subtitle: `${confirmed} teams confirmed`,
        href: `/org/tournaments/event/fixture${toQuery({
          tournamentId,
          eventId,
        })}`,
      },
      {
        id: `${eventId}-c`,
        tone: "success",
        title: "Matches Completed",
        subtitle: `${completedMatches} of ${totalMatches} matches completed`,
        href: `/org/tournaments/event/matches${toQuery({
          tournamentId,
          eventId,
        })}`,
      },
      {
        id: `${eventId}-d`,
        tone: "warning",
        title: "Live / Remaining",
        subtitle: `${liveMatches} live | ${remainingMatches} remaining`,
        href: `/org/tournaments/event/matches${toQuery({
          tournamentId,
          eventId,
        })}`,
      },
    ];

    return {
      id: eventId,
      title: eventName,
      stageText: event.stageText || "Registrations Open",
      contextText,
      amount: Number(event.totalCollected || 0),
      enrolled,
      confirmed,
      detailItems,
      statePill: getEventStatePill(event.eventState),
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <h2 className="font-semibold text-lg text-[var(--color-text)]">{summaryEvents.length} Events</h2>
        <button className="flex items-center gap-1 text-xs font-medium text-orange-500">
          <FilterIcon size={16} /> Filter
        </button>
      </div>
      {isLoading ? <p className="text-sm text-[var(--color-muted)] px-1">Loading summary...</p> : null}
      {error ? <p className="text-sm text-red-500 px-1">{error}</p> : null}
      {!isLoading && !error && cards.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)] px-1">No event summary available yet.</p>
      ) : null}
      {cards.map((card) => {
        const isExpanded = Boolean(expandedById[card.id]);
        return (
          <div
            key={card.id}
            className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4"
          >
            <h3 className="font-bold text-[15px] text-[var(--color-text)]">{card.title}</h3>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              <span
                className={`px-2.5 py-1 text-[10px] leading-none rounded-full font-semibold ${card.statePill.className}`}
              >
                {card.statePill.label}
              </span>
              <span className="px-2.5 py-1 text-[10px] leading-none rounded-full font-semibold bg-success text-primary-contrast">
                Rs {card.amount} Collected
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1.5">
                <TimerIcon size={12} />
                <span>{card.stageText}</span>
              </div>
              <span>{card.contextText}</span>
            </div>
            <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
              <div className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
                <div className="pr-3">
                  <p className="text-[10px] text-[var(--color-muted)]">Enrolled</p>
                  <p className="text-3xl leading-none font-bold text-[var(--color-text)] mt-1">{card.enrolled}</p>
                </div>
                <div className="pl-3">
                  <p className="text-[10px] text-[var(--color-muted)]">Confirmed (Paid)</p>
                  <p className="text-3xl leading-none font-bold text-[var(--color-text)] mt-1">{card.confirmed}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleCard(card.id)}
              className="w-full mt-3 text-sm font-medium text-[var(--color-text-secondary)] flex items-center justify-center gap-1"
            >
              {isExpanded ? "View Less Details" : "View More Details"}
              <ChevronDownIcon
                size={14}
                className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
            {isExpanded && (
              <div className="mt-3 space-y-3">
                {card.detailItems.map((detail) => (
                  <Link
                    key={detail.id}
                    href={detail.href}
                    className="flex items-start justify-between hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-start gap-2.5">
                      <CircleIcon
                        size={8}
                        className={
                          detail.tone === "success"
                            ? "text-green-500 mt-2"
                            : "text-amber-500 mt-2"
                        }
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">{detail.title}</p>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">{detail.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRightIcon size={14} className="text-[var(--color-muted)] mt-1" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
type CrewRole = "admin" | "scorer";
type InviteStatus = "invite_sent" | "accepted" | "rejected" | "idle";

type CrewMember = {
  id: string;
  role: CrewRole;
  name: string;
  phone?: string;
  avatarUrl?: string | null;
  status: InviteStatus;
};

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(-10);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(-10);
  return digits.slice(-10);
}

const EventCrewTab = ({
  tournamentId,
  tournament,
}: {
  tournamentId: string;
  tournament: TournamentData | null;
}) => {
  const { activeOrganization } = useApp();
  const [activeRole, setActiveRole] = useState<CrewRole>("admin");
  const [phoneInput, setPhoneInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);

  useEffect(() => {
    let active = true;
    const loadCrew = async () => {
      try {
        console.log("[EventCrewTab] loading crew", { tournamentId });
        const list = await inviteApi.getTournamentCrew(tournamentId);
        if (!active) return;
        setCrewMembers(
          list.map((member) => ({
            id: member.id,
            role: member.role,
            name: member.name,
            phone: member.phone,
            avatarUrl: member.avatarUrl,
            status: member.status || "idle",
          })),
        );
        console.log("[EventCrewTab] crew loaded", { count: list.length, list });
      } catch {
        if (!active) return;
        console.error("[EventCrewTab] crew load failed");
        setCrewMembers([]);
      }
    };
    void loadCrew();
    return () => {
      active = false;
    };
  }, [tournamentId]);

  const displayedCrew = crewMembers.filter((m) => m.role === activeRole);
  const sectionTitle = activeRole === "admin" ? "Add Admin" : "Add Scorer";
  const phonePlaceholder =
    activeRole === "admin"
      ? "Enter Admin's Phone No."
      : "Enter Scorers Phone No.";

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId) {
      setFeedback(
        "Tournament id is missing. Re-open this tournament from list.",
      );
      return;
    }
    const cleanPhone = normalizePhone(phoneInput);
    console.log("[EventCrewTab] invite submit clicked", {
      activeRole,
      rawPhone: phoneInput,
      cleanPhone,
      tournamentId,
      organizationId:
        tournament?.organizationId || activeOrganization?.id || null,
    });
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFeedback("Enter a valid 10-digit Indian phone number.");
      console.warn("[EventCrewTab] invalid phone for invite", { cleanPhone });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback("");
      const inviteResult = await inviteApi.sendTournamentCrewInvite({
        phone: cleanPhone,
        role: activeRole,
        tournamentId,
        organizationId:
          tournament?.organizationId || activeOrganization?.id || undefined,
      });

      try {
        await notificationApi.sendInviteNotification({
          phone: cleanPhone,
          tournamentId: tournamentId,
          tournamentName: tournament?.name || "the tournament",
          role: activeRole,
        });
      } catch (err) {
        console.warn("Failed to send crew invite notification", err);
      }

      setCrewMembers((prev) => [
        {
          id: inviteResult.inviteId || `${activeRole}-${Date.now()}`,
          role: activeRole,
          name: inviteResult.receiverName || `+91 ${cleanPhone}`,
          phone: cleanPhone,
          avatarUrl: inviteResult.receiverProfilePicUrl || null,
          status: "invite_sent",
        },
        ...prev,
      ]);
      setPhoneInput("");
      setFeedback("Invite sent successfully.");
      console.log("[EventCrewTab] invite UI update success", { inviteResult });
    } catch (error) {
      console.error("[EventCrewTab] invite submit failed", error);
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to send invite right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMember = async (id: string) => {
    try {
      await inviteApi.removeTournamentCrewInvite(id, tournamentId);
      setCrewMembers((prev) => prev.filter((m) => m.id !== id));
      setFeedback("Crew member removed.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to remove crew member.",
      );
    }
  };

  const statusBadgeClass = (status: InviteStatus) => {
    if (status === "invite_sent") return "bg-amber-500 text-white";
    if (status === "accepted") return "bg-green-500 text-white";
    if (status === "rejected") return "bg-red-500 text-white";
    return "";
  };

  const statusLabel = (status: InviteStatus) => {
    if (status === "invite_sent") return "Invite Sent";
    if (status === "accepted") return "Accepted";
    if (status === "rejected") return "Rejected";
    return "";
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex items-center border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveRole("admin")}
          className={`w-1/2 py-3 text-center text-base font-semibold transition-colors border-b-2 ${activeRole === "admin" ? "text-orange-500 border-orange-500" : "text-[var(--color-muted)] border-transparent"}`}
        >
          Admins
        </button>
        <button
          onClick={() => setActiveRole("scorer")}
          className={`w-1/2 py-3 text-center text-base font-semibold transition-colors border-b-2 ${activeRole === "scorer" ? "text-orange-500 border-orange-500" : "text-[var(--color-muted)] border-transparent"}`}
        >
          Scorers
        </button>
      </div>

      <div className="p-4 space-y-4">
        <h3 className="text-2xl font-semibold text-[var(--color-text)]">
          {sectionTitle}
        </h3>
        <form onSubmit={handleInviteSubmit} className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="tel"
              inputMode="numeric"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder={phonePlaceholder}
              className="flex-1 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <PlusIcon size={18} />
            </button>
          </div>
          {feedback && (
            <p className="text-xs text-[var(--color-muted)] px-1">{feedback}</p>
          )}
        </form>

        <div className="space-y-3">
          {displayedCrew.map((member) => (
            <div
              key={member.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shrink-0">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-[var(--color-text-secondary)]">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-[var(--color-text)] truncate">
                  {member.name}
                </p>
                {member.status !== "idle" && (
                  <span
                    className={`px-2.5 h-6 inline-flex items-center rounded-full text-[11px] font-medium ${statusBadgeClass(member.status)}`}
                  >
                    {statusLabel(member.status)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void removeMember(member.id)}
                className="text-red-400 hover:text-red-500 p-1 rounded-md transition-colors"
                aria-label={`Remove ${member.name}`}
              >
                <TrashIcon size={14} />
              </button>
            </div>
          ))}
          {displayedCrew.length === 0 && (
            <p className="text-sm text-center text-[var(--color-muted)] py-5">
              No {activeRole === "admin" ? "admins" : "scorers"} yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. MAIN PAGE EXPORT
// ==========================================
export default function TournamentEventDetailsPage() {
  const { session, isLoading: isAuthLoading, activeOrganization } = useApp();
  const [searchParams, setSearchParams] = useState<URLSearchParams>(
    () => new URLSearchParams(),
  );
  const tournamentId = searchParams.get("t") || "";
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const primaryTabs = ["About", "Events", "Summary", "Event Crew"];
  const [activeTab, setActiveTab] = useState("About");
  const canManage = Boolean(
    tournament?.organizationId &&
      activeOrganization?.id &&
      activeOrganization.id === tournament.organizationId,
  );

  const shareUrl = React.useMemo(() => {
    const id = tournament?.id || tournamentId;
    if (!id || typeof window === "undefined") return "";
    return `${window.location.origin}/tournaments/detail${toQuery({ id })}`;
  }, [tournament?.id, tournamentId]);

  const loadTournamentData = async () => {
    if (isAuthLoading) return;
    try {
      setErrorMessage("");
      setIsLoading(true);
      let tournamentData: TournamentData | null = null;

      if (!tournamentId) {
        setErrorMessage("Tournament id is missing from the URL.");
        return;
      }

      if (tournamentId !== "dummy-system-1" && !session?.access_token) {
        setErrorMessage("Please sign in again to view tournament details.");
        return;
      }

      if (tournamentId === "dummy-system-1") {
        tournamentData = {
          id: "dummy-system-1",
          organizationId: "org-1",
          name: "System Dummy Tournament",
          description: "A dummy tournament showing various event states",
          startDate: new Date().toISOString(),
          venueName: "Dummy Arena",
          venueAddress: "123 Fake St",
          venueCity: "Mumbai",
          venueState: "MH",
          venuePostalCode: "400001",
          venueCourts: 4,
          contactName: "Admin",
          contactEmail: "admin@dummy.com",
          contactPhone: "9999999999",
          tournamentState: "in_progress",
          events: Array.from({ length: 8 }, (_, index) => {
            const names = [
              "U-17 Boys | Pickleball",
              "U-17 Girls | Pickleball",
              "Open Men | Pickleball",
              "Open Women | Pickleball",
              "Mixed Doubles | Pickleball",
              "U-15 Boys | Pickleball",
              "U-15 Girls | Pickleball",
              "Veterans 40+ | Pickleball",
            ];
            const stateByIndex: EventData["eventState"][] = [
              "created",
              "in_progress",
              "in_progress",
              "participants_finalized",
              "completed",
              "in_progress",
              "scheduled",
              "created",
            ];

            return {
              id: `dummy-${index + 1}`,
              tournamentId: "dummy-system-1",
              name: names[index],
              startDate: new Date().toISOString(),
              dueDate: new Date(
                Date.now() + (index + 1) * 86400000,
              ).toISOString(),
              pointsPerSet: 21,
              setsPerMatch: 3,
              amount: 3400 + index * 200,
              eventState: stateByIndex[index],
              teams: Array.from({ length: 3 + index }, () => ({})) as any,
            };
          }),
        };
      } else {
        tournamentData = await tournamentApi.getInfo(tournamentId);
      }

      setTournament(tournamentData ?? null);
    } catch (error) {
      console.error("Failed to load tournament", error);
      const message =
        error instanceof Error ? error.message : "Unable to load tournament.";
      const unauthorized =
        typeof message === "string" &&
        (message.includes("401") ||
          message.toLowerCase().includes("unauthorized"));
      setErrorMessage(
        unauthorized ? "Your session expired. Please sign in again." : message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
    void loadTournamentData();
  }, [tournamentId, session?.access_token, isAuthLoading]);

  // Retrieve the saved tab from sessionStorage on initial load
  useEffect(() => {
    const savedTab = sessionStorage.getItem(`tournament-tab-${tournamentId}`);
    if (savedTab && primaryTabs.includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, [tournamentId]);

  // Handle setting the state AND saving it to sessionStorage
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    sessionStorage.setItem(`tournament-tab-${tournamentId}`, tab);
  };

  const handleOpenShareSheet = () => {
    setIsCopied(false);
    setIsShareSheetOpen(true);
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = shareUrl;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch (error) {
      console.error("Failed to copy tournament link", error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] px-4 py-3 pb-[calc(10rem+env(safe-area-inset-bottom))] space-y-4">
      <TopAppBar
        onShare={handleOpenShareSheet}
        settingsHref={`/org/tournaments/settings${toQuery({ t: tournamentId })}`}
        canManage={canManage}
      />
      {isLoading && !tournament ? (
        <p className="text-center text-sm text-[var(--color-muted)] py-8">
          Loading tournament...
        </p>
      ) : errorMessage ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : (
        <>
          <EventHeader tournament={tournament} />
          <EventStats
            tournament={tournament}
            onSync={() => void loadTournamentData()}
            canManage={canManage}
          />

          {/* Pass our custom handler to PrimaryTabs */}
          <PrimaryTabs
            tabs={primaryTabs}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
          />

          <div className="space-y-4">
            {activeTab === "About" && <AboutTab tournament={tournament} />}
            {activeTab === "Events" && (
              <EventsTab
                tournamentId={tournamentId}
                events={tournament?.events ?? []}
                onRefresh={() => void loadTournamentData()}
              />
            )}
            {activeTab === "Summary" && (
              <SummaryTab tournamentId={tournamentId} />
            )}
            {activeTab === "Event Crew" && (
              <EventCrewTab
                tournamentId={tournamentId}
                tournament={tournament}
              />
            )}
          </div>
        </>
      )}
      <ShareTournamentSheet
        open={isShareSheetOpen}
        tournamentName={tournament?.name || "Tournament"}
        shareUrl={shareUrl}
        isCopied={isCopied}
        onClose={() => setIsShareSheetOpen(false)}
        onCopy={handleCopyShareLink}
      />
    </div>
  );
}
