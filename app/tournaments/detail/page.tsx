"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TournamentHeroCard from "@/components/TournamentHeroCard";
import {
  ArrowLeftIcon,
  CalendarIcon,
  InfoIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  TimerIcon,
  TrashIcon,
} from "@/components/Icons";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { TournamentData, EventData } from "@/lib/models";
import { toQuery } from "@/lib/utils";
import { useApp } from "@/components/AppProvider";
import RegistrationEventCard from "@/components/Card/RegistrationEventCard";

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

function TournamentDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, session } = useApp();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const id = searchParams.get("id");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

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
        if (active) {
          setTournament(data);
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

  const handleAddedChange = (eventId: string, isAdded: boolean) => {
    setSelected((prev) => ({ ...prev, [eventId]: isAdded }));
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
          onClick={() => router.back()}
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
          registrationStatus={
            tournament.tournamentState === "published" ? "Open" : "Closed"
          }
          logoUrl={getTournamentLogoUrl(tournament)}
          onBack={() => router.back()}
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
                      <div className="h-14 w-14 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-md">
                        <img
                          src={
                            tournament.organization?.logoUrl ||
                            "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&q=80&w=100&h=100"
                          }
                          alt="Contact"
                          className="h-full w-full object-cover"
                        />
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
          sortedEvents.map((ev) => (
            <RegistrationEventCard
              key={ev.id}
              event={ev}
              onAddedChange={handleAddedChange}
              isInitiallyAdded={Boolean(ev.id && selected[ev.id])}
            />
          ))
        )}
      </div>

      {tab === "about" ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-background)] p-5 pb-[max(env(safe-area-inset-bottom),20px)]">
          <button
            onClick={() => setTab("events")}
            className="h-16 w-full rounded-full bg-[#ff811f] text-[20px] font-bold text-white shadow-lg active:scale-[0.98] transition-transform"
          >
            Select Event
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
