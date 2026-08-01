"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/Icons";
import { useApp } from "@/components/AppProvider";
import { matchApi } from "@/lib/api/matchApi";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { TournamentData } from "@/lib/models";
import ScorerMatchCard from "@/components/Card/ScorerMatchCard";
import OrgTournamentCard from "@/components/OrgTournamentCard";

type ManageTab = "admin" | "scorer";
type ScorerSubTab = "pending" | "scored";

export default function UserManagePage() {
  const { activeOrganization } = useApp();
  const [activeTab, setActiveTab] = useState<ManageTab>("admin");
  const [scorerSubTab, setScorerSubTab] = useState<ScorerSubTab>("pending");
  const [isLoading, setIsLoading] = useState(true);

  const [adminTournaments, setAdminTournaments] = useState<TournamentData[]>([]);
  const [scorerMatches, setScorerMatches] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setIsLoading(true);

        if (activeTab === "admin") {
          if (activeOrganization?.id) {
            const data = await tournamentApi.getOrganizationTournaments(activeOrganization.id);
            if (active) setAdminTournaments(Array.isArray(data) ? data : []);
          } else {
            if (active) setAdminTournaments([]);
          }
        } else if (activeTab === "scorer") {
          const matches = await matchApi.getScorerMatches();
          if (active) setScorerMatches(matches || []);
        }
      } catch (error) {
        console.error(`Failed to load ${activeTab} data`, error);
        if (activeTab === "admin" && active) setAdminTournaments([]);
        if (activeTab === "scorer" && active) setScorerMatches([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [activeTab, activeOrganization]);

  // Derived scorer matches
  const sortByDate = (a: any, b: any) => {
    const ta = new Date(b.scheduledAt || b.startTime || 0).getTime();
    const tb = new Date(a.scheduledAt || a.startTime || 0).getTime();
    return ta - tb;
  };

  const pendingMatches = scorerMatches
    .filter((m: any) => m.matchState !== "completed" && m.matchState !== "abandoned" && m.matchState !== "walkover")
    .sort(sortByDate);

  const scoredMatches = scorerMatches
    .filter((m: any) => m.matchState === "completed" || m.matchState === "abandoned" || m.matchState === "walkover")
    .sort(sortByDate);

  const activeScorerList = scorerSubTab === "pending" ? pendingMatches : scoredMatches;

  return (
    <div className="min-h-[100dvh] bg-[var(--color-background)] flex flex-col relative pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--color-surface)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-b-3xl">
        <div className="flex h-16 items-center px-4">
          <Link
            href="/user/home"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface-elevated)] active:scale-95 transition-all text-[var(--color-text-secondary)]"
          >
            <ArrowLeftIcon size={24} />
          </Link>
          <div className="flex-1 px-4">
            <h1 className="text-xl font-heading font-bold text-[var(--color-text)]">
              Manage
            </h1>
          </div>
        </div>

        {/* Top Tabs */}
        <div className="flex w-full overflow-x-auto hide-scrollbar px-4 pb-0 mt-2 border-b border-[var(--color-border)]">
          {(["admin", "scorer"] as ManageTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 py-3 text-[16px] font-bold capitalize transition-all ${
                activeTab === tab
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(255,107,0,0.4)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-[var(--color-text-muted)]">Loading...</p>
          </div>
        ) : activeTab === "admin" ? (
          <div className="space-y-4">
            {!activeOrganization?.id ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[var(--color-text-muted)] text-lg font-semibold">
                  No Admin Rights
                </p>
                <p className="text-[var(--color-text-muted)] text-sm mt-1">
                  You are not an admin of any organization.
                </p>
              </div>
            ) : adminTournaments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[var(--color-text-muted)] text-lg font-semibold">
                  No Tournaments Found
                </p>
                <p className="text-[var(--color-text-muted)] text-sm mt-1">
                  Your organization does not have any tournaments.
                </p>
              </div>
            ) : (
              adminTournaments.map((t) => (
                <OrgTournamentCard
                  key={t.id}
                  tournament={t}
                  activeTab={t.tournamentState === "published" ? "upcoming" : (t.tournamentState === "in_progress" ? "live" : "past")}
                  onPublish={async () => {}}
                  onDelete={async () => {}}
                />
              ))
            )}
          </div>
        ) : (
          <div>
            {/* Sub-tab switcher for Scorer */}
            <div className="flex gap-2 mb-4">
              {(["pending", "scored"] as ScorerSubTab[]).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setScorerSubTab(sub)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                    scorerSubTab === sub
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                  }`}
                >
                  {sub === "pending"
                    ? `Pending (${pendingMatches.length})`
                    : `Scored (${scoredMatches.length})`}
                </button>
              ))}
            </div>

            {/* Match list */}
            {scorerMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[var(--color-text-muted)] text-lg font-semibold">
                  No Assigned Matches
                </p>
                <p className="text-[var(--color-text-muted)] text-sm mt-1">
                  You have not been assigned to score any matches yet.
                </p>
              </div>
            ) : activeScorerList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center mb-3">
                  <span className="text-2xl">
                    {scorerSubTab === "pending" ? "🏸" : "✅"}
                  </span>
                </div>
                <p className="text-[var(--color-text-muted)] font-semibold">
                  {scorerSubTab === "pending"
                    ? "No pending matches"
                    : "No scored matches yet"}
                </p>
                <p className="text-[var(--color-text-muted)] text-sm mt-1">
                  {scorerSubTab === "pending"
                    ? "All your assigned matches are done!"
                    : "Matches you score will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeScorerList.map((m: any) => (
                  <ScorerMatchCard key={m.id} match={m} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
