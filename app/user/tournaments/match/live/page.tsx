"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LiveMatchReplica from "@/components/QuickMatch/LiveMatchReplica";
import { getItem, setItem, removeItem } from "@/lib/storage";
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
  getScoreCall,
  getServerNumber,
  getServingPositionLabel,
} from "@/lib/matchEngine";
import { matchApi } from "@/lib/api/matchApi";

type SidePlayer = { name: string; initials: string; avatarUrl?: string | null };

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "P";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function getTeamPlayers(team: any): SidePlayer[] {
  const participants = Array.isArray(team?.participants) ? team.participants : [];
  if (!participants.length) {
    const fallbackName = team?.name || "Player";
    return [{ name: fallbackName, initials: initialsFromName(fallbackName), avatarUrl: null }];
  }
  return participants.map((p: any) => {
    const name = p?.user?.name || p?.name || "Player";
    return { name, initials: initialsFromName(name), avatarUrl: p?.user?.profilePicUrl || null };
  });
}

function getMatchSetRows(match: any) {
  return Array.isArray(match?.setRows)
    ? match.setRows
    : Array.isArray(match?.sets)
      ? match.sets
      : [];
}

function getSetNumber(set: any) {
  return Number(set?.setNumber ?? set?.set_number ?? set?.setInteger ?? set?.set_integer);
}

function getSetStatus(set: any) {
  return String(set?.setStatus ?? set?.set_status ?? "").toLowerCase();
}

function getSetTeamAScore(set: any) {
  return Number(set?.teamAScore ?? set?.team_a_score ?? 0);
}

function getSetTeamBScore(set: any) {
  return Number(set?.teamBScore ?? set?.team_b_score ?? 0);
}

function stateFromMatchSets(
  matchId: string,
  config: MatchConfigData,
  sets: any[],
): LiveMatchStateData | null {
  const normalizedSets = sets
    .filter((set) => Number.isFinite(getSetNumber(set)))
    .sort((a, b) => getSetNumber(a) - getSetNumber(b));

  if (normalizedSets.length === 0) return null;

  const setScores = normalizedSets.map((set) => [
    getSetTeamAScore(set),
    getSetTeamBScore(set),
  ]);
  const inProgressIndex = normalizedSets.findIndex(
    (set) => getSetStatus(set) === "in_progress",
  );
  const nextSetIndex = Math.min(
    setScores.length - 1,
    Math.max(0, inProgressIndex >= 0 ? inProgressIndex : setScores.length - 1),
  );

  return {
    ...createInitialLiveState(matchId, config),
    currentSet: nextSetIndex,
    setScores,
  };
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
        { ...s0a, initials: s0a.initials || initialsFromName(s0a.name), avatarUrl: s0a.avatarUrl || null },
        { ...s0b, initials: s0b.initials || initialsFromName(s0b.name), avatarUrl: s0b.avatarUrl || null },
      ],
      side1: [
        { ...s1a, initials: s1a.initials || initialsFromName(s1a.name), avatarUrl: s1a.avatarUrl || null },
        { ...s1b, initials: s1b.initials || initialsFromName(s1b.name), avatarUrl: s1b.avatarUrl || null },
      ],
    };
  }
  const s0 = p.side0[0] ?? fallbackSingles.side0[0];
  const s1 = p.side1[0] ?? fallbackSingles.side1[0];
  return {
    side0: [{ ...s0, initials: s0.initials || initialsFromName(s0.name), avatarUrl: s0.avatarUrl || null }],
    side1: [{ ...s1, initials: s1.initials || initialsFromName(s1.name), avatarUrl: s1.avatarUrl || null }],
  };
}

