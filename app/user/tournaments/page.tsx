"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FilterIcon, SearchIcon, SlidersIcon } from "@/components/Icons";
import BottomNav from "@/components/BottomNav";
import NotificationsSlideOver, {
  type NotificationItem,
} from "@/components/NotificationsSlideOver";
import TournamentListCard, {
  type TournamentListItem,
} from "@/components/TournamentListCard";
import { useApp } from "@/components/AppProvider";
import { notificationApi } from "@/lib/api/notificationApi";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { matchApi } from "@/lib/api/matchApi";
import { TournamentData } from "@/lib/models";
import { toQuery } from "@/lib/utils";
import TournamentFilterDrawer from "@/components/TournamentFilterDrawer";
import TeamLogo from "@/components/TeamLogo";

function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getTournamentLogoUrl(t: TournamentData) {
  const raw = t as any;
  return (
    t.logoUrl ||
    raw?.logoURL ||
    raw?.logo ||
    raw?.imageUrl ||
    raw?.image ||
    null
  );
}

function ScorerMatchCard({ match }: { match: any }) {
  const getTeamName = (t: any) => {
    if (!t) return "Empty Slot";
    const participants = t.participants || [];
    if (participants.length === 0) return t.name || "Unknown Team";
    if (participants.length === 1) return participants[0].user?.name || t.name || "Player";
    return participants.map((p: any) => p.user?.name?.[0]?.toUpperCase() || "P").join(" & ");
  };

  const teamAName = getTeamName(match.teamAData || match.teamA);
  const teamBName = getTeamName(match.teamBData || match.teamB);

  const eventName = match.event?.name || "Event";
  const tournamentName = match.event?.tournament?.name || "Tournament";

  const isLive = match.matchState === "in_progress";
  const isCompleted = match.matchState === "completed" || match.matchState === "abandoned" || match.matchState === "walkover";

  let dateStr = "TBA";
  if (match.scheduledAt || match.startTime) {
    const d = new Date(match.scheduledAt || match.startTime);
    dateStr = d.toLocaleDateString("en-IN", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden mb-4">
      <div className="bg-orange-500 px-4 py-2 flex items-center justify-between">
        <span className="text-white font-bold text-sm truncate">{tournamentName} - {eventName}</span>
        {isLive && <span className="px-2 py-0.5 bg-white text-orange-500 rounded-full text-[10px] font-black uppercase tracking-wider">Live</span>}
      </div>
      <div className="p-4 space-y-4">
        <div className="text-center text-xs font-bold text-[var(--color-text-secondary)]">{dateStr}</div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col flex-1 items-center">
            <div className="mb-2 flex items-center justify-center">
              <TeamLogo team={match.teamAData || match.teamA} size="md" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text)] text-center leading-tight">{teamAName}</span>
          </div>
          <span className="font-bold text-[var(--color-muted)] px-3 text-lg">VS</span>
          <div className="flex flex-col flex-1 items-center">
            <div className="mb-2 flex items-center justify-center">
              <TeamLogo team={match.teamBData || match.teamB} size="md" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text)] text-center leading-tight">{teamBName}</span>
          </div>
        </div>
        {!isCompleted && (
          <Link
            href={`/user/tournaments/match/live?matchId=${match.id}`}
            className="block w-full py-3 rounded-xl text-center text-sm font-bold text-white transition-transform active:scale-95"
            style={{ background: "var(--gradient-orange)" }}
          >
            {isLive ? "Score Match" : "Start Scoring"}
          </Link>
        )}
        {isCompleted && (
          <div className="w-full py-3 rounded-xl text-center text-sm font-bold bg-[var(--color-surface-elevated)] text-[var(--color-muted)]">
            Match Completed
          </div>
        )}
      </div>
    </div>
  );
}

type TopTab = "browse" | "joined" | "history" | "scorer";
type FormatTab = "all" | "singles" | "doubles";
type ScorerSubTab = "pending" | "scored";

