"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LiveMatchReplica from "@/components/QuickMatch/LiveMatchReplica";
import { getItem, setItem } from "@/lib/storage";
import type {
  LiveMatchStateData,
  MatchConfigData,
  ScoreEventData,
} from "@/lib/models";
import {
  applyFault,
  applyRally,
  createInitialLiveState,
  maybeAdvanceSet,
} from "@/lib/matchEngine";
import { toQuery } from "@/lib/utils";
import { matchApi } from "@/lib/api/matchApi";
import { tournamentApi } from "@/lib/api/tournamentApi";

type SidePlayer = { name: string; initials: string; avatarUrl?: string | null };

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "P";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function ensurePlayers(players: unknown, format: MatchConfigData["format"]) {
  const fallbackSingles = {
    side0: [{ initials: "P1", name: "Player 1", avatarUrl: null }],
    side1: [{ initials: "P2", name: "Player 2", avatarUrl: null }],
  };
  const fallbackDoubles = {
    side0: [
      { initials: "P1", name: "Player 1", avatarUrl: null },
      { initials: "P3", name: "Player 3", avatarUrl: null },
    ],
    side1: [
      { initials: "P2", name: "Player 2", avatarUrl: null },
      { initials: "P4", name: "Player 4", avatarUrl: null },
    ],
  };

  const p = players as { side0?: SidePlayer[]; side1?: SidePlayer[] } | null;
  if (!p?.side0?.length || !p?.side1?.length) {
    return format === "doubles" ? fallbackDoubles : fallbackSingles;
  }

  if (format === "doubles") {
    const s0a = p.side0[0] ?? fallbackDoubles.side0[0];
    const s0b = p.side0[1] ?? fallbackDoubles.side0[1];
    const s1a = p.side1[0] ?? fallbackDoubles.side1[0];
    const s1b = p.side1[1] ?? fallbackDoubles.side1[1];
    return {
      side0: [
        {
          ...s0a,
          initials: s0a.initials || initialsFromName(s0a.name),
          avatarUrl: s0a.avatarUrl || null,
        },
        {
          ...s0b,
          initials: s0b.initials || initialsFromName(s0b.name),
          avatarUrl: s0b.avatarUrl || null,
        },
      ],
      side1: [
        {
          ...s1a,
          initials: s1a.initials || initialsFromName(s1a.name),
          avatarUrl: s1a.avatarUrl || null,
        },
        {
          ...s1b,
          initials: s1b.initials || initialsFromName(s1b.name),
          avatarUrl: s1b.avatarUrl || null,
        },
      ],
    };
  }

  const s0 = p.side0[0] ?? fallbackSingles.side0[0];
  const s1 = p.side1[0] ?? fallbackSingles.side1[0];
  return {
    side0: [
      {
        ...s0,
        initials: s0.initials || initialsFromName(s0.name),
        avatarUrl: s0.avatarUrl || null,
      },
    ],
    side1: [
      {
        ...s1,
        initials: s1.initials || initialsFromName(s1.name),
        avatarUrl: s1.avatarUrl || null,
      },
    ],
  };
}

