"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { userApi } from "@/lib/api/userApi";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

type PastMatch = {
  id?: string;
  type: string;
  timeAgo: string;
  status: string;
  leagueTitle: string;
  leftTeamName: string;
  rightTeamName: string;
  leftTeamPlayers: string[];
  rightTeamPlayers: string[];
  leftTeamImages?: string[];
  rightTeamImages?: string[];
  score: string;
  scoreLabel: string;
  accentColor: string;
};

function avatarDataUri(
  seed: string,
  accent: string,
  skin: string,
  shirt: string,
) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="72" height="72" rx="36" fill="url(#bg)" />
      <circle cx="36" cy="26" r="13" fill="${skin}" />
      <path d="M17 67c2-13 11-20 19-20s17 7 19 20" fill="${shirt}" />
      <path d="M23 25c2-10 10-16 13-16 8 0 14 5 16 15-2-2-4-4-8-4-5 0-9 3-11 6-2-3-5-4-10-1Z" fill="#2f241f" />
      <circle cx="31" cy="27" r="1.2" fill="#2f241f" />
      <circle cx="41" cy="27" r="1.2" fill="#2f241f" />
      <path d="M31 34c1.8 1.4 7.2 1.4 9 0" stroke="#8f5e45" stroke-width="1.8" stroke-linecap="round" />
      <text x="36" y="63" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="700" fill="#ffffff" opacity="0.8">${seed}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const avatarPalette = [
  { accent: "#fde68a", skin: "#efc39d", shirt: "#f97316" },
  { accent: "#bfdbfe", skin: "#d9a885", shirt: "#0ea5e9" },
  { accent: "#fed7aa", skin: "#f2c9a8", shirt: "#fb923c" },
  { accent: "#c7d2fe", skin: "#e2b38f", shirt: "#6366f1" },
];

function buildAvatar(name: string, index: number, provided?: string) {
  if (provided) return provided;
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const palette = avatarPalette[index % avatarPalette.length];
  return avatarDataUri(initials, palette.accent, palette.skin, palette.shirt);
}

