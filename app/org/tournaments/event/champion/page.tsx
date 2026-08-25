"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, ClipboardIcon, ShareIcon, TrophyIcon, XIcon } from "@/components/Icons";
import { eventApi, EventResultStanding } from "@/lib/api/eventApi";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { toQuery } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import {
  animate,
  motion,
  type PanInfo,
  useDragControls,
  useMotionValue,
} from "framer-motion";

const SNAP_VELOCITY_THRESHOLD = 450;
const MIN_SNAP_DISTANCE = 100;

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
  const [tournamentName, setTournamentName] = useState("");
  const [champion, setChampion] = useState<EventResultStanding | null>(null);
  const [standings, setStandings] = useState<EventResultStanding[]>([]);
  const [eventState, setEventState] = useState<string | null>(null);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [expandedY, setExpandedY] = useState(0);
  const [collapsedY, setCollapsedY] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const sheetY = useMotionValue(0);
  const sheetAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const isCollapsedRef = useRef(false);

  const tournamentId = searchParams.get("tournamentId");
  const eventId = searchParams.get("eventId");
  const isUserManageRoute = pathname.startsWith("/user/manage/");
  const isUserViewerRoute = pathname.startsWith("/user/") && !isUserManageRoute;

  const backHref =
    isUserManageRoute && tournamentId
      ? `/user/manage/tournament/detail${toQuery({ t: tournamentId })}`
      : tournamentId
        ? `/tournaments/detail${toQuery({ id: tournamentId, tab: "events" })}`
        : "/tournaments";

  const matchesHref =
    isUserManageRoute && tournamentId && eventId
      ? `/user/manage/tournament/event/matches${toQuery({ tournamentId, eventId })}`
      : isUserViewerRoute && tournamentId && eventId
        ? `/user/tournaments/event/matches${toQuery({ tournamentId, eventId })}`
        : `/org/tournaments/event/matches${toQuery({ tournamentId, eventId })}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!eventId) {
        setLoading(false);
        return;
      }
      try {
        const result = await eventApi.getEventResults(eventId);
        const resultTournamentName =
          result.tournamentName || result.event?.tournamentName || "";
        const tournamentResult =
          !resultTournamentName && tournamentId
            ? await tournamentApi.getInfo(tournamentId).catch(() => null)
            : null;
        if (cancelled) return;
        if (result.event?.id !== eventId) {
          setEventName("Event"); setTournamentName(""); setChampion(null); setStandings([]);
          return;
        }
        setEventName(result.event?.name || "Event");
        setTournamentName(resultTournamentName || tournamentResult?.name || "");
        setEventState(result.event?.eventState || null);
        setChampion(result.champion ?? null);
        setStandings(Array.isArray(result.standings) ? result.standings : []);
      } catch {
        if (!cancelled) {
          setEventName("Event"); setTournamentName(""); setEventState(null); setChampion(null); setStandings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [eventId, tournamentId]);

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";

  function handleOpenShareSheet() {
    setIsCopied(false);
    setIsShareSheetOpen(true);
  }

  async function handleCopyShareLink() {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
    }
  }

  const isCompleted = eventState === "completed";
  const podiumStandings = useMemo(() => standings.slice(0, 3), [standings]);
  const displayEventName =
    tournamentName || getDisplayTournamentName(eventName, champion?.teamName);
  const championInitials = champion?.teamName ? initials(champion.teamName) : "FS";

  useLayoutEffect(() => {
    function recalc() {
      const vh = window.innerHeight;
      
      // Calculate fixed peek height for the collapsed sheet
      // 86px is exactly tall enough to show the drag handle and "Final Standings" title, keeping all data hidden
      const peek = 86;
      
      // Calculate snap points directly based on viewport, avoiding any circular dependency with DOM elements
      // Minimum 320px needed for the hero content to display nicely without squishing
      let nextExpandedY = Math.max(320, vh * 0.45);
      let nextCollapsedY = vh - peek;
      
      // Guarantee drag range
      if (nextCollapsedY - nextExpandedY < MIN_SNAP_DISTANCE) {
        nextExpandedY = nextCollapsedY - MIN_SNAP_DISTANCE;
      }

      setExpandedY(nextExpandedY);
      setCollapsedY(nextCollapsedY);

      sheetAnimRef.current?.stop();
      sheetY.set(isCollapsedRef.current ? nextCollapsedY : nextExpandedY);
      setIsMounted(true);
    }

    recalc();

    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [sheetY]);

  useEffect(() => {
    if (!expandedY || isSheetCollapsed) return;
    sheetY.set(expandedY);
  }, [expandedY, isSheetCollapsed, sheetY]);

  function snapTo(target: number, collapsed: boolean) {
    const clamped = Math.min(Math.max(target, expandedY), collapsedY);
    sheetAnimRef.current?.stop();
    isCollapsedRef.current = collapsed;
    if (collapsed) setIsSheetCollapsed(true);
    sheetAnimRef.current = animate(sheetY, clamped, {
      type: "spring",
      stiffness: 440,
      damping: 42,
      mass: 0.9,
      onComplete: () => { if (!collapsed) setIsSheetCollapsed(false); },
    });
  }

  function handleSheetDragEnd(_: unknown, info: PanInfo) {
    const vy = info.velocity.y;
    const cy = Math.min(collapsedY, Math.max(expandedY, sheetY.get()));
    const mid = (expandedY + collapsedY) / 2;

    if (cy > mid || vy > SNAP_VELOCITY_THRESHOLD) {
      snapTo(collapsedY, true);
    } else if (vy < -SNAP_VELOCITY_THRESHOLD) {
      snapTo(expandedY, false);
    } else {
      snapTo(expandedY, false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#ff7417] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/80 border-t-transparent" />
          <p className="text-sm font-semibold text-white/90">
            Loading results...
          </p>
        </div>
      </div>
    );
  }

  // The sheet's height dynamically fills the screen below its current snap point
  const sheetHeight = expandedY ? `calc(100dvh - ${expandedY}px + 1px)` : "65dvh";

  return (
    <div className="min-h-dvh bg-[#ff7417] text-[var(--color-text)]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#ff7417]">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        {/* By binding height directly to `sheetY`, the hero section exactly
            fills the visible space above the sheet. Flexbox justify-center
            will thus automatically keep the content perfectly vertically centered
            at all times, even during the drag/minimize animation! */}
        <motion.section
          className="relative z-10 flex flex-col items-center justify-center overflow-hidden bg-[#ff7417] text-white"
          style={{
            height: isMounted ? sheetY : "50dvh",
          }}
        >
          <div className="absolute inset-x-0 top-0 z-10 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <Link
                href={backHref}
                className="grid h-10 w-10 place-content-center rounded-full bg-white/30 text-white shadow-sm backdrop-blur transition-colors hover:bg-white/40 active:bg-white/50"
                aria-label="Back"
              >
                <ArrowLeftIcon size={20} className="text-white" />
              </Link>
              <button
                type="button"
                onClick={handleOpenShareSheet}
                className="grid h-10 w-10 place-content-center rounded-full bg-white/30 text-white shadow-sm backdrop-blur transition-colors hover:bg-white/40 active:bg-white/50"
                aria-label="Share"
              >
                <ShareIcon size={18} className="text-white" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center px-6 text-center w-full mt-8">
            <div className="mx-auto mb-2">
              <TrophyIcon size={58} className="text-yellow-300" />
            </div>

            <h1 className="text-[clamp(1.6rem,4.5dvh,2.25rem)] font-black tracking-tight text-white">
              CHAMPION!
            </h1>

            <p className="mt-1.5 text-[clamp(0.75rem,1.8dvh,0.9rem)] font-medium text-white/90">
              {loading ? "Loading…" : displayEventName}
            </p>

            <div className="mt-[clamp(12px,2.5dvh,20px)] flex flex-col items-center">
              <div className="relative">
                <ResultAvatar
                  imageUrl={champion?.avatarUrl}
                  name={champion?.teamName || championInitials}
                  imageClassName="h-[clamp(64px,9dvh,82px)] w-[clamp(64px,9dvh,82px)] rounded-full border-4 border-[#ffd34e] object-cover shadow-[0_0_0_5px_rgba(255,255,255,0.12)]"
                  fallbackClassName="flex h-[clamp(64px,9dvh,82px)] w-[clamp(64px,9dvh,82px)] items-center justify-center rounded-full border-4 border-[#ffd34e] bg-white/15 text-[clamp(1rem,2.5dvh,1.5rem)] font-black text-white shadow-[0_0_0_5px_rgba(255,255,255,0.12)]"
                />
                <div className="absolute -bottom-2.5 left-1/2 w-[76px] -translate-x-1/2 rounded-full bg-[#ffd34e] px-2 py-0.5 text-center text-[8px] font-black uppercase leading-none text-[#6b4b00] shadow-sm">
                  1st Place
                </div>
              </div>

              <p className="mt-[clamp(12px,2dvh,18px)] text-[clamp(1rem,3.5dvh,1.4rem)] font-black text-white">
                {loading
                  ? "Loading…"
                  : isCompleted
                    ? champion?.teamName || "No Winner Yet"
                    : "Winners Unlock When Event Ends"}
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── Bottom sheet ────────────────────────────────────────────────── */}
        <motion.section
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragDirectionLock
          dragConstraints={{ top: expandedY, bottom: collapsedY }}
          dragElastic={0}
          dragMomentum={false}
          onDragEnd={handleSheetDragEnd}
          onDragStart={() => sheetAnimRef.current?.stop()}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            margin: "0 auto",
            width: "100%",
            maxWidth: "430px",
            height: sheetHeight,
            y: sheetY,
          }}
          className="relative z-30 flex flex-col overflow-hidden rounded-t-[28px] bg-[var(--color-surface)] pt-5 will-change-transform shadow-[0_-6px_18px_rgba(0,0,0,0.12)] dark:shadow-[0_-6px_18px_rgba(0,0,0,0.22)]"
        >
          <div
            className="cursor-grab touch-none select-none px-5 pb-4 pt-0 active:cursor-grabbing"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--color-border)]" />
            <h2 className="text-[18px] font-bold text-[var(--color-text)]">Final Standings</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),28px)]">
            <div className="space-y-3 pb-1">
              {isCompleted ? (
                podiumStandings.map((team) => (
                  <div
                    key={team.teamId}
                    className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3.5 py-3.5 shadow-sm"
                  >
                    <div className="relative flex-shrink-0">
                      <ResultAvatar
                        imageUrl={team.avatarUrl}
                        name={team.teamName}
                        imageClassName="h-[66px] w-[66px] rounded-full object-cover ring-4 ring-orange-100 dark:ring-orange-950/40"
                        fallbackClassName="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-black text-[var(--color-text)] ring-4 ring-orange-100 dark:ring-orange-950/40"
                      />
                      <span
                        className={`absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--color-surface-elevated)] text-[9px] font-black text-white ${rankBadgeClass(team.rank)}`}
                      >
                        {rankBadgeText(team.rank)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold leading-tight text-[var(--color-text)]">
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
                                : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {rankLabel(team.rank)}
                      </p>
                    </div>

                    <div className="w-16 flex-shrink-0 pr-2 text-right">
                      <p className="text-lg font-black leading-none text-orange-500">
                        {team.wins}/{team.played}
                      </p>
                      <p className="mt-1 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Wins
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] mb-2">
                    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-muted)]">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </div>
                  <h3 className="text-[17px] font-bold text-[var(--color-text)]">
                    Winners are not available yet
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Once this event is completed, the final standings will appear here.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center pb-6">
              <Link
                href={matchesHref}
                className="flex h-14 w-full items-center justify-center rounded-[28px] bg-[#ff7a1a] px-6 text-[17px] font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
              >
                View More Details
              </Link>
            </div>
          </div>
        </motion.section>
      </div>

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
            aria-labelledby="share-champion-title"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="min-w-0">
                <h2
                  id="share-champion-title"
                  className="text-[20px] font-bold text-[var(--color-text)]"
                >
                  Share Champion
                </h2>
                <p className="mt-1 truncate text-[13px] text-[var(--color-text-secondary)]">
                  {displayEventName}
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
                  value={shareUrl || window.location.href}
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
                onClick={() => void handleCopyShareLink()}
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
