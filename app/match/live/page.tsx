"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LiveMatchReplica from "@/components/QuickMatch/LiveMatchReplica";
import { appendScoreLog, pushOfflineQueue } from "@/lib/storage";
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
  getSetsWon,
} from "@/lib/matchEngine";

function parseConfig(params: URLSearchParams): MatchConfigData {
  const scoringSystem = params.get("scoring") === "rally" ? "rally" : "sideout";
  const format = params.get("format") === "doubles" ? "doubles" : "singles";
  const bestOf = Number(params.get("bestOf") ?? "3") || 3;
  const pointsToWin = Number(params.get("points") ?? "11") || 11;
  const winByTwo = params.get("winByTwo") !== "false";
  const initialServer = params.get("server") === "2" ? 2 : 1;
  return {
    scoringSystem,
    format,
    bestOf,
    pointsToWin,
    winByTwo,
    initialServer,
  };
}

export default function LiveMatchPage() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<URLSearchParams>(
    new URLSearchParams(),
  );

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const matchId = searchParams.get("matchId") || "demo";

  const config = useMemo(() => parseConfig(searchParams), [searchParams]);

  const [state, setState] = useState<LiveMatchStateData>(() =>
    createInitialLiveState(matchId, config),
  );
  const [history, setHistory] = useState<LiveMatchStateData[]>([]);
  const [seq, setSeq] = useState(0);
  const [showSwitchServe, setShowSwitchServe] = useState(false);
  const [matchWinner, setMatchWinner] = useState<0 | 1 | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSwitchSides, setShowSwitchSides] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const p1 = searchParams.get("p1") || "Player 1";
  const p2 = searchParams.get("p2") || "Player 2";
  const p3 = searchParams.get("p3") || "";
  const p4 = searchParams.get("p4") || "";
  const isDoubles = config.format === "doubles";
  const playerAName = isDoubles ? [p1, p3].filter(Boolean).join(" / ") : p1;
  const playerBName = isDoubles ? [p2, p4].filter(Boolean).join(" / ") : p2;
  const sideAActionLabel = isDoubles ? "Team 1" : p1;
  const sideBActionLabel = isDoubles ? "Team 2" : p2;
  const scorerLabel = "Match Scorer";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const matchTimer = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  const emit = useCallback(
    (type: ScoreEventData["type"], details: Record<string, unknown>) => {
      const event: ScoreEventData = {
        seq: seq + 1,
        timestamp: Date.now(),
        actorId: "user",
        type,
        details,
      };
      setSeq((current) => current + 1);
      appendScoreLog(matchId, event).catch(() => pushOfflineQueue(event));
    },
    [matchId, seq],
  );

  const applyRallyAction = useCallback(
    (winnerSide: 0 | 1) => {
      emit("rally", { side: winnerSide });
      setState((previous) => {
        setHistory((historyPrevious) => [...historyPrevious, previous]);
        const next = applyRally(previous, config, winnerSide);
        const advanced = maybeAdvanceSet(next, config);
        setMatchWinner(advanced.matchWinner);
        return advanced.state;
      });
    },
    [config, emit],
  );

  const lastSetRef = React.useRef(state.currentSet);
  const lastServerRef = React.useRef(state.serverSide);

  React.useEffect(() => {
    // Set changed -> Switch Sides
    if (state.currentSet > lastSetRef.current) {
      setShowSwitchSides(true);
      lastSetRef.current = state.currentSet;
    }
    // Server changed -> Switch Serve
    const currentScore = state.setScores[state.currentSet] || [0, 0];
    const isFirstServe =
      currentScore[0] === 0 && currentScore[1] === 0 && state.currentSet === 0;

    if (state.serverSide !== lastServerRef.current && !isFirstServe) {
      setShowSwitchServe(true);
    }
    lastServerRef.current = state.serverSide;
  }, [state.currentSet, state.serverSide, state.setScores]);

  const applyFaultAction = useCallback(
    (faultSide: 0 | 1) => {
      emit("fault", { side: faultSide });
      setState((previous) => {
        setHistory((historyPrevious) => [...historyPrevious, previous]);
        const next = applyFault(previous, config, faultSide);
        const advanced = maybeAdvanceSet(next, config);
        setMatchWinner(advanced.matchWinner);
        return advanced.state;
      });
    },
    [config, emit],
  );

  const undo = useCallback(() => {
    emit("undo", {});
    setHistory((previous) => {
      const snapshot = previous[previous.length - 1];
      if (snapshot) {
        setState(snapshot);
        setMatchWinner(null);
      }
      return previous.slice(0, -1);
    });
  }, [emit]);

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
  const [setsWon0, setsWon1] = getSetsWon(state, config);
  const winnerScore = `${setsWon0}-${setsWon1}`;

  return (
    <LiveMatchReplica
      title="Quick Match"
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
      sideALabel={playerAName}
      sideBLabel={playerBName}
      scorerLabel={scorerLabel}
      showScorerCard={false}
      matchTimer={matchTimer}
      sideAActionLabel={sideAActionLabel}
      sideBActionLabel={sideBActionLabel}
      showSwitchServe={showSwitchServe}
      showSwitchSides={showSwitchSides}
      showWinnerConfirm={matchWinner != null}
      showExitConfirm={showExitConfirm}
      onBack={() => setShowExitConfirm(true)}
      onConfirmExit={() => router.replace("/match/setup?returnToHome=1")}
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
        router.push(
          `/match/winner?winner=${encodeURIComponent(matchWinner === 1 ? playerBName : playerAName)}&score=${encodeURIComponent(winnerScore)}&player_a=${encodeURIComponent(playerAName)}&player_b=${encodeURIComponent(playerBName)}`,
        )
      }
      winnerName={matchWinner === 1 ? playerBName : playerAName}
      winnerScore={winnerScore}
    />
  );
}