export default function UserTournamentsPage() {
  const { userProfile } = useApp();
  const [activeTab, setActiveTab] = useState<TopTab>("browse");
  const [scorerSubTab, setScorerSubTab] = useState<ScorerSubTab>("pending");

  // Restore scorer tab if returning from a scored match (e.g. ?tab=scorer in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "scorer") setActiveTab("scorer");
  }, []);
  const [format, setFormat] = useState<FormatTab>("all");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [scorerMatches, setScorerMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const attachActions = (items: NotificationItem[]) =>
    items.map((item) => ({
      ...item,
      unread: item.unread && !readIds.has(item.id),
      onAccept:
        item.type === "invite"
          ? async () => {
              const targetId = item.inviteId || item.id;
              await notificationApi.respondToInvite(targetId, "accept");
              setNotifications((prev) => prev.filter((n) => n.id !== item.id));
            }
          : undefined,
      onReject:
        item.type === "invite"
          ? async () => {
              const targetId = item.inviteId || item.id;
              await notificationApi.respondToInvite(targetId, "reject");
              setNotifications((prev) => prev.filter((n) => n.id !== item.id));
            }
          : undefined,
    }));

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const items = await notificationApi.getUserNotifications();
        if (!active) return;
        setNotifications(attachActions(items));
      } catch (error) {
        if (!active) return;
        console.error("Failed to load notifications", error);
        setNotifications([]);
      }
    };
    void loadNotifications();
    return () => {
      active = false;
    };
  }, [readIds]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        let data: TournamentData[] = [];
        if (activeTab === "browse")
          data = await tournamentApi.getBrowseTournaments();
        else if (activeTab === "joined")
          data = await tournamentApi.getJoinedTournaments();
        else if (activeTab === "history")
          data = await tournamentApi.getHistoryTournaments();
        else if (activeTab === "scorer") {
          const matches = await matchApi.getScorerMatches();
          if (active) setScorerMatches(matches || []);
        }

        if (active && activeTab !== "scorer") {
          setTournaments(data);
        }
      } catch (error) {
        console.error(`Failed to load ${activeTab} tournaments`, error);
        if (active) setTournaments([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void loadData();
    return () => {
      active = false;
    };
  }, [activeTab]);

  const list = useMemo<TournamentListItem[]>(() => {
    const filteredTournaments = tournaments.filter((t) => {
      if (format === "all") return true;

      const hasSingles = t.events?.some(
        (e) =>
          e.teamTypeCode?.toLowerCase().includes("singles") ||
          e.teamType?.label?.toLowerCase().includes("singles"),
      );
      const hasDoubles = t.events?.some(
        (e) =>
          e.teamTypeCode?.toLowerCase().includes("doubles") ||
          e.teamType?.label?.toLowerCase().includes("doubles"),
      );

      if (format === "singles") return hasSingles;
      if (format === "doubles") return hasDoubles;
      return true;
    });

    return filteredTournaments.map((t): TournamentListItem => {
      const sports = Array.from(
        new Set(t.events?.map((e) => e.sportsOption?.label).filter(Boolean)),
      ) as string[];

      const subtitle = sports.slice(0, 3).join(" | ") || "Multiple Sports";

      let cta: "Register" | "View" | "Chevron" = "Register";
      if (activeTab === "joined") cta = "View";
      else if (activeTab === "history") cta = "Chevron";

      return {
        id: t.id!,
        name: t.name,
        subtitle,
        start: formatDate(t.startDate),
        end: formatDate(t.endDate),
        entry: String(t.events?.length || 0),
        location: `${t.venueCity} | ${t.venueState}`,
        cta,
        joinedStatus: activeTab === "history" ? "Completed" : undefined,
        logoUrl: getTournamentLogoUrl(t),
      };
    });
  }, [tournaments, activeTab, format]);

  const unreadCount = notifications.filter((item) => item.unread).length;
  const userInitial = userProfile?.name?.trim().charAt(0).toUpperCase() || "P";

  return (
    <>
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
        <div className="bg-primary rounded-b-[32px] px-5 pt-10 pb-6 shadow-lg relative z-10 overflow-hidden">
          {/* Header Row */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/user/settings" className="shrink-0">
              <div className="w-14 h-14 rounded-full border-2 border-white/30 bg-white/20 overflow-hidden flex items-center justify-center shadow-md transition-transform active:scale-95">
                {userProfile?.profilePicUrl ? (
                  <img
                    src={userProfile.profilePicUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-white">
                    {userInitial}
                  </span>
                )}
              </div>
            </Link>

            <div className="flex flex-col min-w-0">
              <h1 className="text-[24px] font-bold leading-tight tracking-tight truncate text-white">
                Tournaments
              </h1>
              <p className="text-[14px] text-white/80 font-medium tracking-wide truncate">
                Browse and join tournaments
              </p>
            </div>

            <div className="ml-auto">
              <button
                onClick={() => setNotificationsOpen(true)}
                className="relative w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all active:scale-95 shadow-sm text-white"
                aria-label="Notifications"
              >
                <BellIcon size={24} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-primary text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-primary">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <label className="flex h-14 items-center gap-3 rounded-[20px] bg-white px-4 text-gray-400 shadow-md focus-within:ring-2 focus-within:ring-white/20 transition-all">
              <SearchIcon size={22} className="opacity-60 text-gray-500" />
              <input
                type="text"
                placeholder="Search tournaments, cities..."
                className="w-full bg-transparent text-[16px] text-gray-800 outline-none placeholder:text-gray-400 font-medium"
              />
            </label>
          </div>

          {/* Centered Tabs */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 overflow-x-auto hide-scrollbar px-2">
            {(["browse", "joined", "history", "scorer"] as TopTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative py-2 text-[16px] font-bold capitalize transition-all ${
                  activeTab === tab
                    ? "text-white"
                    : "text-white/60 hover:text-white/80"
                }`}
              >
                {tab === "scorer" ? "score" : tab}
                {activeTab === tab && (
                  <div className="absolute -bottom-1 left-0 right-0 h-[3px] bg-white rounded-t-full shadow-[0_-2px_10px_rgba(255,255,255,0.4)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        <NotificationsSlideOver
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          items={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={() =>
            setReadIds(new Set(notifications.map((n) => n.id)))
          }
          onClearAll={() => setNotifications([])}
        />

        {activeTab !== "scorer" && (
          <div className="px-5 py-5 flex items-center gap-4">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-primary shadow-sm active:scale-95 transition-transform"
            >
              <SlidersIcon size={20} />
            </button>
          <div className="hide-scrollbar flex items-center gap-3 overflow-x-auto">
            {(
              [
                { id: "all", label: "All Formats" },
                { id: "singles", label: "Singles" },
                { id: "doubles", label: "Doubles" },
              ] as { id: FormatTab; label: string }[]
            ).map((tab) => {
              const active = format === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFormat(tab.id)}
                  className={`h-11 shrink-0 rounded-[18px] border px-6 text-[15px] font-bold transition-all ${
                    active
                      ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                      : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] opacity-70 hover:opacity-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        )}

        <div className="space-y-4 px-4 pb-24 pt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-[var(--color-text-muted)]">
                Loading...
              </p>
            </div>
          ) : activeTab === "scorer" ? (
            (() => {
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
              const activeList = scorerSubTab === "pending" ? pendingMatches : scoredMatches;
              return (
                <>
                  {/* Sub-tab switcher */}
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
                        {sub === "pending" ? `Pending (${pendingMatches.length})` : `Scored (${scoredMatches.length})`}
                      </button>
                    ))}
                  </div>

                  {/* Match list */}
                  {scorerMatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <p className="text-[var(--color-text-muted)] text-lg font-semibold">No Assigned Matches</p>
                      <p className="text-[var(--color-text-muted)] text-sm mt-1">You have not been assigned to score any matches yet.</p>
                    </div>
                  ) : activeList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center mb-3">
                        <span className="text-2xl">{scorerSubTab === "pending" ? "🏸" : "✅"}</span>
                      </div>
                      <p className="text-[var(--color-text-muted)] font-semibold">
                        {scorerSubTab === "pending" ? "No pending matches" : "No scored matches yet"}
                      </p>
                      <p className="text-[var(--color-text-muted)] text-sm mt-1">
                        {scorerSubTab === "pending" ? "All your assigned matches are done!" : "Matches you score will appear here."}
                      </p>
                    </div>
                  ) : (
                    activeList.map((m: any) => <ScorerMatchCard key={m.id} match={m} />)
                  )}
                </>
              );
            })()
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-[var(--color-text-muted)] text-lg font-semibold">
                No Tournaments Available
              </p>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">
                Try changing your filters or check back later
              </p>
            </div>
          ) : (
            list.map((item) => <TournamentListCard key={item.id} item={item} />)
          )}
        </div>

        <BottomNav />
      </div>

      <TournamentFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(filters) => console.log("Applying filters:", filters)}
        onReset={() => console.log("Filters reset")}
      />
    </>
  );
}
