"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, MapPinIcon, TimerIcon } from "@/components/Icons";
import { userApi } from "@/lib/api/userApi";

type UpcomingMatch = {
  id: string;
  tournamentId: string;
  month: string;
  day: string;
  title: string;
  sport: string;
  category: string;
  time: string;
  venue: string;
  court?: string | null;
  accentColor: string;
};

const ACCENT_COLORS = [
  "bg-lime-300",
  "bg-orange-500",
];

function UpcomingCourtCard({ match }: { match: UpcomingMatch }) {
  return (
    <Link href={`/tournaments/detail?id=${match.tournamentId}`} className="block">
      <div className="flex overflow-hidden border border-border bg-surface shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5">
        <div className={`flex min-w-[48px] shrink-0 flex-col items-center justify-center px-2 py-3 text-center text-black ${match.accentColor}`}>
          <span className="text-[11px] font-medium leading-none">
            {match.month}
          </span>
          <span className="mt-1 text-[16px] font-bold leading-none">
            {match.day}
          </span>
        </div>

        <div className="flex flex-1 items-start justify-between gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[var(--color-text)]">
              {match.title}
            </p>
            <p className="mt-1 truncate text-[11px] text-[var(--color-text-secondary)]">
              {match.sport} {"\u2022"} {match.category}
            </p>

            <div className="pt-3 text-[10px] text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <TimerIcon size={11} className="text-muted" />
                  {match.time}
                </span>
                <span className="text-border">{"\u2022"}</span>
                <span className="flex items-center gap-1">
                  <MapPinIcon size={11} className="text-muted" />
                  {match.venue}
                </span>
                {match.court && (
                  <>
                    <span className="text-border">{"\u2022"}</span>
                    <span className="flex items-center gap-1">
                      {match.court}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pt-1 text-text">
            <ChevronRightIcon size={18} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function NextOnCourtSection() {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchMatches = async () => {
      try {
        const data = await userApi.getUpcomingMatches();
        if (active && data) {
          const formatted = data.map((m: any, index: number) => {
            const date = new Date(m.scheduledAt || Date.now());
            return {
              id: m.id,
              tournamentId: m.tournamentId || "",
              month: date.toLocaleString("default", { month: "short" }),
              day: date.getDate().toString(),
              title: m.leagueTitle || "Tournament Match",
              sport: m.type || "Match",
              category: m.eventName || "Event",
              time: date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
              venue: m.venue || "TBD",
              court: m.court || null,
              accentColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
            };
          });
          setMatches(formatted);
        }
      } catch (error) {
        console.error("Failed to fetch upcoming matches", error);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void fetchMatches();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-3">
      <h3 className="px-1 text-lg font-bold text-[var(--color-text)]">Next On Court</h3>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-[90px] w-full animate-pulse border border-border bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)]"
            />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
            <TimerIcon size={18} className="text-[var(--color-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            No upcoming matches scheduled.
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Matches will appear here once they are generated.
          </p>
        </div>
      ) : (
        matches.map((match) => (
          <UpcomingCourtCard key={match.id} match={match} />
        ))
      )}
    </section>
  );
}