function TeamAvatarStack({
  players,
  images,
}: {
  players: string[];
  images?: string[];
}) {
  return (
    <div className="flex items-center justify-center">
      {players.slice(0, 2).map((player, index) => (
        <div
          key={`${player}-${index}`}
          className={`relative ${index === 0 ? "z-10" : "-ml-3.5 z-20"}`}
        >
          <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            <Image
              src={buildAvatar(player, index, images?.[index])}
              alt={player}
              fill
              sizes="40px"
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PastMatchCard({ match }: { match: PastMatch }) {
  return (
    <article className="w-full overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${match.accentColor}`} />

        <div className="flex-1 px-3.5 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-medium text-[var(--color-text)]">{match.type}</span>
                <span className="text-[var(--color-text-secondary)]">{"\u2022"}</span>
                <span className="text-[var(--color-text-secondary)]">{match.timeAgo}</span>
              </div>
              <h4 className="mt-2 truncate text-[15px] font-semibold text-[var(--color-text)]">
                {match.leagueTitle}
              </h4>
            </div>

            <span className="shrink-0 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {match.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div className="flex min-w-0 flex-col items-center text-center">
              <TeamAvatarStack
                players={match.leftTeamPlayers}
                images={match.leftTeamImages}
              />
              <p className="mt-2 w-full truncate text-[13px] font-medium text-[var(--color-text)]">
                {match.leftTeamName}
              </p>
            </div>

            <div className="flex min-w-[88px] flex-col items-center">
              <div className="text-[28px] font-extrabold leading-none tracking-[-0.04em] text-[var(--color-text)]">
                {match.score}
              </div>
              <p className="mt-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                {match.scoreLabel}
              </p>
            </div>

            <div className="flex min-w-0 flex-col items-center text-center">
              <TeamAvatarStack
                players={match.rightTeamPlayers}
                images={match.rightTeamImages}
              />
              <p className="mt-2 w-full truncate text-[13px] font-medium text-[var(--color-text)]">
                {match.rightTeamName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffInMs = now.getTime() - past.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} Days Ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} Week${weeks > 1 ? "s" : ""} Ago`;
  }
  const months = Math.floor(diffInDays / 30);
  return `${months} Month${months > 1 ? "s" : ""} Ago`;
}

const accentColors = [
  "bg-yellow-400",
  "bg-lime-400",
  "bg-amber-400",
  "bg-orange-400",
];

export default function PastMatchesPage() {
  const [matches, setMatches] = useState<PastMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchMatches = async () => {
      try {
        const data = await userApi.getPastMatches();
        if (!active) return;

        const formattedMatches = data.map((m, idx) => {
          const leftPlayersRaw = Array.isArray(m.leftTeamPlayers)
            ? m.leftTeamPlayers
            : Array.isArray(m.leftTeam?.players)
              ? m.leftTeam.players
              : Array.isArray(m.leftTeam?.participants)
                ? m.leftTeam.participants
                : [];
          const rightPlayersRaw = Array.isArray(m.rightTeamPlayers)
            ? m.rightTeamPlayers
            : Array.isArray(m.rightTeam?.players)
              ? m.rightTeam.players
              : Array.isArray(m.rightTeam?.participants)
                ? m.rightTeam.participants
                : [];

          const normalizedLeftPlayers = leftPlayersRaw.map((player: any) =>
            typeof player === "string"
              ? player
              : player?.name ||
                  player?.fullName ||
                  player?.displayName ||
                  player?.user?.name ||
                  "Player",
          );
          const normalizedRightPlayers = rightPlayersRaw.map((player: any) =>
            typeof player === "string"
              ? player
              : player?.name ||
                  player?.fullName ||
                  player?.displayName ||
                  player?.user?.name ||
                  "Player",
          );

          const leftImages = leftPlayersRaw
            .map(
              (player: any) =>
                player?.image ||
                player?.avatarUrl ||
                player?.profilePicUrl ||
                player?.photoUrl ||
                player?.avatar ||
                player?.user?.profilePicUrl,
            )
            .filter(Boolean);
          const rightImages = rightPlayersRaw
            .map(
              (player: any) =>
                player?.image ||
                player?.avatarUrl ||
                player?.profilePicUrl ||
                player?.photoUrl ||
                player?.avatar ||
                player?.user?.profilePicUrl,
            )
            .filter(Boolean);

          let eventName =
            m.event?.name || m.tournament?.name || m.leagueTitle || "Match";
          let categoryStr = m.event?.category || "Unknown";
          let typeStr =
            m.type ||
            m.event?.teamType?.label ||
            (m.event?.format === "doubles" ? "Doubles" : "Singles");

          let statusLabel = m.status || "PLAYED";
          if (m.winningTeamId) {
            const leftWon = m.winningTeamId === m.leftTeam?.id;
            const rightWon = m.winningTeamId === m.rightTeam?.id;
            statusLabel = leftWon ? "TEAM A WON" : rightWon ? "TEAM B WON" : "PLAYED";
          }

          let scoreStr = "0 - 0";
          if (m.score) {
            if (typeof m.score === "string") scoreStr = m.score;
            else if (m.score.sets) {
              scoreStr = m.score.sets.map((s: any) => `${s.teamA}-${s.teamB}`).join(" ");
            } else if (m.score.teamA !== undefined) {
              scoreStr = `${m.score.teamA} - ${m.score.teamB}`;
            }
          } else if (Array.isArray(m.sets)) {
            let teamASets = 0;
            let teamBSets = 0;
            const setsByNumber = new Map<number, any>();
            m.sets.forEach((set: any) => {
              const setNumber = Number(set?.setNumber ?? set?.set_integer);
              if (!Number.isFinite(setNumber)) return;
              const existing = setsByNumber.get(setNumber);
              const score = Number(set?.teamAScore || 0) + Number(set?.teamBScore || 0);
              const existingScore = existing
                ? Number(existing?.teamAScore || 0) + Number(existing?.teamBScore || 0)
                : -1;
              if (!existing || score >= existingScore) setsByNumber.set(setNumber, set);
            });
            [...setsByNumber.values()]
              .filter((set: any) => set?.setStatus === "completed")
              .forEach((set: any) => {
                if (Number(set.teamAScore) > Number(set.teamBScore)) teamASets += 1;
                if (Number(set.teamBScore) > Number(set.teamAScore)) teamBSets += 1;
              });
            scoreStr = `${teamASets} - ${teamBSets}`;
          }

          return {
            id: m.id || String(idx),
            type: `${typeStr} • ${categoryStr}`,
            timeAgo:
              m.endedAt || m.endTime
                ? getTimeAgo(m.endedAt || m.endTime)
                : "Recently",
            status: statusLabel,
            leagueTitle: eventName,
            leftTeamName:
              m.leftTeam?.name ||
              normalizedLeftPlayers.join(" & ") ||
              "Team A",
            rightTeamName:
              m.rightTeam?.name ||
              normalizedRightPlayers.join(" & ") ||
              "Team B",
            leftTeamPlayers: normalizedLeftPlayers.length
              ? normalizedLeftPlayers
              : ["Team A"],
            rightTeamPlayers: normalizedRightPlayers.length
              ? normalizedRightPlayers
              : ["Team B"],
            leftTeamImages: leftImages,
            rightTeamImages: rightImages,
            score: scoreStr,
            scoreLabel: "Final Score",
            accentColor: accentColors[idx % accentColors.length],
          };
        });

        setMatches(formattedMatches);
      } catch (err) {
        console.error("Failed to load past matches", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg)]/90 px-4 py-4 backdrop-blur-md pb-6 pt-12 text-[var(--color-text)] border-b border-neutral-200/50">
        <div className="flex items-center gap-3">
          <Link
            href="/user/home"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm hover:bg-neutral-100 transition-colors"
          >
            <ChevronLeftIcon size={24} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Past Matches</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-32">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 w-full animate-pulse rounded-2xl bg-neutral-200" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-[var(--color-text-secondary)]">
            <p className="text-lg font-medium">No Past Matches</p>
            <p className="text-sm">You haven't played any matches yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <PastMatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </div>
  );
}
