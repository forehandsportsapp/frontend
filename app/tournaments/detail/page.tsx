"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import TournamentHeroCard from "@/components/TournamentHeroCard";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardIcon,
  InfoIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  TimerIcon,
  TrashIcon,
  XIcon,
} from "@/components/Icons";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { teamApi } from "@/lib/api/teamApi";
import { TournamentData, EventData } from "@/lib/models";
import { toQuery } from "@/lib/utils";
import { useApp } from "@/components/AppProvider";
import RegistrationEventCard from "@/components/Card/RegistrationEventCard";
import { getEventStatusMeta } from "@/lib/statusLabels";

type MainTab = "about" | "events";

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

function formatDateTime(value?: string | null) {
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

function getTournamentLogoUrl(tournament: TournamentData) {
  const raw = tournament as any;
  return (
    tournament.logoUrl ||
    raw?.logoURL ||
    raw?.logo ||
    raw?.imageUrl ||
    raw?.image ||
    null
  );
}

function isEventRegistrationOpen(event?: EventData | null) {
  if (!event) return false;
  if (event.eventState === "registration_closed") return false;
  if (!event.dueDate) return true;

  const dueDate = new Date(event.dueDate);
  if (Number.isNaN(dueDate.getTime())) return true;

  dueDate.setHours(23, 59, 59, 999);
  return Date.now() <= dueDate.getTime();
}

function isEventEligibleForUser(event: EventData, userGender?: string | null) {
  const eventGender = event.gender?.toLowerCase();
  const normalizedUserGender = userGender?.toLowerCase();
  if (!eventGender) return true;
  if (!normalizedUserGender) return true;
  return eventGender === normalizedUserGender;
}

function isEventRegisteredByUser(event: EventData, userId?: string | null) {
  if (!userId || !Array.isArray(event.teams)) return false;
  return event.teams.some((team) => {
    const state = (team.teamStatus || team.status || "").toLowerCase();
    const hasUser = Array.isArray(team.participants)
      ? team.participants.some((p) => p.userId === userId)
      : false;
    return hasUser && state !== "created";
  });
}

function isEventViewable(event?: EventData | null) {
  return [
    "participants_finalized",
    "scheduled",
    "in_progress",
    "round_over",
    "completed",
  ].includes(event?.eventState || "");
}

function getEventDashboardTab(event?: EventData | null) {
  return "fixtures";
}

function shouldShowChampionPage(event?: EventData | null) {
  return Boolean(
    event &&
      (event.eventState === "completed" ||
        event.eventState === "round_over" ||
        event.winnerId),
  );
}

function getEventDashboardHref(
  tournamentId: string,
  eventId: string,
  event?: EventData | null,
) {
  return shouldShowChampionPage(event)
    ? `/org/tournaments/event/champion${toQuery({
        tournamentId,
        eventId,
        viewOnly: "1",
      })}`
    : `/org/tournaments/event/matches${toQuery({
        tournamentId,
        eventId,
        viewOnly: "1",
      })}`;
}

function EventAccessCard({
  event,
  tournamentId,
}: {
  event: EventData;
  tournamentId: string;
}) {
  const eventId = event.id || "";
  const href = getEventDashboardHref(tournamentId, eventId, event);
  const statusMeta = getEventStatusMeta(event.eventState, event.dueDate);

  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-lg transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[20px] font-bold text-[var(--color-text)]">
            {event.name}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[13px] text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2 opacity-70">
          <CalendarIcon size={14} className="text-[#ff7a1a]" />
          <span>
            Starts:{" "}
            {event.startDate
              ? new Date(event.startDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "TBA"}
          </span>
        </div>
        <div className="flex items-center gap-2 justify-self-end text-right opacity-70">
          <SearchIcon size={14} className="text-[#ff7a1a]" />
          <span>
            Closes:{" "}
            {event.dueDate
              ? new Date(event.dueDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "TBA"}
          </span>
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
          {event.paymentMode?.label && (
            <p className="mt-1 text-[12px] font-medium text-[var(--color-text-secondary)] opacity-60 uppercase tracking-wider">
              {event.paymentMode.label}
            </p>
          )}
        </div>

        <Link
          href={href}
          className="inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-full bg-[#ff7a1a] px-6 text-[16px] font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95"
        >
          View
        </Link>
      </div>
    </div>
  );
}

function TournamentDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, session } = useApp();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const safeBackHref = "/user/tournaments";

  const id = searchParams.get("id");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const shareUrl = useMemo(() => {
    if (!id || typeof window === "undefined") return "";
    return `${window.location.origin}/tournaments/detail${toQuery({ id })}`;
  }, [id]);

  useEffect(() => {
    const sel = searchParams.get("selected")?.split(",") || [];
    const obj: Record<string, boolean> = {};
    sel.forEach((sid) => {
      if (sid) obj[sid] = true;
    });
    setSelected(obj);
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;

    let active = true;
    const loadInfo = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await tournamentApi.getInfo(id);
        const eventTeams = await Promise.all(
          (data?.events ?? []).map(async (event) => {
            if (!event?.id) return [];
            try {
              const teams = await teamApi.getTeamsByEvent(event.id);
              return Array.isArray(teams) ? teams : [];
            } catch (err) {
              console.error("Failed to load teams for event", event.id, err);
              return [];
            }
          }),
        );
        if (active) {
          setTournament({
            ...data,
            events: (data?.events ?? []).map((event, index) => ({
              ...event,
              teams: eventTeams[index] ?? [],
            })),
          });
        }
      } catch (err) {
        console.error("Failed to load tournament info", err);
        if (active) setError("Failed to load tournament details.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadInfo();
    return () => {
      active = false;
    };
  }, [id]);

  const [tab, setTab] = useState<MainTab>("about");

  const sortedEvents = useMemo(() => {
    const events = tournament?.events || [];
    const userId = session?.user?.id;
    const userGender = userProfile?.gender;

    return [...events].sort((a, b) => {
      const aRegistered = isEventRegisteredByUser(a, userId);
      const bRegistered = isEventRegisteredByUser(b, userId);
      if (aRegistered !== bRegistered) return aRegistered ? -1 : 1;

      const aEligible = isEventEligibleForUser(a, userGender);
      const bEligible = isEventEligibleForUser(b, userGender);
      if (aEligible !== bEligible) return aEligible ? -1 : 1;

      return (a.name || "").localeCompare(b.name || "");
    });
  }, [tournament?.events, session?.user?.id, userProfile?.gender]);

  const total = useMemo(() => {
    if (!tournament?.events) return 0;
    return tournament.events
      .filter((ev) => ev.id && selected[ev.id])
      .reduce((sum, ev) => sum + (ev.amount ?? 0), 0);
  }, [selected, tournament]);

  const registeredCount = useMemo(() => {
    if (!tournament?.events) return 0;
    return tournament.events.reduce(
      (total, event) =>
        total + (Array.isArray(event.teams) ? event.teams.length : 0),
      0,
    );
  }, [tournament]);

  const isRegistrationOpen = useMemo(() => {
    const events = tournament?.events ?? [];
    return events.some((event) => isEventRegistrationOpen(event));
  }, [tournament?.events]);

  const handleAddedChange = (eventId: string, isAdded: boolean) => {
    setSelected((prev) => ({ ...prev, [eventId]: isAdded }));
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
    } catch (err) {
      console.error("Failed to copy tournament link", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-background)] p-4 text-center">
        <p className="text-[var(--color-error)]">
          {error || "Tournament not found"}
        </p>
        <button
          onClick={() => router.push(safeBackHref)}
          className="mt-4 rounded-full bg-primary px-6 py-2 font-semibold text-white"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-24 text-[var(--color-text)]">
      <div>
        <TournamentHeroCard
          title={tournament.name}
          subtitle={tournament.organization?.name || "Organizer"}
          registeredCount={registeredCount}
          registrationStatus={isRegistrationOpen ? "Open" : "Closed"}
          logoUrl={getTournamentLogoUrl(tournament)}
          onBack={() => router.push(safeBackHref)}
          onShare={handleOpenShareSheet}
        />
      </div>

      <div className="sticky top-0 z-30 flex items-center justify-center bg-[var(--color-background)]">
        <button
          onClick={() => setTab("about")}
          className={`relative flex h-12 flex-1 items-center justify-center text-[16px] font-bold transition-all ${tab === "about" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)] opacity-50"}`}
        >
          About
          <div
            className={`absolute bottom-0 h-[2px] w-full ${tab === "about" ? "bg-[#ff7a1a]" : "bg-[var(--color-border)]"}`}
          />
        </button>
        <button
          onClick={() => setTab("events")}
          className={`relative flex h-12 flex-1 items-center justify-center text-[16px] font-bold transition-all ${tab === "events" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)] opacity-50"}`}
        >
          Events
          <div
            className={`absolute bottom-0 h-[2px] w-full ${tab === "events" ? "bg-[#ff7a1a]" : "bg-[var(--color-border)]"}`}
          />
        </button>
      </div>

      <div className="space-y-6 p-4 pb-32">
        {tab === "about" ? (
          <>
            <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <h2 className="text-[22px] font-bold text-[var(--color-text)]">
                Overview
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)] opacity-60">
                    <TimerIcon size={12} />
                    <span className="text-[11px] font-medium uppercase tracking-wider">
                      Start Date
                    </span>
                  </div>
                  <p className="text-[13px] font-bold text-[var(--color-text)]">
                    {formatDateTime(tournament.startDate)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)] opacity-60">
                    <TimerIcon size={12} />
                    <span className="text-[11px] font-medium uppercase tracking-wider">
                      End Date
                    </span>
                  </div>
                  <p className="text-[13px] font-bold text-[var(--color-text)]">
                    {formatDateTime(tournament.endDate)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)] opacity-60">
                  <MapPinIcon size={12} />
                  <span className="text-[11px] font-medium uppercase tracking-wider">
                    Venue Details
                  </span>
                </div>
                <p className="text-[13px] font-bold leading-relaxed text-[var(--color-text)]">
                  {tournament.venueName}, {tournament.venueAddress},{" "}
                  {tournament.venueCity}, {tournament.venueState}
                </p>
              </div>
            </section>

            <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <h2 className="text-[22px] font-bold text-[var(--color-text)]">
                Description
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                {tournament.description ||
                  "Join the biggest badminton tournament in the city! Open to all skill levels with exciting prizes."}
              </p>
            </section>

            <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <h2 className="text-[22px] font-bold text-[var(--color-text)] mb-6">
                Contact Information
              </h2>

              <div className="space-y-6">
                <div className="pt-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-md flex items-center justify-center">
                        {tournament.organization?.logoUrl ? (
                          <img
                            src={tournament.organization.logoUrl}
                            alt="Contact"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[24px] font-bold text-[var(--color-text-secondary)]">
                            {tournament.contactName?.charAt(0)?.toUpperCase() || "O"}
                          </span>
                        )}
                      </div>
                      <p className="text-[20px] font-bold text-[var(--color-text)]">
                        {tournament.contactName}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#22c55e] px-4 py-1.5 text-[14px] font-bold text-white shadow-lg shadow-green-500/20">
                      Organizer
                    </span>
                  </div>

                  <div className="ml-[72px] space-y-3">
                    <a
                      href={`tel:${tournament.contactPhone}`}
                      className="flex items-center gap-3 text-[18px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
                    >
                      <PhoneIcon size={20} className="text-[#ff7a1a]" />
                      {tournament.contactPhone}
                    </a>

                    <a
                      href={`mailto:${tournament.contactEmail}`}
                      className="flex items-center gap-3 text-[18px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)] break-all"
                    >
                      <MailIcon size={20} className="text-[#ff7a1a]" />
                      {tournament.contactEmail}
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          sortedEvents.map((ev) => {
            if (isEventViewable(ev)) {
              return (
                <EventAccessCard
                  key={ev.id}
                  event={ev}
                  tournamentId={id || ""}
                />
              );
            }

            return (
              <RegistrationEventCard
                key={ev.id}
                event={ev}
                onAddedChange={handleAddedChange}
                isInitiallyAdded={Boolean(ev.id && selected[ev.id])}
              />
            );
          })
        )}
      </div>

      {tab === "about" ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-background)] p-5 pb-[max(env(safe-area-inset-bottom),20px)]">
          <button
            disabled={!isRegistrationOpen}
            onClick={() => {
              if (!isRegistrationOpen) return;
              setTab("events");
            }}
            className={`h-16 w-full rounded-full text-[20px] font-bold shadow-lg transition-transform ${
              isRegistrationOpen
                ? "bg-[#ff811f] text-white active:scale-[0.98]"
                : "cursor-not-allowed bg-[var(--color-surface-elevated)] text-[var(--color-muted)] opacity-60"
            }`}
          >
            {isRegistrationOpen ? "Select Event" : "Registration Closed"}
          </button>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-background)] p-5 pb-[max(env(safe-area-inset-bottom),20px)] transition-transform">
          <div className="flex items-center gap-4">
            {Object.values(selected).some((v) => v) ? (
              <>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-[var(--color-text-secondary)] uppercase tracking-widest opacity-60">
                    Total Amount
                  </p>
                  <p className="text-[28px] font-bold leading-tight text-[#ff7a1a]">
                    <span className="currency-inr mr-1">&#8377;</span>
                    {total}
                  </p>
                </div>
                <Link
                  href={`/tournaments/checkout${toQuery({
                    id,
                    selected: Object.keys(selected)
                      .filter((k) => selected[k])
                      .join(","),
                  })}`}
                  className="flex h-16 min-w-[180px] items-center justify-center rounded-full bg-[#ff811f] text-[20px] font-bold text-white shadow-lg active:scale-[0.98] transition-transform"
                >
                  Claim Spot
                </Link>
              </>
            ) : (
              <button
                disabled
                className="h-16 w-full rounded-full bg-[var(--color-surface)] text-[20px] font-bold text-[var(--color-text-secondary)] opacity-30 border border-[var(--color-border)]"
              >
                Select an Event
              </button>
            )}
          </div>
        </div>
      )}

      {tab === "events" && total > 0 ? <div className="h-24" /> : null}

      {isShareSheetOpen ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
            onClick={() => setIsShareSheetOpen(false)}
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
                  {tournament.name}
                </p>
              </div>
              <button
                onClick={() => setIsShareSheetOpen(false)}
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
                onClick={handleCopyShareLink}
                className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#ff811f] px-5 text-[17px] font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
              >
                {isCopied ? <CheckIcon size={18} /> : <ClipboardIcon size={18} />}
                {isCopied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function TournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ff7a1a] border-t-transparent" />
        </div>
      }
    >
      <TournamentDetailContent />
    </Suspense>
  );
}
