"use client";

import Link from "next/link";
import Layout from "@/components/Layout";
import HomeHeader from "@/components/HomeHeader";
import LiveMatchViewerPopup from "@/components/LiveMatchViewerPopup";
import LiveMatchCard from "@/components/Card/LiveMatchCard";
import SwipingDots from "@/components/SwipingDots";
import { useApp } from "@/components/AppProvider";
import {
  CalendarIcon,
  CircleIcon,
  TimerIcon,
  TrophyIcon,
} from "@/components/Icons";
import {
  motion,
  useScroll,
  useTransform,
  type Variants,
  type MotionValue,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { organizationApi } from "@/lib/api/organizationApi";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { TournamentData } from "@/lib/models";
import { toQuery } from "@/lib/utils";

const ORG_TOURNAMENT_REFRESH_MS = 300_000;

const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

type LiveTournamentCardData = {
  id: string;
  name: string;
  stage: string;
  participants: string;
  subtitle: string;
};

function normalizeMatchSets(sets: any[] = []) {
  const statusRank: Record<string, number> = {
    in_progress: 3,
    completed: 2,
    not_started: 1,
  };
  const byNumber = new Map<number, any>();

  sets.forEach((set) => {
    const setNumber = Number(set?.setNumber);
    if (!Number.isFinite(setNumber)) return;
    const existing = byNumber.get(setNumber);
    const setRank = statusRank[set?.setStatus] ?? 0;
    const existingRank = existing ? statusRank[existing.setStatus] ?? 0 : -1;
    if (!existing || setRank > existingRank) byNumber.set(setNumber, set);
  });

  return [...byNumber.values()].sort((a, b) => a.setNumber - b.setNumber);
}

function normalizeLiveScore(match: any) {
  const sets = normalizeMatchSets(match?.sets);
  const currentSet =
    sets.find((set: any) => set?.setStatus === "in_progress") ||
    [...sets].sort((a, b) => b.setNumber - a.setNumber)[0];
  const score = sets.reduce(
    (current, set) => {
      if (set?.setStatus !== "completed") return current;
      const teamAScore = Number(set?.teamAScore || 0);
      const teamBScore = Number(set?.teamBScore || 0);
      if (teamAScore > teamBScore) current.teamA += 1;
      else if (teamBScore > teamAScore) current.teamB += 1;
      return current;
    },
    { teamA: 0, teamB: 0 },
  );

  return {
    ...match,
    sets,
    score: {
      ...score,
      currentSet: currentSet?.setNumber ?? match?.score?.currentSet ?? 1,
    },
  };
}

const AnimatedCard = ({
  children,
  containerRef,
  className,
}: {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) => {
  const cardRef = useRef(null);

  const { scrollXProgress } = useScroll({
    target: cardRef,
    container: containerRef,
    axis: "x",
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollXProgress, [0, 0.5, 1], [0.95, 1, 0.95]);

  return (
    <motion.article
      ref={cardRef}
      variants={cardVariants}
      style={{ scale }}
      className={className}
    >
      {children}
    </motion.article>
  );
};

const Dot = ({
  index,
  itemCount,
  scrollXProgress,
}: {
  index: number;
  itemCount: number;
  scrollXProgress: MotionValue<number>;
}) => {
  const step = 1 / (itemCount - 1);
  const target = index * step;

  let inputRange = [target - step, target, target + step];
  let widthOutput = [6, 24, 6];
  let opacityOutput = [0.2, 1, 0.2];

  if (inputRange[0] < 0) {
    inputRange = [0, target, target + step];
    widthOutput = [24, 24, 6];
    opacityOutput = [1, 1, 0.2];
  } else if (inputRange[inputRange.length - 1] > 1) {
    inputRange = [target - step, target, 1];
    widthOutput = [6, 24, 24];
    opacityOutput = [0.2, 1, 1];
  }

  const width = useTransform(scrollXProgress, inputRange, widthOutput);
  const opacity = useTransform(scrollXProgress, inputRange, opacityOutput);

  return (
    <motion.div
      style={{ width, opacity }}
      className="h-1.5 rounded-full bg-primary"
    />
  );
};

const ScrollIndicator = ({
  itemCount,
  containerRef,
}: {
  itemCount: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const { scrollXProgress } = useScroll({ container: containerRef });

  if (itemCount <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 h-3">
      {Array.from({ length: itemCount }).map((_, i) => (
        <Dot
          key={i}
          index={i}
          itemCount={itemCount}
          scrollXProgress={scrollXProgress}
        />
      ))}
    </div>
  );
};

function OrgLiveMatchGroup({
  group,
  resolveTeamLogo,
  onSelectMatch,
}: {
  group: any;
  resolveTeamLogo: (team: any) => string | null;
  onSelectMatch: (match: any) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
          {group.tournamentName}
        </h4>
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {group.matches.length} Live
        </span>
      </div>

      <div
        ref={containerRef}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2"
      >
        {group.matches.map((match: any) => (
          <div
            role="button"
            tabIndex={0}
            key={match.id}
            onClick={() => onSelectMatch(match)}
            className="text-left min-w-[85%] snap-center cursor-pointer transition-transform active:scale-[0.98] outline-none"
          >
            <LiveMatchCard
              tournamentName={group.tournamentName || "Tournament"}
              matchTitle={match.matchTitle}
              teamA={{
                players: (match.teamA?.name || "Team A").split(/\s+&\s+/),
                images: resolveTeamLogo(match.teamA)
                  ? [resolveTeamLogo(match.teamA) as string]
                  : [],
              }}
              teamB={{
                players: (match.teamB?.name || "Team B").split(/\s+&\s+/),
                images: resolveTeamLogo(match.teamB)
                  ? [resolveTeamLogo(match.teamB) as string]
                  : [],
              }}
              score={match.score}
              court={match.court}
              isLive={true}
            />
          </div>
        ))}
      </div>

      <SwipingDots
        itemCount={group.matches.length}
        containerRef={containerRef}
        activeColor="bg-primary"
      />
    </div>
  );
}

function isLiveTournament(t: TournamentData) {
  if (t.tournamentState === "in_progress") return true;
  if (!t.startDate) return false;
  const now = new Date();
  const start = new Date(t.startDate);
  const end = t.endDate ? new Date(t.endDate) : null;
  return start <= now && (!end || end >= now);
}

function isCompletedTournament(t: TournamentData) {
  if (t.tournamentState === "completed") return true;
  if (!t.endDate) return false;
  return new Date(t.endDate) < new Date();
}

function isUpcomingTournament(t: TournamentData) {
  if (isLiveTournament(t) || isCompletedTournament(t)) return false;
  if (t.tournamentState === "drafted" || t.tournamentState === "published")
    return true;
  if (!t.startDate) return false;
  return new Date(t.startDate) > new Date();
}

function formatLiveStage(t: TournamentData) {
  if (!t.startDate || !t.endDate) return "Live";

  const start = new Date(t.startDate);
  const end = new Date(t.endDate);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return "Live";

  const totalDays = Math.max(1, Math.ceil(totalMs / dayMs) + 1);
  const elapsedDays = Math.max(
    1,
    Math.ceil((now.getTime() - start.getTime()) / dayMs) + 1,
  );
  const day = Math.min(totalDays, elapsedDays);

  return `Day ${day} of ${totalDays}`;
}

function toLiveCard(t: TournamentData): LiveTournamentCardData {
  const primarySport = t.events?.[0]?.sportsOption?.label || "Tournament";
  const category = t.events?.[0]?.gender || "Open";
  const format = t.events?.[0]?.teamType?.label || "Mixed";

  return {
    id: t.id || `t-${Date.now()}`,
    name: t.name,
    stage: formatLiveStage(t),
    participants: `${t.events?.length || 0} events`,
    subtitle: `${primarySport} - ${category} - ${format}`,
  };
}

function getLiveMatchEventId(group: any, match: any) {
  return (
    match?.eventId ||
    match?.event?.id ||
    match?.event?.eventId ||
    match?.fixture?.eventId ||
    group?.eventId ||
    group?.event?.id ||
    ""
  );
}

function getLiveMatchTournamentId(group: any, match: any) {
  return (
    group?.tournamentId ||
    match?.tournamentId ||
    match?.tournament?.id ||
    ""
  );
}

export default function OrgHomePage() {
  const tournamentContainerRef = useRef<HTMLDivElement>(null);
  const { activeOrganization: organization } = useApp();
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [selectedLiveMatch, setSelectedLiveMatch] = useState<any>(null);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    const orgId = organization?.id;

    if (!orgId) {
      setLiveFeed([]);
      setIsFeedLoading(false);
      return;
    }

    const initializeFeed = async () => {
      try {
        setIsFeedLoading(true);
        const feed = await organizationApi.getOrgLiveMatches(orgId);
        if (!active) return;
        setLiveFeed(Array.isArray(feed) ? feed : []);

        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (token) {
          const baseUrl =
            process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
          const wsBase = baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
          const wsUrl = `${wsBase}/ws`;

          socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);

          socket.onopen = () => {
            if (active) {
              (feed || []).forEach((group: any) => {
                socket?.send(
                  JSON.stringify({
                    type: "SUBSCRIBE_TOURNAMENT",
                    tournamentId: group.tournamentId,
                  }),
                );
              });
            }
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
                  setStatus,
                } = message.data;

                setLiveFeed((prevFeed) =>
                  prevFeed.map((group) => {
                    if (group.tournamentId === tournamentId) {
                      return {
                        ...group,
                        matches: group.matches.map((m: any) => {
                          if (m.id === matchId) {
                            let updatedSets = [...(m.sets || [])];
                            const setIndex = updatedSets.findIndex(
                              (s) => s.setNumber === setNumber,
                            );
                            if (setIndex >= 0) {
                              updatedSets[setIndex] = {
                                ...updatedSets[setIndex],
                                teamAScore,
                                teamBScore,
                                setStatus: setStatus || "in_progress",
                              };
                            } else {
                              updatedSets.push({
                                setNumber,
                                teamAScore,
                                teamBScore,
                                setStatus: setStatus || "in_progress",
                              });
                            }
                            return normalizeLiveScore({
                              ...m,
                              sets: updatedSets,
                            });
                          }
                          return m;
                        }),
                      };
                    }
                    return group;
                  }),
                );
              } else if (message.type === "MATCH_COMPLETE") {
                const { matchId, tournamentId } = message.data;
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
                void organizationApi.getOrgLiveMatches(orgId).then((f) => {
                  if (active) setLiveFeed(f || []);
                });
              }
            } catch (e) {
              console.error("[WS] Org Feed Parsing Error:", e);
            }
          };

          socket.onerror = () => undefined;
          socket.onclose = () => undefined;
        }
      } catch (error) {
        if (!active) return;
        setLiveFeed([]); // Reset to empty on error
      } finally {
        if (active) setIsFeedLoading(false);
      }
    };

    void initializeFeed();

    return () => {
      active = false;
      if (socket) socket.close();
    };
  }, [organization?.id]);

  useEffect(() => {
    let active = true;
    const orgId = organization?.id;

    if (!orgId) {
      setTournaments([]);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        const rows = await tournamentApi.getOrganizationTournaments(orgId);
        if (!active) return;
        setTournaments(Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load org tournaments", error);
        setTournaments([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load();
    }, ORG_TOURNAMENT_REFRESH_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [organization?.id]);

  const overview = useMemo(() => {
    const live = tournaments.filter(isLiveTournament).length;
    const completed = tournaments.filter(isCompletedTournament).length;
    const upcoming = tournaments.filter(isUpcomingTournament).length;
    return { live, completed, upcoming };
  }, [tournaments]);

  const liveTournaments = useMemo(
    () => tournaments.filter(isLiveTournament).map(toLiveCard),
    [tournaments],
  );

  const resolveTeamLogo = (team: any) => {
    const src =
      team?.logoUrl ||
      team?.avatarUrl ||
      team?.profilePicUrl ||
      team?.iconUrl ||
      team?.imageUrl ||
      "";
    if (!src || typeof src !== "string") return null;
    return src;
  };

  return (
    <Layout hideTopNav>
      <HomeHeader showNotifications={false} />
      <div className="font-body mx-auto w-full max-w-md space-y-6 px-4 pb-24 pt-6">
        <section className="space-y-4">
          <h2 className="px-1 text-lg font-bold tracking-tight">
            Tournament Overview
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Upcoming",
                count: String(overview.upcoming).padStart(2, "0"),
                icon: CalendarIcon,
              },
              {
                label: "Completed",
                count: String(overview.completed).padStart(2, "0"),
                icon: TrophyIcon,
              },
              {
                label: "Live",
                count: String(overview.live).padStart(2, "0"),
                icon: TimerIcon,
              },
            ].map((item) => (
              <article
                key={item.label}
                className="flex flex-col items-center justify-center gap-2 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] py-6 px-3 shadow-sm transition-transform active:scale-95"
              >
                <item.icon size={28} className="text-[#ff7a1a]" />
                <p className="text-3xl font-bold leading-none tracking-tight text-[var(--color-text)]">
                  {item.count}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] opacity-70">
                  {item.label}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-xl font-semibold">
              Live Tournaments
            </h3>
            <Link
              href="/org/tournaments"
              className="text-xs font-medium uppercase text-primary"
            >
              See All
            </Link>
          </div>

          {isLoading ? (
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
              {[1, 2].map((i) => (
                <div key={i} className="card min-w-[85%] p-4 animate-pulse">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="h-3 w-12 rounded-full bg-[var(--color-surface-elevated)]" />
                    <div className="h-3 w-16 rounded-full bg-[var(--color-surface-elevated)]" />
                  </div>
                  <div className="h-5 w-3/4 rounded-md bg-[var(--color-surface-elevated)] mb-2" />
                  <div className="h-3 w-1/2 rounded-md bg-[var(--color-surface-elevated)]" />
                  <div className="mt-4 border-t border-[var(--color-border)] pt-3 flex justify-between">
                    <div className="h-3 w-16 rounded-md bg-[var(--color-surface-elevated)]" />
                    <div className="h-3 w-12 rounded-md bg-[var(--color-surface-elevated)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : liveTournaments.length === 0 ? (
            <div className="card flex flex-col items-center justify-center p-8 text-center bg-[var(--color-surface)] border-dashed border-2">
              <div className="w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center mb-3">
                <TimerIcon
                  size={24}
                  className="text-[var(--color-muted)] opacity-50"
                />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                No live tournaments
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                When you start a tournament, it will appear here.
              </p>
            </div>
          ) : (
            <>
              <motion.div
                ref={tournamentContainerRef}
                className="relative no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4"
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {liveTournaments.map((item) => (
                  <Link
                    key={item.id}
                    href={`/org/tournaments/detail${toQuery({ t: item.id })}`}
                    className="block min-w-[85%] snap-center"
                  >
                    <AnimatedCard
                      containerRef={tournamentContainerRef}
                      className="card h-full p-4 transition-transform active:scale-[0.98]"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-success)]">
                          <CircleIcon
                            size={6}
                            className="text-[var(--color-success)] fill-current"
                          />
                          Live
                        </span>
                        <span className="text-xs text-[var(--color-muted)]">
                          {item.stage}
                        </span>
                      </div>
                      <h4 className="font-heading text-lg font-bold leading-tight">
                        {item.name}
                      </h4>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {item.subtitle}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-2">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          Participants
                        </span>
                        <span className="text-sm font-semibold">
                          {item.participants}
                        </span>
                      </div>
                    </AnimatedCard>
                  </Link>
                ))}
              </motion.div>

              <SwipingDots
                itemCount={liveTournaments.length}
                containerRef={tournamentContainerRef}
                activeColor="bg-primary"
              />
            </>
          )}
        </section>

        <section className="space-y-6">
          <h3 className="px-1 text-xl font-bold tracking-tight">
            Live Matches
          </h3>

          {isFeedLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1].map((i) => (
                <div key={i} className="card min-w-[85%] p-4 animate-pulse">
                  <div className="h-4 w-1/2 bg-[var(--color-surface-elevated)] rounded mb-4" />
                  <div className="flex justify-between items-center h-12 bg-[var(--color-surface-elevated)] rounded" />
                </div>
              ))}
            </div>
          ) : liveFeed.length === 0 ? (
            <div className="card flex flex-col items-center justify-center p-8 text-center bg-[var(--color-surface)] border-dashed border-2">
              <div className="w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center mb-3">
                <TimerIcon
                  size={24}
                  className="text-[var(--color-muted)] opacity-50"
                />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                No active matches
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Matches currently in progress will appear here.
              </p>
            </div>
          ) : (
            liveFeed.map((group) => (
              <OrgLiveMatchGroup
                key={group.tournamentId}
                group={group}
                resolveTeamLogo={resolveTeamLogo}
                onSelectMatch={setSelectedLiveMatch}
              />
            ))
          )}
        </section>
      </div>
      <LiveMatchViewerPopup
        isOpen={!!selectedLiveMatch}
        onClose={() => setSelectedLiveMatch(null)}
        match={
          selectedLiveMatch
            ? {
                ...selectedLiveMatch,
                teamA: {
                  players: (selectedLiveMatch.teamA?.name || "Team A").split(/\s+&\s+/),
                  images: resolveTeamLogo(selectedLiveMatch.teamA) ? [resolveTeamLogo(selectedLiveMatch.teamA) as string] : [],
                },
                teamB: {
                  players: (selectedLiveMatch.teamB?.name || "Team B").split(/\s+&\s+/),
                  images: resolveTeamLogo(selectedLiveMatch.teamB) ? [resolveTeamLogo(selectedLiveMatch.teamB) as string] : [],
                },
              }
            : null
        }
      />
    </Layout>
  );
}
