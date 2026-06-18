"use client";

import { useState, useEffect, UIEvent, useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import BottomNav from "@/components/BottomNav";
import LiveMatchCard from "@/components/Card/LiveMatchCard";
import PastMatchesSection from "@/components/Card/PastMatchesSection";
import QuickMatchCard from "@/components/Card/QuickMatchCard";
import QuickStatsSection from "@/components/Card/QuickStatsSection";
import UserTournamentCard from "@/components/Card/UserTournamentCard";
import ColorfulTournamentCard from "@/components/Card/ColorfulTournamentCard";
import OngoingTournamentCard from "@/components/Card/OngoingTournamentCard";
import NotificationsSlideOver, {
  NotificationItem,
} from "@/components/NotificationsSlideOver";
import { notificationApi } from "@/lib/api/notificationApi";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { userApi } from "@/lib/api/userApi";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { TournamentData } from "@/lib/models";
import { toQuery } from "@/lib/utils";

function BellIcon({ size = 24 }: { size?: number }) {
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

function LightningIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

type UpcomingCardData = {
  id: string;
  name: string;
  venue: string;
  address: string;
  sport: string;
  category: string;
  modes: string;
  colorVariant: "orange" | "blue" | "green" | "red" | "purple";
  logoText: string;
  logoUrl?: string | null;
  entryFee: string;
  ctaText: string;
};

type OngoingCardData = {
  id: string;
  name: string;
  venue: string;
  sport: string;
  category: string;
  modes: string;
  logoText: string;
  logoUrl?: string | null;
};

const colorVariants: UpcomingCardData["colorVariant"][] = [
  "orange",
  "blue",
  "green",
  "red",
  "purple",
];

function getPrimarySport(t: TournamentData) {
  return t.events?.[0]?.sportsOption?.label || "Tournament";
}

function getCategory(t: TournamentData) {
  return t.events?.[0]?.gender || "Open";
}

function getModes(t: TournamentData) {
  const teamTypes = Array.from(
    new Set((t.events || []).map((e) => e.teamType?.label).filter(Boolean)),
  ) as string[];
  if (teamTypes.length === 0) return "Multiple Modes";
  return teamTypes.join(" & ");
}

function getLogoText(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function getEntryFee(t: TournamentData) {
  const firstPaidEvent = (t.events || []).find((e) => (e.amount || 0) > 0);
  if (!firstPaidEvent) return "Free";
  return `Rs ${firstPaidEvent.amount}`;
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

function normalizeTeam(team: any) {
  const playersRaw = Array.isArray(team?.players)
    ? team.players
    : Array.isArray(team?.participants)
      ? team.participants
      : Array.isArray(team?.members)
        ? team.members
        : Array.isArray(team?.users)
          ? team.users
          : [];
  const players = playersRaw.map((player: any) =>
    typeof player === "string"
      ? player
      : player?.name ||
          player?.fullName ||
          player?.displayName ||
          player?.user?.name ||
          "Player",
  );

  const directImages = [
    ...(Array.isArray(team?.images) ? team.images : []),
    ...(Array.isArray(team?.playerImages) ? team.playerImages : []),
    ...(Array.isArray(team?.avatarUrls) ? team.avatarUrls : []),
    ...(Array.isArray(team?.avatars) ? team.avatars : []),
    ...(Array.isArray(team?.profilePicUrls) ? team.profilePicUrls : []),
    ...(Array.isArray(team?.photos) ? team.photos : []),
  ].filter(Boolean);
  const mappedImages = playersRaw
    .map(
      (player: any) =>
        player?.image ||
        player?.avatarUrl ||
        player?.profilePicUrl ||
        player?.photoUrl ||
        player?.avatar ||
        player?.user?.profilePicUrl ||
        player?.user?.avatarUrl ||
        player?.user?.photoUrl ||
        player?.user?.avatar,
    )
    .filter(Boolean);

  const dedupedDirectImages = Array.from(new Set(directImages));
  const dedupedMappedImages = Array.from(new Set(mappedImages));

  return {
    ...team,
    players: players.length > 0 ? players : ["Player"],
    images:
      dedupedDirectImages.length > 0
        ? dedupedDirectImages
        : dedupedMappedImages,
  };
}

function isLiveTournament(t: TournamentData) {
  if (t.tournamentState === "in_progress") return true;
  if (!t.startDate) return false;
  const now = new Date();
  const start = new Date(t.startDate);
  const end = t.endDate ? new Date(t.endDate) : null;
  return start <= now && (!end || end >= now);
}

function isUpcomingTournament(t: TournamentData) {
  if (isLiveTournament(t)) return false;
  if (!t.startDate) return false;
  return new Date(t.startDate) > new Date();
}

export default function UserHomePage() {
  const { userProfile } = useApp();
  const [activeTab, setActiveTab] = useState("explore");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [joinedTournaments, setJoinedTournaments] = useState<TournamentData[]>(
    [],
  );
  const [isTournamentsLoading, setIsTournamentsLoading] = useState(true);
  const [userStats, setUserStats] = useState<{
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
  } | null>(null);
  const [liveMatch, setLiveMatch] = useState<any | null>(null);
  const [isLiveMatchLoading, setIsLiveMatchLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [isLiveFeedLoading, setIsLiveFeedLoading] = useState(true);

  const attachNotificationActions = (items: NotificationItem[]) =>
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

  const [activeUpcomingIndex, setActiveUpcomingIndex] = useState(0);
  const [activeOngoingIndex, setActiveOngoingIndex] = useState(0);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const items = await notificationApi.getUserNotifications();
        if (!active) return;
        setNotifications(attachNotificationActions(items));
      } catch (error) {
        if (!active) return;
        console.error("Failed to load user notifications", error);
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
    const loadStats = async () => {
      try {
        const stats = await userApi.getUserStats();
        if (!active) return;
        setUserStats(stats);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load user stats", error);
      }
    };
    void loadStats();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;

    const initializeLiveConnections = async () => {
      try {
        setIsLiveMatchLoading(true);
        setIsLiveFeedLoading(true);

        // Fetch both with separate error handling to be resilient
        const [matchResult, feedResult] = await Promise.allSettled([
          userApi.getLiveMatch(),
          userApi.getLiveFeed(),
        ]);

        if (!active) return;

        const match =
          matchResult.status === "fulfilled" ? matchResult.value : null;
        const feed = feedResult.status === "fulfilled" ? feedResult.value : [];

        if (matchResult.status === "rejected") {
          // It's normal for live matches to fail if the user isn't in one or the endpoint isn't ready
          console.log("[UserHome] Live match fetch skipped or unavailable");
        }
        if (feedResult.status === "rejected") {
          console.log("[UserHome] Live feed fetch skipped or unavailable");
        }

        setLiveMatch(match);
        setLiveFeed(feed);

        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const hasLiveSubscriptions =
          Boolean(match?.id) ||
          (Array.isArray(feed) &&
            feed.some(
              (group: any) =>
                Array.isArray(group?.matches) && group.matches.length > 0,
            ));

        if (token && hasLiveSubscriptions) {
          let wsUrl = "";
          const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL;
          const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

          if (wsBaseUrl && wsBaseUrl.startsWith("ws")) {
            wsUrl = wsBaseUrl.replace(/\/$/, "");
          } else if (baseUrl && baseUrl.startsWith("http")) {
            wsUrl = baseUrl.replace(/^http/, "ws").replace(/\/$/, "") + "/ws";
          } else {
            // Fallback to current origin if baseUrl is relative or missing
            const protocol =
              window.location.protocol === "https:" ? "wss:" : "ws:";
            const host = window.location.host;
            wsUrl = `${protocol}//${host}/ws`;
          }

          console.log(`[WS] Attempting connection: ${wsUrl}`);
          socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);

          socket.onopen = () => {
            console.log("[WS] Connected successfully");
            if (match?.id) {
              socket?.send(
                JSON.stringify({ type: "SUBSCRIBE_MATCH", matchId: match.id }),
              );
            }
            feed.forEach((group: any) => {
              socket?.send(
                JSON.stringify({
                  type: "SUBSCRIBE_TOURNAMENT",
                  tournamentId: group.tournamentId,
                }),
              );
            });
          };

          socket.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              if (message.type === "SCORE_UPDATE") {
                const {
                  matchId,
                  tournamentId,
                  teamAScore,
                  teamBScore,
                  setNumber,
                } = message.data;

                if (matchId === match?.id) {
                  setLiveMatch((prev: any) =>
                    prev
                      ? {
                          ...prev,
                          score: {
                            teamA: teamAScore,
                            teamB: teamBScore,
                            currentSet: setNumber,
                          },
                        }
                      : prev,
                  );
                }

                setLiveFeed((prevFeed) =>
                  prevFeed.map((group) => {
                    if (group.tournamentId === tournamentId) {
                      return {
                        ...group,
                        matches: group.matches.map((m: any) =>
                          m.id === matchId
                            ? {
                                ...m,
                                score: {
                                  teamA: teamAScore,
                                  teamB: teamBScore,
                                  currentSet: setNumber,
                                },
                              }
                            : m,
                        ),
                      };
                    }
                    return group;
                  }),
                );
              } else if (message.type === "MATCH_COMPLETE") {
                const { matchId, tournamentId } = message.data;
                if (matchId === match?.id) setLiveMatch(null);

                setLiveFeed((prevFeed) =>
                  prevFeed
                    .map((group) => {
                      if (group.tournamentId === tournamentId) {
                        return {
                          ...group,
                          matches: group.matches.filter(
                            (m: any) => m.id !== matchId,
                          ),
                        };
                      }
                      return group;
                    })
                    .filter((group) => group.matches.length > 0),
                );
              } else if (message.type === "MATCH_START") {
                void userApi.getLiveFeed().then((newFeed) => {
                  if (active) setLiveFeed(newFeed);
                });
              }
            } catch (e) {
              console.error("[WS] Error parsing message", e);
            }
          };

          socket.onerror = () =>
            console.log(`[WS] Connection failed for ${wsUrl}. Real-time updates disabled.`);
          socket.onclose = (event) =>
            console.log(`[WS] Closed: ${event.code} ${event.reason}`);
        }
      } catch (error) {
        if (!active) return;
        console.error("Unexpected error in initializeLiveConnections:", error);
      } finally {
        if (active) {
          setIsLiveMatchLoading(false);
          setIsLiveFeedLoading(false);
        }
      }
    };

    void initializeLiveConnections();

    return () => {
      active = false;
      if (socket) socket.close();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadTournaments = async () => {
      try {
        if (active) setIsTournamentsLoading(true);
        const [browseRows, joinedRows] = await Promise.all([
          tournamentApi.getBrowseTournaments(),
          tournamentApi.getJoinedTournaments(),
        ]);
        if (!active) return;
        const browse = Array.isArray(browseRows) ? browseRows : [];
        const joined = Array.isArray(joinedRows) ? joinedRows : [];

        const combinedById = new Map<string, TournamentData>();
        [...joined, ...browse].forEach((tournament, index) => {
          const key = tournament?.id || `fallback-${index}`;
          const existing = combinedById.get(key);
          combinedById.set(key, { ...(existing || {}), ...tournament } as TournamentData);
        });

        setTournaments(Array.from(combinedById.values()));
        setJoinedTournaments(joined);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load user tournaments", error);
        setTournaments([]);
        setJoinedTournaments([]);
      } finally {
        if (!active) return;
        setIsTournamentsLoading(false);
      }
    };

    void loadTournaments();
    const timer = setInterval(() => {
      void loadTournaments();
    }, 30000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const upcomingTournaments = useMemo<UpcomingCardData[]>(
    () =>
      tournaments
        .filter(isUpcomingTournament)
        .slice(0, 8)
        .map((t, idx) => ({
          id: t.id || `upcoming-${idx}`,
          name: t.name,
          venue: t.venueName,
          address: t.venueAddress,
          sport: getPrimarySport(t),
          category: getCategory(t),
          modes: getModes(t),
          colorVariant: colorVariants[idx % colorVariants.length],
          logoText: getLogoText(t.name),
          logoUrl: getTournamentLogoUrl(t),
          entryFee: getEntryFee(t),
          ctaText: "Register",
        })),
    [tournaments],
  );

  const ongoingTournaments = useMemo<OngoingCardData[]>(
    () =>
      tournaments
        .filter(isLiveTournament)
        .slice(0, 8)
        .map((t, idx) => ({
          id: t.id || `ongoing-${idx}`,
          name: t.name,
          venue: `${t.venueName}, ${t.venueCity}`,
          sport: getPrimarySport(t),
          category: getCategory(t),
          modes: getModes(t),
          logoText: getLogoText(t.name),
          logoUrl: getTournamentLogoUrl(t),
        })),
    [tournaments],
  );

  const unreadCount = notifications.filter((n) => n.unread).length;
  const userName = userProfile?.name || "Player";
  const displayName = userName.split(" ")[0] || userName;
  const userInitial = userName.trim().charAt(0).toUpperCase() || "P";

  const homeTabs = [
    { id: "explore", label: "Explore" },
    { id: "live", label: "Live Feed" },
    { id: "myspace", label: "My Space" },
  ];

  const handleUpcomingScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const itemWidth =
      (target.firstChild as HTMLElement)?.offsetWidth || target.clientWidth;
    const scrollPosition = target.scrollLeft;
    setActiveUpcomingIndex(Math.round(scrollPosition / itemWidth));
  };

  const handleOngoingScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const itemWidth =
      (target.firstChild as HTMLElement)?.offsetWidth || target.clientWidth;
    const scrollPosition = target.scrollLeft;
    setActiveOngoingIndex(Math.round(scrollPosition / itemWidth));
  };

  return (
    <div className="font-body flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-text)]">
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-b-[32px] px-4 pt-10 pb-12 shadow-md relative z-10 overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="mx-auto w-full max-w-md relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                {userProfile?.profilePicUrl ? (
                  <img
                    src={userProfile.profilePicUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userInitial
                )}
              </div>
              <div>
                <h1 className="text-white font-bold text-xl leading-tight tracking-tight">
                  Hey {displayName}!
                </h1>
                <p className="text-white/90 text-sm font-medium">
                  Ready to dominate the court?
                </p>
              </div>
            </div>

            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative w-10 h-10 rounded-full bg-black/10 flex items-center justify-center text-white hover:bg-black/20 active:scale-95 transition-all shrink-0 cursor-pointer"
              aria-label="Open notifications"
            >
              <BellIcon size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-orange-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex justify-center gap-2 sm:gap-3 overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mb-2 px-4">
            {homeTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`snap-center shrink-0 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white text-orange-600 shadow-md"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "explore" && (
            <div className="animate-fade-in mt-6">
              <h2 className="text-[10px] font-extrabold tracking-widest text-orange-200 uppercase mb-2">
                Browse & Join
              </h2>
              <h3 className="font-heading text-[28px] font-black uppercase leading-[1.1] text-white mb-2">
                Upcoming Tournaments
                <br />
                Near You
              </h3>
              <p className="text-sm text-white/90 font-medium mb-6">
                Compete. Track. Rise.
              </p>

              <div className="flex gap-3">
                <Link
                  href="/user/tournaments"
                  className="flex-1 bg-white text-gray-900 rounded-full h-12 flex items-center justify-center gap-1.5 font-bold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
                >
                  <LightningIcon size={16} /> Register Now
                </Link>
                <Link
                  href="/user/tournaments"
                  className="flex-1 border-2 border-white/40 text-white rounded-full h-12 flex items-center justify-center font-bold hover:bg-white/10 active:scale-[0.98] transition-all"
                >
                  Explore All
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto px-4 pb-28 pt-8">
        {activeTab === "explore" && (
          <div className="space-y-8 animate-fade-in mt-2">
            <QuickMatchCard href="/match/setup" />

            <section>
              <div className="flex items-end justify-between mb-3 px-1">
                <h3 className="font-heading text-xl font-bold tracking-tight">
                  Upcoming Tournaments
                </h3>
                <Link
                  href="/user/tournaments"
                  className="text-xs font-bold uppercase tracking-wider text-orange-600 hover:underline pb-1"
                >
                  View All
                </Link>
              </div>
              <div
                className="flex overflow-x-auto gap-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 pb-2"
                onScroll={handleUpcomingScroll}
              >
                {isTournamentsLoading ? (
                  <>
                    {[0, 1].map((idx) => (
                      <div
                        key={`upcoming-skeleton-${idx}`}
                        className="min-w-[74vw] sm:min-w-[280px] snap-center shrink-0 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 animate-pulse"
                      >
                        <div className="h-5 w-40 rounded bg-[var(--color-surface-elevated)]" />
                        <div className="mt-3 h-3 w-28 rounded bg-[var(--color-surface-elevated)]" />
                        <div className="mt-2 h-3 w-44 rounded bg-[var(--color-surface-elevated)]" />
                        <div className="mt-6 h-10 w-full rounded bg-[var(--color-surface-elevated)]" />
                      </div>
                    ))}
                  </>
                ) : upcomingTournaments.length === 0 ? (
                  <div className="min-w-[74vw] sm:min-w-[280px] snap-center shrink-0 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text-muted)]">
                    No upcoming tournaments.
                  </div>
                ) : (
                  upcomingTournaments.map((t) => (
                    <div
                      key={t.id}
                      className="min-w-[74vw] sm:min-w-[280px] snap-center shrink-0"
                    >
                      <ColorfulTournamentCard
                        id={t.id}
                        name={t.name}
                        venue={t.venue}
                        address={t.address}
                        sport={t.sport}
                        category={t.category}
                        modes={t.modes}
                        colorVariant={t.colorVariant}
                        logoText={t.logoText}
                        logoUrl={t.logoUrl}
                        entryFee={t.entryFee}
                        ctaText={t.ctaText}
                      />
                    </div>
                  ))
                )}
              </div>
              {upcomingTournaments.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {upcomingTournaments.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        activeUpcomingIndex === idx
                          ? "w-4 bg-orange-500"
                          : "w-1.5 bg-dot"
                      }`}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-end justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-xl font-bold tracking-tight">
                    Ongoing Tournaments
                  </h3>
                  <div className="relative flex h-3 w-3 items-center justify-center mb-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </div>
                </div>
                <Link
                  href="/user/tournaments"
                  className="text-xs font-bold uppercase tracking-wider text-orange-600 hover:underline pb-1"
                >
                  View All
                </Link>
              </div>
              <div
                className="flex overflow-x-auto gap-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 pb-2"
                onScroll={handleOngoingScroll}
              >
                {isTournamentsLoading ? (
                  <>
                    {[0, 1].map((idx) => (
                      <div
                        key={`ongoing-skeleton-${idx}`}
                        className="min-w-[74vw] sm:min-w-[280px] snap-center shrink-0 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 animate-pulse"
                      >
                        <div className="h-5 w-36 rounded bg-[var(--color-surface-elevated)]" />
                        <div className="mt-3 h-3 w-24 rounded bg-[var(--color-surface-elevated)]" />
                        <div className="mt-2 h-3 w-40 rounded bg-[var(--color-surface-elevated)]" />
                        <div className="mt-6 h-10 w-full rounded bg-[var(--color-surface-elevated)]" />
                      </div>
                    ))}
                  </>
                ) : ongoingTournaments.length === 0 ? (
                  <div className="min-w-[74vw] sm:min-w-[280px] snap-center shrink-0 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text-muted)]">
                    No ongoing tournaments.
                  </div>
                ) : (
                  ongoingTournaments.map((t) => (
                    <div
                      key={t.id}
                      className="min-w-[74vw] sm:min-w-[280px] snap-center shrink-0"
                    >
                      <OngoingTournamentCard
                        id={t.id}
                        name={t.name}
                        sport={t.sport}
                        category={t.category}
                        modes={t.modes}
                        venue={t.venue}
                        logoText={t.logoText}
                        logoUrl={t.logoUrl}
                      />
                    </div>
                  ))
                )}
              </div>
              {ongoingTournaments.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {ongoingTournaments.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        activeOngoingIndex === idx
                          ? "w-4 bg-orange-500"
                          : "w-1.5 bg-dot"
                      }`}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "live" && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-center py-1 mb-2">
              <span className="mr-2 h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                Live Feed
              </h3>
            </div>

            {isLiveFeedLoading ? (
              <div className="space-y-6">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-3 px-1">
                    <div className="h-5 w-40 rounded bg-[var(--color-surface-elevated)] animate-pulse" />
                    <div className="flex gap-4 overflow-x-hidden">
                      <div className="h-40 min-w-[85%] rounded-2xl bg-[var(--color-surface-elevated)] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : liveFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl text-neutral-400">📡</span>
                </div>
                <h4 className="font-bold text-neutral-700">No Live Matches</h4>
                <p className="text-sm text-neutral-500 mt-1 max-w-[240px]">
                  Matches from tournaments you've joined will appear here when
                  they go live.
                </p>
              </div>
            ) : (
              liveFeed.map((group) => (
                <section key={group.tournamentId} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="font-heading text-base font-bold text-[var(--color-text)] truncate max-w-[80%]">
                      {group.tournamentName || "Tournament"}
                    </h4>
                    <span className="text-[10px] font-bold text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded">
                      {group.matches.length} Live
                    </span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 pb-1">
                    {group.matches.map((match: any) => (
                      <div
                        key={match.id}
                        className="min-w-[85vw] sm:min-w-[320px] snap-center shrink-0"
                      >
                        <LiveMatchCard
                          tournamentName={group.tournamentName || "Tournament"}
                          matchTitle={match.matchTitle}
                          teamA={normalizeTeam(match.teamA)}
                          teamB={normalizeTeam(match.teamB)}
                          score={match.score}
                          court={match.court}
                          isLive={true}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {activeTab === "myspace" && (
          <div className="space-y-8 animate-fade-in">
            <section>
              <QuickStatsSection
                won={userStats?.matchesWon || 0}
                played={userStats?.matchesPlayed || 0}
                lost={userStats?.matchesLost || 0}
              />
            </section>

            <section>
              <h3 className="mb-3 font-heading text-lg font-semibold tracking-tight flex items-center gap-2 px-1">
                <span
                  className={`h-2 w-2 rounded-full ${liveMatch ? "bg-[var(--color-error)] animate-pulse" : "bg-gray-400"}`}
                />
                Your Live Match
              </h3>

              {isLiveMatchLoading ? (
                <div className="h-48 w-full rounded-2xl bg-[var(--color-surface-elevated)] animate-pulse" />
              ) : liveMatch && liveMatch.teamA && liveMatch.teamB ? (
                <LiveMatchCard
                  tournamentName={liveMatch.tournamentName || "Tournament"}
                  matchTitle={liveMatch.matchTitle || "Live Match"}
                  teamA={normalizeTeam(liveMatch.teamA)}
                  teamB={normalizeTeam(liveMatch.teamB)}
                  score={
                    liveMatch.score || { teamA: 0, teamB: 0, currentSet: 1 }
                  }
                  court={liveMatch.court || "TBD"}
                  isLive={true}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-8 text-center">
                  <p className="text-sm font-medium text-neutral-500">
                    You are not in any live match right now.
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Your active matches will appear here automatically.
                  </p>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-3 font-heading text-lg font-semibold tracking-tight px-1">
                Your Tournaments
              </h3>

              <div className="px-1 space-y-4">
                {isTournamentsLoading ? (
                  <div className="h-24 w-full rounded-2xl bg-[var(--color-surface-elevated)] animate-pulse" />
                ) : joinedTournaments.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] italic px-2">
                    You haven't joined any tournaments yet.
                  </p>
                ) : (
                  joinedTournaments.map((t) => (
                    <UserTournamentCard
                      key={t.id}
                      href={`/tournaments/detail${toQuery({ id: t.id })}`}
                      title={t.name}
                      sport={getPrimarySport(t)}
                      category={getCategory(t)}
                      format={getModes(t)}
                      logoUrl={getTournamentLogoUrl(t)}
                      ctaLabel="View Tournament Events"
                    />
                  ))
                )}
              </div>
            </section>

            <PastMatchesSection />
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>

      <NotificationsSlideOver
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        items={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={() =>
          setReadIds(
            new Set(notifications.map((notification) => notification.id)),
          )
        }
        onClearAll={() => setNotifications([])}
      />
    </div>
  );
}
