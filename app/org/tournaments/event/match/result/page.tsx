"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { removeItem } from "@/lib/storage";
import { TrophyIcon, UserIcon } from "@/components/Icons";
import { motion } from "framer-motion";
import { toQuery } from "@/lib/utils";
import { matchApi } from "@/lib/api/matchApi";

type Player = { id?: string; name: string; avatarUrl?: string | null };

function getTeamPlayers(teamData: any): Player[] {
  const players = (teamData?.participants ?? [])
    .map((p: any) => p?.user)
    .filter(Boolean)
    .map((u: any) => ({
      id: u.id,
      name: u.name ?? "Player",
      avatarUrl: u.profilePicUrl ?? null,
    }));
  return players;
}

function getTeamName(players: Player[]): string {
  if (players.length === 0) return "Unknown Team";
  return players.map((p) => p.name).join(" / ");
}

export default function OrgMatchResultPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchParams, setSearchParams] = useState<URLSearchParams>(
    new URLSearchParams(),
  );
  const [loading, setLoading] = useState(true);
  const [matchInfo, setMatchInfo] = useState<any | null>(null);

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const tournamentId = searchParams.get("tournamentId");
  const matchId = searchParams.get("matchId");
  const eventId = searchParams.get("eventId");
  const isUserManageRoute = pathname.startsWith("/user/manage/");
  const isUserViewerRoute =
    pathname.startsWith("/user/") && !isUserManageRoute;
  const viewOnly =
    isUserViewerRoute ||
    searchParams.get("viewOnly") === "1" ||
    searchParams.get("mode") === "view";
  const viewerMatchesPath = isUserManageRoute
    ? "/user/manage/tournament/event/matches"
    : isUserViewerRoute
    ? "/user/tournaments/event/matches"
    : "/org/tournaments/event/matches";
  const detailPath = isUserManageRoute
    ? "/user/manage/tournament/detail"
    : "/org/tournaments/detail";
  const viewerMatchesQuery = {
    tournamentId,
    eventId,
    viewOnly: isUserViewerRoute || isUserManageRoute ? undefined : "1",
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!matchId) {
        setLoading(false);
        return;
      }
      try {
        const info = await matchApi.getMatchInfo(matchId);
        if (!cancelled) setMatchInfo(info);
      } catch (error) {
        console.error("Failed to load match result", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const computed = useMemo(() => {
    const teamAPlayers = getTeamPlayers(matchInfo?.teamAData);
    const teamBPlayers = getTeamPlayers(matchInfo?.teamBData);
    const teamAName = getTeamName(teamAPlayers);
    const teamBName = getTeamName(teamBPlayers);

    const sets: Array<[number, number]> = (matchInfo?.sets ?? [])
      .slice()
      .sort((a: any, b: any) => (a?.setNumber ?? 0) - (b?.setNumber ?? 0))
      .map((s: any) => [s?.teamAScore ?? 0, s?.teamBScore ?? 0]);

    let winsA = 0;
    let winsB = 0;
    for (const [a, b] of sets) {
      if (a > b) winsA += 1;
      else if (b > a) winsB += 1;
    }

    const winnerId = matchInfo?.winnerId ?? null;
    const winnerSide =
      winnerId && winnerId === matchInfo?.teamA
        ? 0
        : winnerId && winnerId === matchInfo?.teamB
          ? 1
          : winsA === winsB
            ? null
            : winsA > winsB
              ? 0
              : 1;

    const winnerName =
      winnerSide === 0
        ? teamAName
        : winnerSide === 1
          ? teamBName
          : "Match Complete";
    const winnerPlayers = winnerSide === 0 ? teamAPlayers : teamBPlayers;
    const winnerAvatar =
      winnerPlayers.find((p) => p.avatarUrl)?.avatarUrl ?? null;
    const scoreLine =
      sets.length > 0
        ? sets.map(([a, b]) => `${a}-${b}`).join(" • ")
        : "No sets recorded";

    return { winnerName, winnerAvatar, scoreLine };
  }, [matchInfo]);

  return (
    <Layout
      title={viewOnly ? "Match Result" : "Live Match"}
      showBack
      showBottomNav={false}
      onBack={() =>
        router.replace(
          viewOnly
            ? viewerMatchesPath + toQuery(viewerMatchesQuery)
            : detailPath + toQuery({ t: tournamentId }),
        )
      }
    >
      <div className="relative min-h-screen">
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md" />

        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 12 }}
            className="mb-4 text-[#F7B31B]"
          >
            <TrophyIcon size={52} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-semibold text-white/80"
          >
            Winner
          </motion.p>

          <div className="mt-3">
            {computed.winnerAvatar ? (
              <img
                src={computed.winnerAvatar}
                alt={computed.winnerName}
                className="mx-auto h-16 w-16 rounded-full border-2 border-white/60 object-cover"
              />
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/60 bg-white/15">
                <UserIcon size={28} className="text-white" />
              </div>
            )}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-3 text-2xl font-bold text-white"
          >
            {loading ? "Loading..." : computed.winnerName}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-2 text-sm text-white/80"
          >
            Final Score: {loading ? "Loading..." : computed.scoreLine}
          </motion.p>
        </div>

        {!viewOnly && (
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.4 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-transparent px-6 pb-6 pt-4"
          >
            <button
              type="button"
              onClick={() => {
                if (matchId) removeItem(`match:${matchId}:state`);
                router.replace(
                  detailPath + toQuery({ t: tournamentId }),
                );
              }}
              className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-white shadow-lg active:scale-[0.98] transition"
            >
              Confirm Results
            </button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
