"use client";

import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import Tabs, { type TabItem } from "@/components/Tabs";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import {
  TrophyIcon,
  MapPinIcon,
  CalendarIcon,
  WalletIcon,
  FilterIcon,
  EditIcon,
  UsersIcon,
} from "@/components/Icons";
import { toQuery } from "@/lib/utils";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { TournamentData } from "@/lib/models";
import OrgTournamentCard from "@/components/OrgTournamentCard";
import PageHeader from "@/components/PageHeader";
import TournamentFilterDrawer from "@/components/TournamentFilterDrawer";
import { SlidersIcon } from "@/components/Icons";

const tabs: TabItem[] = [
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "drafts", label: "Drafts" },
];
function formatDate(value?: string | null) {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTournamentStatus(
  tournament: TournamentData,
): "live" | "upcoming" | "past" | "drafts" {
  if (tournament.tournamentState === "drafted") return "drafts";
  if (tournament.tournamentState === "in_progress") return "live";
  if (tournament.tournamentState === "published") return "upcoming";
  if (
    tournament.tournamentState === "completed" ||
    tournament.tournamentState === "cancelled"
  )
    return "past";

  // Fallback for safety, though states should be well-defined
  return "upcoming";
}

function getPrimarySport(tournament: TournamentData) {
  return (
    tournament.events?.[0]?.sportsOption?.label ||
    tournament.events?.[0]?.sportsOption?.code ||
    "No events"
  );
}

function getEntryFee(tournament: TournamentData) {
  const paidEvent = tournament.events?.find(
    (event) => Number(event.amount) > 0,
  );
  return paidEvent ? `₹${paidEvent.amount} Entry` : "Free Entry";
}

function getGenderLabel(tournament: TournamentData) {
  const gender = tournament.events?.find((event) => event.gender)?.gender;
  if (gender === "male") return "Men's";
  if (gender === "female") return "Women's";
  return "Open";
}

export default function OrgTournamentsPage() {
  const [activeTab, setActiveTab] = useState("live");
  const { activeOrganization } = useApp();
  const activeOrgId = activeOrganization?.id ?? null;
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const orgId = activeOrgId;

  const loadTournaments = async () => {
    try {
      setErrorMessage("");
      setIsLoading(true);

      const loadedTournaments = await tournamentApi.getOrganizationTournaments(
        orgId!,
      );

      const tList = Array.isArray(loadedTournaments)
        ? [...loadedTournaments]
        : [];

      setTournaments(tList);
    } catch (error) {
      console.error("Failed to load organization tournaments", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load tournaments.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      void loadTournaments();
    }
  }, [orgId]);

  const handlePublish = async (tournamentId: string) => {
    try {
      await tournamentApi.updateTournamentState(tournamentId, "published");
      await loadTournaments();
      setActiveTab("upcoming");
    } catch (error) {
      console.error("Failed to publish tournament", error);
      alert(
        error instanceof Error ? error.message : "Failed to publish tournament",
      );
    }
  };

  const handleDelete = async (tournamentId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this tournament and all its data? This action cannot be undone.",
      )
    ) {
      return;
    }
    try {
      await tournamentApi.deleteTournament(tournamentId);
      await loadTournaments();
    } catch (error) {
      console.error("Failed to delete tournament", error);
      alert(
        error instanceof Error ? error.message : "Failed to delete tournament",
      );
    }
  };

  const visibleTournaments = useMemo(
    () =>
      tournaments.filter((tournament) => {
        return getTournamentStatus(tournament) === activeTab;
      }),
    [activeTab, tournaments],
  );

  return (
    <Layout hideTopNav>
      <PageHeader
        title="Your Tournaments"
        subtitle="Create and manage your tournaments"
        hideTopRow={true}
        action={
          <Link
            href="/org/tournaments/create"
            className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
            style={{ background: "var(--gradient-orange)" }}
          >
            <span className="text-3xl font-light leading-none">+</span>
          </Link>
        }
      />

      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-background)] sticky top-0 z-30 transition-colors">
        <button
          onClick={() => setIsFilterOpen(true)}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-2xl bg-[var(--color-surface)] text-primary border border-[var(--color-border)] shadow-sm active:scale-95 transition-transform"
          aria-label="Filter"
        >
          <SlidersIcon size={24} />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                  : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] opacity-80 hover:opacity-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Tournament List */}
        {activeTab !== "drafts" && activeTab !== "past" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-5 border border-[var(--color-border)] animate-pulse"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex gap-3 w-full">
                        <div className="w-12 h-12 rounded-full bg-[var(--color-surface-elevated)]" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-3/4 bg-[var(--color-surface-elevated)] rounded" />
                          <div className="h-3 w-1/2 bg-[var(--color-surface-elevated)] rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-3 w-full bg-[var(--color-surface-elevated)] rounded" />
                      <div className="h-3 w-full bg-[var(--color-surface-elevated)] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : errorMessage ? (
              <p className="rounded-xl border border-[var(--color-border)] bg-red-500/10 px-4 py-3 text-sm font-medium text-[var(--color-error)]">
                {errorMessage}
              </p>
            ) : visibleTournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto bg-[var(--color-surface-elevated)] rounded-full flex items-center justify-center mb-4">
                  <TrophyIcon size={32} className="text-[var(--color-muted)]" />
                </div>
                <p className="text-[var(--color-muted)]">
                  No {activeTab} tournaments
                </p>
                <p className="text-sm text-[var(--color-muted)]">
                  Create a tournament to get started
                </p>
              </div>
            ) : (
              visibleTournaments.map((t) => (
                <OrgTournamentCard
                  key={t.id}
                  id={t.id || ""}
                  name={t.name || "Untitled Tournament"}
                  subtitle={t.description || getPrimarySport(t)}
                  badgeLabel={getGenderLabel(t)}
                  location={
                    [t.venueCity, t.venueState].filter(Boolean).join(", ") ||
                    t.venueName ||
                    "Venue TBA"
                  }
                  eventsCount={t.events?.length ?? 0}
                  date={formatDate(t.startDate)}
                  entryFee={getEntryFee(t)}
                  logoUrl={t.logoUrl || undefined}
                  href={`/org/tournaments/detail${toQuery({ t: t.id })}`}
                />
              ))
            )}
          </div>
        )}

        {/* Past Tab - Empty State */}
        {activeTab === "past" && (
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-center text-sm text-[var(--color-muted)] py-8">
                Loading tournaments...
              </p>
            ) : visibleTournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto bg-[var(--color-surface-elevated)] rounded-full flex items-center justify-center mb-4">
                  <TrophyIcon size={32} className="text-[var(--color-muted)]" />
                </div>
                <p className="text-[var(--color-muted)]">No past tournaments</p>
                <p className="text-sm text-[var(--color-muted)]">
                  Completed tournaments will appear here
                </p>
              </div>
            ) : (
              visibleTournaments.map((t) => (
                <OrgTournamentCard
                  key={t.id}
                  id={t.id || ""}
                  name={t.name || "Untitled Tournament"}
                  subtitle={getPrimarySport(t)}
                  badgeLabel="Completed"
                  location={
                    [t.venueCity, t.venueState].filter(Boolean).join(", ") ||
                    t.venueName ||
                    "Venue TBA"
                  }
                  eventsCount={t.events?.length ?? 0}
                  date={formatDate(t.startDate)}
                  entryFee={getEntryFee(t)}
                  logoUrl={t.logoUrl || undefined}
                  href={`/org/tournaments/detail${toQuery({ t: t.id })}`}
                />
              ))
            )}
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === "drafts" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-6 border-2 border-dashed border-[var(--color-border)] animate-pulse"
                  >
                    <div className="h-6 w-1/2 bg-[var(--color-surface-elevated)] rounded mb-4" />
                    <div className="h-4 w-full bg-[var(--color-surface-elevated)] rounded" />
                  </div>
                ))}
              </div>
            ) : visibleTournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto bg-[var(--color-surface-elevated)] rounded-full flex items-center justify-center mb-4">
                  <EditIcon size={32} className="text-[var(--color-muted)]" />
                </div>
                <p className="text-[var(--color-muted)]">No drafts</p>
                <p className="text-sm text-[var(--color-muted)]">
                  Draft tournaments will appear here
                </p>
              </div>
            ) : (
              visibleTournaments.map((t) => (
                <div
                  key={t.id}
                  className="relative block p-5 bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-card)]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <TrophyIcon size={24} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-[var(--color-text)] leading-tight">
                          {t.name || "Untitled Draft"}
                        </h4>
                        <p className="text-sm text-[var(--color-muted)] mt-1">
                          {t.description || "Incomplete Setup"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(t.id!)}
                      className="w-8 h-8 rounded-full bg-[var(--badge-error-bg)] text-[var(--badge-error-text)] flex items-center justify-center shrink-0 hover:bg-red-500/20 transition-colors"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>

                  <div className="h-px w-full bg-[var(--color-border)] mb-4"></div>

                  <div className="mb-6">
                    <p className="text-sm text-[var(--color-muted)]">
                      Created: {formatDate(t.startDate)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href={`/org/tournaments/detail${toQuery({ t: t.id })}`}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius-button)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] font-semibold hover:border-primary transition-colors"
                    >
                      <EditIcon size={18} />
                      <span>Complete Draft</span>
                    </Link>
                    <button
                      onClick={() => handlePublish(t.id!)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius-button)] bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
                    >
                      <TrophyIcon size={18} />
                      <span>Publish</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <TournamentFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(filters) => {
          console.log("Applying filters:", filters);
          // In a real app, we would update the tournament fetch query here
        }}
        onReset={() => {
          console.log("Filters reset");
        }}
      />
    </Layout>
  );
}