export default function ScorerLiveMatchPage() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<URLSearchParams>(new URLSearchParams());

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const matchId = searchParams.get("matchId");

  // Load config and players from match info (not from local storage like org flow)
  const [isLoading, setIsLoading] = useState(true);
  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [matchScorerName, setMatchScorerName] = useState("Match Scorer");
  const [teamIds, setTeamIds] = useState<{ a?: string; b?: string }>({});

  useEffect(() => {
    if (!matchId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const info = await matchApi.getMatchInfo(matchId);
        if (cancelled) return;

        setMatchInfo(info);
        setMatchScorerName(
          info?.scorerUser?.name || info?.scorerName || info?.scorer?.name || "Match Scorer"
        );
        setTeamIds({
          a: info?.teamAData?.id || (typeof info?.teamA === "string" ? info.teamA : info?.teamA?.id),
          b: info?.teamBData?.id || (typeof info?.teamB === "string" ? info.teamB : info?.teamB?.id),
        });

        // Pre-populate player data into local storage so the match engine can read it
        const side0 = getTeamPlayers(info?.teamAData || info?.teamA);
        const side1 = getTeamPlayers(info?.teamBData || info?.teamB);
        const isDoubles = side0.length > 1 || side1.length > 1;

        const config: MatchConfigData = {
          scoringSystem: "sideout",
          format: isDoubles ? "doubles" : "singles",
          bestOf: Number(
            info?.setsPerMatchId ||
              info?.setsPerMatch ||
              info?.event?.setsPerMatch ||
              getMatchSetRows(info).length ||
              1,
          ),
          pointsToWin: Number(info?.pointsPerSet || info?.event?.pointsPerSet || 11),
          winByTwo: true,
          initialServer: 1,
          warmupMinutes: 0,
          timeoutPerSet: 1,
          switchSidesEvery: -1,
        };

        setItem(`match:${matchId}:config`, config);
        setItem(`match:${matchId}:players`, {
          side0: isDoubles ? side0.slice(0, 2) : side0.slice(0, 1),
          side1: isDoubles ? side1.slice(0, 2) : side1.slice(0, 1),
        });

        const dbState = stateFromMatchSets(matchId, config, getMatchSetRows(info));
        if (dbState) {
          setState(dbState);
          setItem(`match:${matchId}:state`, dbState);
        }
      } catch (err) {
        console.error("[ScorerLive] Failed to load match info", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [matchId]);

  const config = useMemo<MatchConfigData>(() => {
    if (!matchId) return { scoringSystem: "sideout", format: "singles", bestOf: 1, pointsToWin: 11, winByTwo: true, initialServer: 1 };
    return getItem<MatchConfigData>(`match:${matchId}:config`) ?? {
      scoringSystem: "sideout", format: "singles", bestOf: 1, pointsToWin: 11, winByTwo: true, initialServer: 1,
    };
  }, [matchId, isLoading]); // re-derive after loading

  const players = useMemo(
    () => ensurePlayers(matchId ? getItem(`match:${matchId}:players`) : null, config.format),
    [matchId, isLoading, config.format]
  );

  const [state, setState] = useState<LiveMatchStateData>(() => {
    if (!matchId) return createInitialLiveState("temp", { scoringSystem: "sideout", format: "singles", bestOf: 1, pointsToWin: 11, winByTwo: true, initialServer: 1 });
    const stored = getItem<LiveMatchStateData>(`match:${matchId}:state`);
    if (stored) return stored;
    return createInitialLiveState(matchId, { scoringSystem: "sideout", format: "singles", bestOf: 1, pointsToWin: 11, winByTwo: true, initialServer: 1 });
  });

  // Re-initialize state once config is loaded
  useEffect(() => {
    if (!matchId || isLoading) return;
    const stored = getItem<LiveMatchStateData>(`match:${matchId}:state`);
    if (!stored) {
      setState(createInitialLiveState(matchId, config));
    }
  }, [isLoading]);

  const [history, setHistory] = useState<LiveMatchStateData[]>([]);
  const [seq, setSeq] = useState(0);
  const [showSwitchServe, setShowSwitchServe] = useState(false);
  const [showSwitchSides, setShowSwitchSides] = useState(false);
  const [matchWinner, setMatchWinner] = useState<0 | 1 | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const matchTimer = useMemo(() => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  const isDoubles = config.format === "doubles";
  const sideALabel = isDoubles
    ? `${players.side0[0].name} / ${players.side0[1]?.name ?? "Player"}`
    : players.side0[0].name;
  const sideBLabel = isDoubles
    ? `${players.side1[0].name} / ${players.side1[1]?.name ?? "Player"}`
    : players.side1[0].name;
  const sideAActionLabel = isDoubles ? "Team 1" : players.side0[0].name;
  const sideBActionLabel = isDoubles ? "Team 2" : players.side1[0].name;

  const emit = useCallback(
    (type: ScoreEventData["type"], details: Record<string, unknown>) => {
      const nextSeq = seq + 1;
      const event: ScoreEventData = { seq: nextSeq, timestamp: Date.now(), actorId: "scorer", type, details };
      setSeq(nextSeq);
      const logs = getItem<ScoreEventData[]>(`match:${matchId}:events`) || [];
      setItem(`match:${matchId}:events`, [...logs, event]);
    },
    [matchId, seq]
  );

  const persist = useCallback(
    (next: LiveMatchStateData) => { setItem(`match:${matchId}:state`, next); },
    [matchId]
  );

  const syncMatchUpdate = useCallback(
    async (previous: LiveMatchStateData, next: LiveMatchStateData, winner: 0 | 1 | null) => {
      try {
        const updatedSetIndex = previous.currentSet;
        const setScore = next.setScores[updatedSetIndex] || [0, 0];
        const setFinished = next.currentSet > previous.currentSet || winner != null;

        let setWinnerId: string | null = null;
        if (setFinished && teamIds.a && teamIds.b) {
          if (setScore[0] > setScore[1]) setWinnerId = teamIds.a;
          if (setScore[1] > setScore[0]) setWinnerId = teamIds.b;
        }

        const matchWinnerId =
          winner == null ? null : winner === 0 ? teamIds.a || null : teamIds.b || null;

        if (matchId && (previous.setScores[updatedSetIndex] === undefined ||
          (previous.setScores[updatedSetIndex][0] === 0 && previous.setScores[updatedSetIndex][1] === 0))) {
          try {
            await matchApi.initializeSet(matchId, updatedSetIndex + 1);
          } catch {
          }
        }

        if (matchId) {
          await matchApi.updateScore({
            matchId,
            setNumber: updatedSetIndex + 1,
            teamAScore: setScore[0] ?? 0,
            teamBScore: setScore[1] ?? 0,
            setStatus: setFinished ? "completed" : "in_progress",
            winnerId: setWinnerId,
            matchFinished: winner != null,
            matchWinnerId,
            teamAId: teamIds.a,
            teamBId: teamIds.b,
          });
        }

        if (winner != null && matchId) {
          try {
            if (matchWinnerId) {
              await matchApi.completeMatch(matchId, matchWinnerId);
            } else {
              await matchApi.updateMatchState(matchId, "completed", null);
            }
          } catch (err) {
            console.error("[ScorerLive] Match completion failed", err);
          }
        }
      } catch (error) {
        console.error("[ScorerLive] Failed to sync match update", error);
      }
    },
    [matchId, teamIds.a, teamIds.b]
  );

  const applyRallyAction = useCallback(
    (winnerSide: 0 | 1) => {
      emit("rally", { side: winnerSide });
      setState((previous) => {
        setHistory((h) => [...h, previous]);
        const next = applyRally(previous, config, winnerSide);
        const advanced = maybeAdvanceSet(next, config);
        persist(advanced.state);
        setMatchWinner(advanced.matchWinner);
        void syncMatchUpdate(previous, advanced.state, advanced.matchWinner);
        return advanced.state;
      });
    },
    [config, emit, persist, syncMatchUpdate]
  );

  const applyFaultAction = useCallback(
    (faultSide: 0 | 1) => {
      emit("fault", { side: faultSide });
      setState((previous) => {
        setHistory((h) => [...h, previous]);
        const next = applyFault(previous, config, faultSide);
        const advanced = maybeAdvanceSet(next, config);
        persist(advanced.state);
        setMatchWinner(advanced.matchWinner);
        void syncMatchUpdate(previous, advanced.state, advanced.matchWinner);
        return advanced.state;
      });
    },
    [config, emit, persist, syncMatchUpdate]
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
  const lastServerRef = React.useRef(
    `${state.serverSide}:${state.serverPlayerIndex ?? ""}`,
  );

  useEffect(() => {
    if (state.currentSet > lastSetRef.current) {
      setShowSwitchSides(true);
      lastSetRef.current = state.currentSet;
    }
    const currentScore = state.setScores[state.currentSet] || [0, 0];
    const isFirstServe = currentScore[0] === 0 && currentScore[1] === 0 && state.currentSet === 0;
    const serverKey = `${state.serverSide}:${state.serverPlayerIndex ?? ""}`;
    if (serverKey !== lastServerRef.current && !isFirstServe) {
      setShowSwitchServe(true);
    }
    lastServerRef.current = serverKey;
  }, [state.currentSet, state.serverPlayerIndex, state.serverSide, state.setScores]);

  const currentSet: [number, number] = [
    state.setScores[state.currentSet]?.[0] ?? 0,
    state.setScores[state.currentSet]?.[1] ?? 0,
  ];
  const setScores: Array<[number | null, number | null]> = Array.from({ length: config.bestOf }).map((_, i) => [
    state.setScores[i]?.[0] ?? (i === 0 ? 0 : null),
    state.setScores[i]?.[1] ?? (i === 0 ? 0 : null),
  ]);
  const winnerScore = `${String(currentSet[0] ?? 0).padStart(2, "0")}-${String(currentSet[1] ?? 0).padStart(2, "0")}`;

  // Clean up local storage and return to the user manage scorer tab.
  const handleConfirmWinner = useCallback(async () => {
    if (matchId) {
      removeItem(`match:${matchId}:state`);
      removeItem(`match:${matchId}:config`);
      removeItem(`match:${matchId}:players`);
      removeItem(`match:${matchId}:events`);
    }
    router.replace("/user/manage?tab=scorer");
  }, [matchId, router]);

  const handleConfirmExit = useCallback(() => {
    router.replace("/user/manage?tab=scorer");
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <LiveMatchReplica
      currentSetNumber={Math.min(state.currentSet + 1, config.bestOf)}
      sideAScore={currentSet[0] ?? 0}
      sideBScore={currentSet[1] ?? 0}
      setScores={setScores}
      bestOf={config.bestOf}
      scoringLabel={config.scoringSystem === "sideout" ? "Side-Out Scoring" : "Rally Scoring"}
      scoreCallLabel={getScoreCall(state, config)}
      servingPositionLabel={getServingPositionLabel(state)}
      serverNumberLabel={
        config.format === "doubles" && config.scoringSystem === "sideout"
          ? `Server ${getServerNumber(state, config)}`
          : undefined
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
      onConfirmExit={handleConfirmExit}
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
      onConfirmWinner={handleConfirmWinner}
      winnerName={matchWinner === 1 ? sideBActionLabel : sideAActionLabel}
      winnerScore={winnerScore}
    />
  );
}
