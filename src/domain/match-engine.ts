import type { 
  Match, 
  Player, 
  ScoreLog, 
  RankedPlayer, 
  RoundSummary, 
  RoundHighlight 
} from "@/db/schema/matches.schema";

export const QUICK_SCORE_PRESETS = [-200, -100, 100, 150, 200] as const;

export class ScoreSyncEngine {
  /**
   * Calculate player rankings (1st, 2nd, 3rd, ...) based on total score (highest first).
   * Supports tie-breaking where equal scores receive identical rank.
   */
  static calculateRankings(players: Player[]): RankedPlayer[] {
    const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);

    let currentRank = 1;
    return sorted.map((p, idx) => {
      if (idx > 0) {
        const prev = sorted[idx - 1];
        if (p.totalScore !== prev.totalScore) {
          currentRank = idx + 1;
        }
      }
      return {
        ...p,
        rank: currentRank,
      };
    });
  }

  /**
   * Group and aggregate score logs into round summaries for the detail matrix table.
   */
  static computeRoundSummaries(players: Player[], scoreLogs: ScoreLog[]): RoundSummary[] {
    const roundMap = new Map<number, Map<number, number>>();

    // Populate matrix: roundNumber -> (playerId -> sum of deltas)
    for (const log of scoreLogs) {
      if (!roundMap.has(log.roundNumber)) {
        roundMap.set(log.roundNumber, new Map());
      }
      const pMap = roundMap.get(log.roundNumber)!;
      const current = pMap.get(log.playerId) || 0;
      pMap.set(log.playerId, current + log.pointDelta);
    }

    const rounds = Array.from(roundMap.keys()).sort((a, b) => b - a);

    return rounds.map((rNum) => {
      const pMap = roundMap.get(rNum)!;
      return {
        roundNumber: rNum,
        playerScores: players.map((p) => ({
          playerId: p.id,
          playerName: p.name,
          roundDelta: pMap.get(p.id) || 0,
        })),
      };
    });
  }

  /**
   * Calculate Most Minus and Most Plus player highlights for the current round.
   */
  static calculateRoundHighlights(
    players: Player[],
    scoreLogs: ScoreLog[],
    currentRound: number
  ): RoundHighlight {
    const currentRoundLogs = scoreLogs.filter((l) => l.roundNumber === currentRound);
    const roundDeltaMap = new Map<number, number>();

    // Initialize all players to 0 delta
    players.forEach((p) => roundDeltaMap.set(p.id, 0));

    // Sum deltas in current round
    currentRoundLogs.forEach((log) => {
      const curr = roundDeltaMap.get(log.playerId) || 0;
      roundDeltaMap.set(log.playerId, curr + log.pointDelta);
    });

    let maxPlus = -Infinity;
    let maxPlusPlayer: Player | null = null;
    let minMinus = Infinity;
    let minMinusPlayer: Player | null = null;

    players.forEach((p) => {
      const delta = roundDeltaMap.get(p.id) || 0;
      if (delta > 0 && delta > maxPlus) {
        maxPlus = delta;
        maxPlusPlayer = p;
      }
      if (delta < 0 && delta < minMinus) {
        minMinus = delta;
        minMinusPlayer = p;
      }
    });

    return {
      roundNumber: currentRound,
      mostPlusPlayer: maxPlusPlayer && maxPlus > 0 ? { player: maxPlusPlayer, points: maxPlus } : null,
      mostMinusPlayer: minMinusPlayer && minMinus < 0 ? { player: minMinusPlayer, points: minMinus } : null,
    };
  }

  /**
   * Apply a score mutation (preset or manual) to a player.
   * Business invariant: match must not be FINISHED.
   */
  static applyScoreMutation(
    match: Match,
    player: Player,
    delta: number,
    sourceType: "PRESET" | "MANUAL" = "PRESET"
  ): {
    updatedPlayerTotal: number;
    scoreLog: Omit<ScoreLog, "id" | "createdAt">;
  } {
    if (match.status === "FINISHED") {
      throw new Error("Cannot mutate scores on a finished match");
    }

    const updatedTotal = player.totalScore + delta;

    return {
      updatedPlayerTotal: updatedTotal,
      scoreLog: {
        matchId: match.id,
        playerId: player.id,
        roundNumber: match.currentRound,
        pointDelta: delta,
        sourceType,
      },
    };
  }

  /**
   * Revert the most recent score log (Undo Last Score).
   */
  static revertScoreLog(
    match: Match,
    players: Player[],
    lastLog: ScoreLog
  ): {
    targetPlayerId: number;
    restoredTotalScore: number;
  } {
    if (match.status === "FINISHED") {
      throw new Error("Cannot undo scores on a finished match");
    }

    const player = players.find((p) => p.id === lastLog.playerId);
    if (!player) {
      throw new Error("Player associated with score log not found");
    }

    const restoredTotalScore = player.totalScore - lastLog.pointDelta;

    return {
      targetPlayerId: player.id,
      restoredTotalScore,
    };
  }
}

// Backward compatibility alias
export const CardGameEngine = ScoreSyncEngine;
