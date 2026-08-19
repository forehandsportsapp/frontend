"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon, XIcon, TrophyIcon, UserIcon } from "@/components/Icons";
import { toQuery } from "@/lib/utils";
import { eventApi, EventResultStanding } from "@/lib/api/eventApi";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "T") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function EventChampionPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-600 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div></div>}>
      <EventChampionContent />
    </React.Suspense>
  );
}

function EventChampionContent() {
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState("Event");
  const [champion, setChampion] = useState<EventResultStanding | null>(null);
  const [standings, setStandings] = useState<EventResultStanding[]>([]);

  const tournamentId = searchParams.get("tournamentId");
  const eventId = searchParams.get("eventId");
  const viewOnly = searchParams.get("viewOnly") === "1" || searchParams.get("mode") === "view";
  const backHref = viewOnly
    ? "/user/tournaments"
    : `/org/tournaments/detail${toQuery({ t: tournamentId })}`;
  const fixtureHref = `/org/tournaments/event/fixture${toQuery({
    tournamentId: tournamentId || "",
    eventId: eventId || "",
  })}`;
  const matchesHref = `/org/tournaments/event/matches${toQuery({
    tournamentId: tournamentId || "",
    eventId: eventId || "",
    viewOnly: "1",
  })}`;

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
          console.warn("Ignored champion data for a mismatched event", {
            expectedEventId: eventId,
            receivedEventId: result.event?.id ?? null,
          });
          setEventName("Event");
          setChampion(null);
          setStandings([]);
          return;
        }
        setEventName(result.event?.name || "Event");
        setChampion(result.champion ?? null);
        setStandings(
          Array.isArray(result.standings) ? result.standings : [],
        );
      } catch (error) {
        console.error("Failed to load event results", error);
        if (!cancelled) {
          setEventName("Event");
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

  const visibleStandings = useMemo(
    () => (isExpanded ? standings : standings.slice(0, 3)),
    [isExpanded, standings],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-600 text-[var(--color-text)]">
      <div className="flex items-center justify-between p-4">
        <Link
          href={backHref}
          className="p-2 text-white"
        >
          <ArrowLeftIcon size={20} />
        </Link>
        <Link
          href={backHref}
          className="p-2 text-white"
        >
          <XIcon size={20} />
        </Link>
      </div>

      <div className="px-6 pb-8 text-center text-white">
        <div className="relative mb-6">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <TrophyIcon size={56} className="text-yellow-300" />
          </div>
          <h1 className="mb-2 pt-16 text-4xl font-bold text-white">CHAMPION!</h1>
          <p className="text-lg text-white/90">
            {loading ? "Loading..." : eventName}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-500">
              Leaderboard
            </span>
            <Link
              href={fixtureHref}
              className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              Fixtures
            </Link>
            <Link
              href={matchesHref}
              className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              Matches
            </Link>
          </div>
        </div>

        <div className="relative mb-4 inline-block">
          {champion?.avatarUrl ? (
            <img
              src={champion.avatarUrl}
              alt={champion.teamName}
              className="mx-auto h-32 w-32 rounded-full border-4 border-white/40 object-cover"
            />
          ) : (
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/40 bg-white/20 backdrop-blur-sm">
              <UserIcon size={56} className="text-white" />
            </div>
          )}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1">
            <span className="text-xs font-bold text-orange-500">1ST PLACE</span>
          </div>
        </div>

        <h2 className="mb-2 text-3xl font-bold text-white">
          {loading ? "Loading..." : champion?.teamName || "No Champion Yet"}
        </h2>
      </div>

      <div className="min-h-[50vh] rounded-t-3xl bg-[var(--color-surface)] p-6 text-[var(--color-text)]">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
          Final Standings
        </h3>

        <div className="space-y-3">
          {visibleStandings.map((team) => (
            <div key={team.teamId} className="card flex items-center gap-4 p-4">
              {team.avatarUrl ? (
                <img
                  src={team.avatarUrl}
                  alt={team.teamName}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-bold text-white">
                  {initials(team.teamName)}
                </div>
              )}

              <div className="flex-1">
                <p className="font-medium text-[var(--color-text)]">
                  {team.teamName}
                </p>
                <p
                  className={`text-sm ${
                    team.rank === 1
                      ? "text-primary"
                      : team.rank === 2
                        ? "text-blue-500"
                        : team.rank === 3
                          ? "text-green-500"
                          : "text-[var(--color-muted)]"
                  }`}
                >
                  {team.label ?? `Rank ${team.rank}`}
                </p>
              </div>

              <div className="text-right">
                <p className="font-bold text-[var(--color-text)]">
                  {team.wins}/{team.played}
                </p>
                <p className="text-xs text-[var(--color-muted)]">Wins</p>
              </div>
            </div>
          ))}
        </div>

        {isExpanded && standings.length > 0 && (
          <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <table className="min-w-full text-left text-sm text-[var(--color-text)]">
              <thead className="bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Team</th>
                  <th className="px-3 py-2 font-semibold">P</th>
                  <th className="px-3 py-2 font-semibold">W</th>
                  <th className="px-3 py-2 font-semibold">L</th>
                  <th className="px-3 py-2 font-semibold">Set +/-</th>
                  <th className="px-3 py-2 font-semibold">Point +/-</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr
                    key={row.teamId}
                    className="border-t border-[var(--color-border)] odd:bg-[var(--color-surface)] even:bg-[var(--color-surface-elevated)]/40"
                  >
                    <td className="px-3 py-2 font-medium">{row.rank}</td>
                    <td className="px-3 py-2">{row.teamName}</td>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                      {row.played}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-success)]">
                      {row.wins}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-error)]">
                      {row.losses}
                    </td>
                    <td className="px-3 py-2">{row.setDiff}</td>
                    <td className="px-3 py-2">{row.pointDiff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="mt-6 block w-full rounded-xl py-4 text-center font-semibold text-white"
          style={{ background: "var(--gradient-orange)" }}
        >
          {isExpanded ? "View Less Details" : "View More Details"}
        </button>
      </div>
    </div>
  );
}
