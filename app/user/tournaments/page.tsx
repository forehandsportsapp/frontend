"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { isEventRegistrationOpen } from "@/lib/statusLabels";
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

function TournamentCardSkeleton() {
  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-pulse">
      <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-5">
        <div className="h-12 w-12 rounded-full bg-[var(--color-surface-elevated)]" />
        <div className="min-w-0">
          <div className="h-5 w-3/5 rounded-full bg-[var(--color-surface-elevated)]" />
          <div className="mt-2 h-4 w-4/5 rounded-full bg-[var(--color-surface-elevated)]" />
          <div className="mt-3 flex gap-2">
            <div className="h-5 w-16 rounded-full bg-[var(--color-surface-elevated)]" />
            <div className="h-5 w-20 rounded-full bg-[var(--color-surface-elevated)]" />
          </div>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-x-8 gap-y-3.5">
          <div className="h-4 rounded-full bg-[var(--color-surface-elevated)]" />
          <div className="h-4 rounded-full bg-[var(--color-surface-elevated)]" />
          <div className="h-4 rounded-full bg-[var(--color-surface-elevated)]" />
          <div className="h-4 rounded-full bg-[var(--color-surface-elevated)]" />
        </div>
        <div className="col-span-2 h-12 rounded-xl bg-[var(--color-surface-elevated)]" />
      </div>
    </div>
  );
}



type TopTab = "browse" | "joined" | "history";
type FormatTab = "all" | "singles" | "doubles";

export default function UserTournamentsPage() {
  const { userProfile } = useApp();
  const [activeTab, setActiveTab] = useState<TopTab>("browse");
  const [format, setFormat] = useState<FormatTab>("all");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
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

  const refreshNotifications = useCallback(async () => {
    try {
      const items = await notificationApi.getUserNotifications();
      setNotifications(attachActions(items));
    } catch (error) {
      console.error("Failed to load notifications", error);
      setNotifications([]);
    }
  }, [readIds, userProfile?.name, userProfile?.phone]);

  useEffect(() => {
    void refreshNotifications();
    const intervalId = window.setInterval(() => {
      void refreshNotifications();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [refreshNotifications]);

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

        if (active) setTournaments(data);
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
          e.teamType?.code?.toLowerCase().includes("singles") ||
          e.teamType?.label?.toLowerCase().includes("singles") ||
          e.eventFormatCode?.toLowerCase().includes("singles") ||
          e.eventFormat?.code?.toLowerCase().includes("singles") ||
          e.eventFormat?.label?.toLowerCase().includes("singles")
      );
      const hasDoubles = t.events?.some(
        (e) =>
          e.teamTypeCode?.toLowerCase().includes("doubles") ||
          e.teamType?.code?.toLowerCase().includes("doubles") ||
          e.teamType?.label?.toLowerCase().includes("doubles") ||
          e.eventFormatCode?.toLowerCase().includes("doubles") ||
          e.eventFormat?.code?.toLowerCase().includes("doubles") ||
          e.eventFormat?.label?.toLowerCase().includes("doubles")
      );

      if (format === "singles") return hasSingles;
      if (format === "doubles") return hasDoubles;
      return true;
    });

    const getTournamentSortTime = (tournament: TournamentData) => {
      const raw = tournament as any;
      const candidate =
        raw?.createdAt ||
        raw?.updatedAt ||
        raw?.startDate ||
        raw?.endDate ||
        "";
      const timestamp = new Date(candidate).getTime();
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    const sortedTournaments = [...filteredTournaments].sort((a, b) => {
      if (activeTab !== "browse") {
        return getTournamentSortTime(b) - getTournamentSortTime(a);
      }

      const aOpen = a.events?.some((event) =>
        isEventRegistrationOpen(event.eventState, event.dueDate),
      );
      const bOpen = b.events?.some((event) =>
        isEventRegistrationOpen(event.eventState, event.dueDate),
      );

      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      return getTournamentSortTime(b) - getTournamentSortTime(a);
    });

    return sortedTournaments.map((t): TournamentListItem => {
      const sports = Array.from(
        new Set(t.events?.map((e) => e.sportsOption?.label).filter(Boolean)),
      ) as string[];
      const isRegistrationOpen =
        t.events?.some((event) =>
          isEventRegistrationOpen(event.eventState, event.dueDate),
        ) || false;

      const subtitle = sports.slice(0, 3).join(" | ") || "Multiple Sports";

      let cta: "Register" | "View" | "Chevron" = "Register";
      if (activeTab === "joined") cta = "View";
      else if (activeTab === "history") cta = "Chevron";
      else if (!isRegistrationOpen) cta = "View";

      return {
        id: t.id!,
        name: t.name,
        subtitle,
        start: formatDate(t.startDate),
        end: formatDate(t.endDate),
        entry: String(t.events?.length || 0),
        location: `${t.venueCity} | ${t.venueState}`,
        cta,
        statusLabel:
          activeTab === "browse"
            ? isRegistrationOpen
              ? "Open"
              : "Registration Closed"
            : activeTab === "joined"
              ? "Joined"
              : "History",
        joinedStatus:
          activeTab === "history"
            ? "Completed"
            : activeTab === "joined"
              ? "Joined"
              : undefined,
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
                onClick={() => {
                  setNotificationsOpen(true);
                  void refreshNotifications();
                }}
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
          <div className="flex items-center justify-center gap-6 sm:gap-10 overflow-x-auto overflow-y-hidden no-scrollbar px-2">
            {(["browse", "joined", "history"] as TopTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative pt-2 pb-1 text-[16px] font-bold capitalize transition-all ${
                  activeTab === tab
                    ? "text-white"
                    : "text-white/60 hover:text-white/80"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-full shadow-[0_-2px_10px_rgba(255,255,255,0.4)]" />
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

        <div className="px-5 py-5 flex items-center gap-4">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-primary shadow-sm active:scale-95 transition-transform"
            >
              <SlidersIcon size={20} />
            </button>
          <div className="no-scrollbar flex items-center gap-3 overflow-x-auto overflow-y-hidden">
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

        <div className="space-y-4 px-4 pb-24 pt-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <TournamentCardSkeleton key={index} />
              ))}
            </div>
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
        onApply={() => undefined}
        onReset={() => undefined}
      />
    </>
  );
}
