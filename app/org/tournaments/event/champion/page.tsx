"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, ShareIcon, TrophyIcon } from "@/components/Icons";
import { eventApi, EventResultStanding } from "@/lib/api/eventApi";
import { toQuery } from "@/lib/utils";
import {
  animate,
  motion,
  type PanInfo,
  useDragControls,
  useMotionValue,
} from "framer-motion";

const EXPANDED_HERO_GAP = 12;
const COLLAPSED_SHEET_PEEK = 112;
const SNAP_VELOCITY_THRESHOLD = 450;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "T") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function rankLabel(rank: number) {
  if (rank === 1) return "Winner";
  if (rank === 2) return "Runner-up";
  if (rank === 3) return "Third Place";
  return `Rank ${rank}`;
}

function rankBadgeClass(rank: number) {
  if (rank === 1) return "bg-[#ff8a32]";
  if (rank === 2) return "bg-zinc-500";
  if (rank === 3) return "bg-[#d68a3a]";
  return "bg-zinc-400";
}

function rankBadgeText(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return String(rank);
}

function getDisplayTournamentName(eventName: string, championName?: string | null) {
  const trimmed = eventName.trim();
  if (!trimmed || trimmed.toLowerCase() === "asd") {
    return championName ? `${championName} Tournament` : "Tournament Results";
  }
  return trimmed;
}

function ResultAvatar({
  imageUrl,
  name,
  fallbackClassName,
  imageClassName,
}: {
  imageUrl?: string | null;
  name: string;
  fallbackClassName: string;
  imageClassName: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && imageUrl !== failedUrl;
  const label = initials(name);

  if (showImage) {
    return (
      <img
        src={imageUrl || ""}
        alt={name}
        className={imageClassName}
        onError={() => setFailedUrl(imageUrl || null)}
      />
    );
  }

  return <div className={fallbackClassName}>{label}</div>;
}

export default function EventChampionPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ff7417] border-t-transparent" />
        </div>
      }
    >
      <EventChampionContent />
    </React.Suspense>
  );
}