export default function OrgLiveMatchPage() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<URLSearchParams>(
    new URLSearchParams(),
  );

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const tournamentId = searchParams.get("tournamentId");
  const eventId = searchParams.get("eventId");
  const matchId = searchParams.get("matchId");

  const config = useMemo<MatchConfigData>(() => {
    if (!matchId) {
      return {
        scoringSystem: "sideout",
        format: "doubles",
        bestOf: 3,
        pointsToWin: 11,
        winByTwo: true,
        initialServer: 1,
      };
    }
    const stored = getItem<MatchConfigData>(`match:${matchId}:config`);
    return (
      stored ?? {
        scoringSystem: "sideout",
        format: "doubles",
        bestOf: 3,
        pointsToWin: 11,
        winByTwo: true,
        initialServer: 1,
      }
    );
  }, [matchId]);

  const players = useMemo(
    () =>
      ensurePlayers(
        matchId ? getItem(`match:${matchId}:players`) : null,
        config.format,
      ),
    [matchId, config.format],
  );

  const [state, setState] = useState<LiveMatchStateData>(() => {
    if (!matchId) return createInitialLiveState("temp", config);
    const stored = getItem<LiveMatchStateData>(`match:${matchId}:state`);
    if (stored) return stored;
    return createInitialLiveState(matchId, config);
  });
  const [history, setHistory] = useState<LiveMatchStateData[]>([]);
  const [seq, setSeq] = useState(0);
  const [showSwitchServe, setShowSwitchServe] = useState(false);
  const [showSwitchSides, setShowSwitchSides] = useState(false);
  const [matchWinner, setMatchWinner] = useState<0 | 1 | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [scorerSide, setScorerSide] = useState<0 | 1>(
    config.initialServer === 2 ? 1 : 0,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [matchScorerName, setMatchScorerName] = useState("Match Scorer");
  const [teamIds, setTeamIds] = useState<{ a?: string; b?: string }>({});

  const isDoubles = config.format === "doubles";
  const sideALabel = isDoubles
    ? `${players.side0[0].name} / ${players.side0[1]?.name ?? "Player"}`
    : players.side0[0].name;
  const sideBLabel = isDoubles
    ? `${players.side1[0].name} / ${players.side1[1]?.name ?? "Player"}`
    : players.side1[0].name;
  const sideAActionLabel = isDoubles ? "Team 1" : players.side0[0].name;
  const sideBActionLabel = isDoubles ? "Team 2" : players.side1[0].name;

  useEffect(() => {
    if (!matchId || matchId === "temp") return;
    let cancelled = false;
    const loadScorer = async () => {
      try {
        const info = await matchApi.getMatchInfo(matchId);
        const scorerName =
          info?.scorerUser?.name ||
          info?.scorerName ||
          info?.scorer?.name ||
          "Match Scorer";
        if (!cancelled) setMatchScorerName(scorerName);
        if (!cancelled) {
          setTeamIds({
            a:
              info?.teamAData?.id ||
              (typeof info?.teamA === "string" ? info.teamA : info?.teamA?.id),
            b:
              info?.teamBData?.id ||
              (typeof info?.teamB === "string" ? info.teamB : info?.teamB?.id),
          });
        }
      } catch (error) {
        console.error("Failed to load match scorer", error);
      }
    };
    void loadScorer();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    setScorerSide(config.initialServer === 2 ? 1 : 0);
  }, [config.initialServer]);

  const matchTimer = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  const emit = useCallback(
    (type: ScoreEventData["type"], details: Record<string, unknown>) => {
      const nextSeq = seq + 1;
      const event: ScoreEventData = {
        seq: nextSeq,
        timestamp: Date.now(),
        actorId: "org",
        type,
        details,
      };
      setSeq(nextSeq);
      const logs = getItem<ScoreEventData[]>(`match:${matchId}:events`) || [];
      setItem(`match:${matchId}:events`, [...logs, event]);
    },
    [matchId, seq],
  );

  const persist = useCallback(
    (next: LiveMatchStateData) => {
      setItem(`match:${matchId}:state`, next);
    },
    [matchId],
  );

  const syncMatchUpdate = useCallback(
    async (
      previous: LiveMatchStateData,
      next: LiveMatchStateData,
      winner: 0 | 1 | null,
    ) => {
      try {
        const updatedSetIndex = previous.currentSet;
        const setScore = next.setScores[updatedSetIndex] || [0, 0];
        const setFinished =
          next.currentSet > previous.currentSet || winner != null;

        let setWinnerId: string | null = null;
        if (setFinished && teamIds.a && teamIds.b) {
          if (setScore[0] > setScore[1]) setWinnerId = teamIds.a;
          if (setScore[1] > setScore[0]) setWinnerId = teamIds.b;
        }

        const matchWinnerId =
          winner == null
            ? null
            : winner === 0
              ? teamIds.a || null
              : teamIds.b || null;

        // Ensure current set is initialized on the first point of a new set
        if (
          matchId &&
          (previous.setScores[updatedSetIndex] === undefined ||
            (previous.setScores[updatedSetIndex][0] === 0 &&
              previous.setScores[updatedSetIndex][1] === 0))
        ) {
          try {
            await matchApi.initializeSet(matchId, updatedSetIndex + 1);
          } catch (err) {
            console.warn("Set initialization failed (may already exist)", err);
          }
        }

        if (matchId) {
          const scorePayload: {
            matchId: string;
            setNumber: number;
            teamAScore: number;
            teamBScore: number;
            setStatus: "completed" | "in_progress";
            winnerId: string | null;
            matchFinished: boolean;
            matchWinnerId: string | null;
            teamAId?: string;
            teamBId?: string;
          } = {
            matchId,
            setNumber: updatedSetIndex + 1,
            teamAScore: setScore[0] ?? 0,
            teamBScore: setScore[1] ?? 0,
            setStatus: setFinished ? "completed" : "in_progress",
            winnerId: setWinnerId,
            matchFinished: winner != null,
            matchWinnerId,
          };

          if (teamIds.a) scorePayload.teamAId = teamIds.a;
          if (teamIds.b) scorePayload.teamBId = teamIds.b;

          await matchApi.updateScore({
            ...scorePayload,
          });
        }

        if (winner != null && matchId) {
          // Final match state update via specialized complete endpoint
          try {
            if (matchWinnerId) {
              await matchApi.completeMatch(matchId, matchWinnerId);
            } else {
              await matchApi.updateMatchState(matchId, "completed", null);
            }
          } catch (err) {
            console.error("Match completion failed", err);
          }

          // Sync tournament and event status after match completion
          if (tournamentId) {
            try {
              await tournamentApi.syncTournamentStatus(tournamentId);
            } catch (err) {
              console.warn("Post-match sync failed", err);
            }
          }
        }
      } catch (error) {
        console.error("Failed to sync live match update", error);
      }
    },
    [matchId, tournamentId, teamIds.a, teamIds.b],
  );

  const applyRallyAction = useCallback(
    (winnerSide: 0 | 1) => {
      emit("rally", { side: winnerSide });
      setScorerSide(winnerSide);
      setState((previous) => {
        setHistory((historyPrevious) => [...historyPrevious, previous]);
        const next = applyRally(previous, config, winnerSide);
        const advanced = maybeAdvanceSet(next, config);
        persist(advanced.state);
        setMatchWinner(advanced.matchWinner);
        void syncMatchUpdate(previous, advanced.state, advanced.matchWinner);
        return advanced.state;
      });
    },
    [config, emit, persist, syncMatchUpdate],
  );

  const applyFaultAction = useCallback(
    (faultSide: 0 | 1) => {
      emit("fault", { side: faultSide });
      setScorerSide(faultSide === 0 ? 1 : 0);
      setState((previous) => {
        setHistory((historyPrevious) => [...historyPrevious, previous]);
        const next = applyFault(previous, config, faultSide);
        const advanced = maybeAdvanceSet(next, config);
        persist(advanced.state);
        setMatchWinner(advanced.matchWinner);
        void syncMatchUpdate(previous, advanced.state, advanced.matchWinner);
        return advanced.state;
      });
    },
    [config, emit, persist, syncMatchUpdate],
  );

  const undo = useCallback(() => {
    emit("undo", {});
    setHistory((previous) => {
      const snapshot = previous[previous.length - 1];
      if (snapshot) {
        setState(snapshot);
        setMatchWinner(null);
        persist(snapshot);
      }
      return previous.slice(0, -1);
    });
  }, [emit, persist]);

  const lastSetRef = React.useRef(state.currentSet);
  const lastServerRef = React.useRef(state.serverSide);

  useEffect(() => {
    if (state.currentSet > lastSetRef.current) {
      setShowSwitchSides(true);
      lastSetRef.current = state.currentSet;
    }
    const currentScore = state.setScores[state.currentSet] || [0, 0];
    const isFirstServe =
      currentScore[0] === 0 && currentScore[1] === 0 && state.currentSet === 0;
    if (state.serverSide !== lastServerRef.current && !isFirstServe) {
      setShowSwitchServe(true);
    }
    lastServerRef.current = state.serverSide;
  }, [state.currentSet, state.serverSide, state.setScores]);

  const currentSet: [number, number] = [
    state.setScores[state.currentSet]?.[0] ?? 0,
    state.setScores[state.currentSet]?.[1] ?? 0,
  ];
  const setScores: Array<[number | null, number | null]> = Array.from({
    length: config.bestOf,
  }).map((_, index) => [
    state.setScores[index]?.[0] ?? (index === 0 ? 0 : null),
    state.setScores[index]?.[1] ?? (index === 0 ? 0 : null),
  ]);
  const winnerScore = `${String(currentSet[0] ?? 0).padStart(2, "0")}-${String(currentSet[1] ?? 0).padStart(2, "0")}`;

  return (
    <LiveMatchReplica
      currentSetNumber={Math.min(state.currentSet + 1, config.bestOf)}
      sideAScore={currentSet[0] ?? 0}
      sideBScore={currentSet[1] ?? 0}
      setScores={setScores}
      bestOf={config.bestOf}
      scoringLabel={
        config.scoringSystem === "sideout"
          ? "Side-Out Scoring"
          : "Rally Scoring"
      }
      sideAServing={state.serverSide === 0}
      sideBServing={state.serverSide === 1}
      sideALabel={sideALabel}
      sideBLabel={sideBLabel}
      scorerLabel={matchScorerName}
      matchTimer={matchTimer}
      sideAActionLabel={sideAActionLabel}
      sideBActionLabel={sideBActionLabel}
      sideAPlayers={players.side0}
      sideBPlayers={players.side1}
      showSwitchServe={showSwitchServe}
      showSwitchSides={showSwitchSides}
      showWinnerConfirm={matchWinner != null}
      showExitConfirm={showExitConfirm}
      isPaused={isPaused}
      onPauseToggle={() => setIsPaused((p) => !p)}
      onBack={() => setShowExitConfirm(true)}
      onConfirmExit={() =>
        router.replace(
          "/org/tournaments/event/match/setup" +
            toQuery({ tournamentId, eventId, matchId }),
        )
      }
      onCloseExitConfirm={() => setShowExitConfirm(false)}
      onUndo={undo}
      onSideARally={() => applyRallyAction(0)}
      onSideBRally={() => applyRallyAction(1)}
      onSideAFault={() => applyFaultAction(0)}
      onSideBFault={() => applyFaultAction(1)}
      onCloseSwitch={() => {
        setShowSwitchServe(false);
        setShowSwitchSides(false);
      }}
      onRestoreWinner={() => {
        undo();
        setMatchWinner(null);
      }}
      onConfirmWinner={() =>
        router.replace(
          "/org/tournaments/event/match/result" +
            toQuery({ tournamentId, eventId, matchId }),
        )
      }
      winnerName={matchWinner === 1 ? sideBActionLabel : sideAActionLabel}
      winnerScore={winnerScore}
    />
  );
}