function EventChampionContent() {
  const dragControls = useDragControls();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState("Event");
  const [champion, setChampion] = useState<EventResultStanding | null>(null);
  const [standings, setStandings] = useState<EventResultStanding[]>([]);
  const [eventState, setEventState] = useState<string | null>(null);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [expandedY, setExpandedY] = useState(0);
  const [collapsedY, setCollapsedY] = useState(0);
  const sheetY = useMotionValue(0);
  const sheetAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const isSheetCollapsedRef = useRef(false);
  const expandedYRef = useRef(0);
  const heroRef = useRef<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);

  const tournamentId = searchParams.get("tournamentId");
  const eventId = searchParams.get("eventId");
  const isUserManageRoute = pathname.startsWith("/user/manage/");
  const isUserViewerRoute = pathname.startsWith("/user/") && !isUserManageRoute;
  const viewOnly =
    isUserViewerRoute ||
    searchParams.get("viewOnly") === "1" ||
    searchParams.get("mode") === "view";

  const backHref =
    isUserManageRoute && tournamentId
      ? `/user/manage/tournament/detail${toQuery({ t: tournamentId })}`
      : isUserViewerRoute && tournamentId && eventId
        ? `/user/tournaments/event/matches${toQuery({ tournamentId, eventId })}`
        : viewOnly && tournamentId
          ? `/tournaments/detail${toQuery({ id: tournamentId, tab: "events" })}`
          : viewOnly
            ? "/user/tournaments"
            : `/org/tournaments/detail${toQuery({ t: tournamentId })}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const result = await eventApi.getEventResults(eventId);
        if (cancelled) return;
        if (result.event?.id !== eventId) {
          setEventName("Event");
          setChampion(null);
          setStandings([]);
          return;
        }

        setEventName(result.event?.name || "Event");
        setEventState(result.event?.eventState || null);
        setChampion(result.champion ?? null);
        setStandings(Array.isArray(result.standings) ? result.standings : []);
      } catch (error) {
        console.error("Failed to load event results", error);
        if (!cancelled) {
          setEventName("Event");
          setEventState(null);
          setChampion(null);
          setStandings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const isCompleted = eventState === "completed";
  const podiumStandings = useMemo(() => standings.slice(0, 3), [standings]);
  const displayEventName = getDisplayTournamentName(eventName, champion?.teamName);
  const championInitials = champion?.teamName ? initials(champion.teamName) : "FS";

  useLayoutEffect(() => {
    function updateSnapPoints() {
      const heroEl = heroRef.current;
      const sheetEl = sheetRef.current;
      if (!heroEl || !sheetEl) return;

      const rect = heroEl.getBoundingClientRect();
      const nextHeroBottom = rect.bottom;
      const measuredExpandedY = Math.max(0, nextHeroBottom + EXPANDED_HERO_GAP);
      const nextExpandedY =
        isSheetCollapsedRef.current && expandedYRef.current
          ? expandedYRef.current
          : measuredExpandedY;
      const nextCollapsedY = Math.max(
        nextExpandedY,
        window.innerHeight - COLLAPSED_SHEET_PEEK,
      );

      expandedYRef.current = nextExpandedY;
      setExpandedY(nextExpandedY);
      setCollapsedY(nextCollapsedY);
      sheetAnimationRef.current?.stop();
      sheetY.set(isSheetCollapsedRef.current ? nextCollapsedY : nextExpandedY);
    }

    updateSnapPoints();
    window.addEventListener("resize", updateSnapPoints);
    return () => window.removeEventListener("resize", updateSnapPoints);
  }, [loading, isCompleted, podiumStandings.length]);

  useEffect(() => {
    if (!expandedY || isSheetCollapsed) return;
    sheetY.set(expandedY);
  }, [expandedY, isSheetCollapsed, sheetY]);

  function snapTo(target: number, collapsed: boolean) {
    const nextY = Math.min(Math.max(target, expandedY), collapsedY);

    sheetAnimationRef.current?.stop();
    isSheetCollapsedRef.current = collapsed;
    if (collapsed) {
      setIsSheetCollapsed(true);
    }
    sheetAnimationRef.current = animate(sheetY, nextY, {
      type: "spring",
      stiffness: 440,
      damping: 42,
      mass: 0.9,
      onComplete: () => {
        if (!collapsed) {
          setIsSheetCollapsed(false);
        }
      },
    });
  }

  function handleSheetDragEnd(_: unknown, info: PanInfo) {
    const velocityY = info.velocity.y;
    const currentY = Math.min(collapsedY, Math.max(expandedY, sheetY.get()));
    const midpoint = (expandedY + collapsedY) / 2;

    if (currentY > midpoint || velocityY > SNAP_VELOCITY_THRESHOLD) {
      snapTo(collapsedY, true);
      return;
    }

    if (velocityY < -SNAP_VELOCITY_THRESHOLD) {
      snapTo(expandedY, false);
      return;
    }

    snapTo(expandedY, false);
  }

  return (
    <div className="min-h-screen bg-[#ff7417] text-[var(--color-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#ff7417]">
        <section
          ref={heroRef}
          className="relative z-10 min-h-[clamp(445px,54dvh,500px)] overflow-hidden bg-[#ff7417] text-white"
        >
          <div className="absolute inset-0 px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <Link
                href={backHref}
                className="grid h-10 w-10 place-content-center rounded-full bg-white/30 text-white shadow-sm backdrop-blur transition-colors hover:bg-white/40"
                aria-label="Back"
              >
                <ArrowLeftIcon size={20} className="text-white" />
              </Link>

              <button
                type="button"
                className="grid h-10 w-10 place-content-center rounded-full bg-white/30 text-white shadow-sm backdrop-blur transition-colors hover:bg-white/40"
                aria-label="Share"
              >
                <ShareIcon size={18} className="text-white" />
              </button>
            </div>
          </div>

          <div
            className="flex min-h-[clamp(445px,54dvh,500px)] flex-col items-center justify-center px-6 pb-[92px] pt-[calc(5.25rem+env(safe-area-inset-top))] text-center transition-[min-height,padding] duration-300 ease-out"
            style={{ minHeight: isSheetCollapsed ? collapsedY : undefined }}
          >
            <div className="mx-auto mb-2">
              <TrophyIcon size={62} className="text-yellow-300" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              CHAMPION!
            </h1>
            <p className="mt-2 text-sm font-medium text-white/90">
              {loading ? "Loading..." : displayEventName}
            </p>

            <div className="mt-5 flex flex-col items-center">
              <div className="relative">
                <ResultAvatar
                  imageUrl={champion?.avatarUrl}
                  name={champion?.teamName || championInitials}
                  imageClassName="h-[82px] w-[82px] rounded-full border-4 border-[#ffd34e] object-cover shadow-[0_0_0_5px_rgba(255,255,255,0.12)]"
                  fallbackClassName="flex h-[82px] w-[82px] items-center justify-center rounded-full border-4 border-[#ffd34e] bg-white/15 text-2xl font-black text-white shadow-[0_0_0_5px_rgba(255,255,255,0.12)]"
                />

                <div className="absolute -bottom-2.5 left-1/2 w-[76px] -translate-x-1/2 rounded-full bg-[#ffd34e] px-2 py-0.5 text-center text-[8px] font-black uppercase leading-none text-[#6b4b00] shadow-sm">
                  1st Place
                </div>
              </div>

              <p className="mt-[18px] text-2xl font-black text-white">
                {loading
                  ? "Loading..."
                  : isCompleted
                    ? champion?.teamName || "No Winner Yet"
                    : "Winners Unlock When Event Ends"}
              </p>
            </div>
          </div>
        </section>

        <motion.section
          ref={sheetRef}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragDirectionLock
          dragConstraints={{
            top: expandedY,
            bottom: collapsedY,
          }}
          dragElastic={0}
          dragMomentum={false}
          onDragEnd={handleSheetDragEnd}
          onDragStart={() => sheetAnimationRef.current?.stop()}
          style={{
            position: "fixed",
            top: 0,
            left: "50%",
            width: "min(100%, 430px)",
            height: expandedY ? `calc(100dvh - ${expandedY}px)` : "60dvh",
            x: "-50%",
            y: sheetY,
          }}
          className="relative z-30 flex flex-col overflow-hidden rounded-t-[28px] bg-white px-[20px] pb-[max(env(safe-area-inset-bottom),28px)] pt-5 will-change-transform"
        >
          <div
            className="-mx-[20px] -mt-5 cursor-grab touch-none select-none px-[20px] pb-5 pt-5 active:cursor-grabbing"
            onPointerDown={(event) => dragControls.start(event)}
          >
            <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-zinc-200" />
            <h2 className="text-[18px] font-bold text-zinc-800">Final Standings</h2>
          </div>

          <div className="mt-5 max-h-[52dvh] space-y-4 overflow-y-auto pb-1">
            {isCompleted ? (
              podiumStandings.map((team) => (
                <div
                  key={team.teamId}
                  className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-3.5 py-3.5 shadow-sm"
                >
                  <div className="relative">
                    <ResultAvatar
                      imageUrl={team.avatarUrl}
                      name={team.teamName}
                      imageClassName="h-[66px] w-[66px] rounded-full object-cover ring-4 ring-orange-100"
                      fallbackClassName="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-zinc-100 text-sm font-black text-zinc-700 ring-4 ring-orange-100"
                    />
                    <span
                      className={`absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[9px] font-black text-white ${rankBadgeClass(team.rank)}`}
                    >
                      {rankBadgeText(team.rank)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold leading-tight text-zinc-800">
                      {team.teamName}
                    </p>
                    <p
                      className={`text-sm font-medium leading-tight ${
                        team.rank === 1
                          ? "text-orange-500"
                          : team.rank === 2
                            ? "text-zinc-500"
                            : team.rank === 3
                              ? "text-orange-400"
                              : "text-[var(--color-muted)]"
                      }`}
                    >
                      {rankLabel(team.rank)}
                    </p>
                  </div>

                  <div className="w-16 pr-2 text-right">
                    <p className="text-lg font-black leading-none text-orange-500">
                      {team.wins}/{team.played}
                    </p>
                    <p className="mt-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      Wins
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">
                  Winners are not available yet
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  Once this event is completed, the final standings will appear here.
                </p>
              </div>
            )}
          </div>

        </motion.section>
      </div>
    </div>
  );
}
