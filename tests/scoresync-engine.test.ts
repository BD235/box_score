import { describe, it, expect } from "vitest";
import { ScoreSyncEngine } from "../src/domain/match-engine";
import type { Match, Player, ScoreLog } from "../src/db/schema/matches.schema";

const mockMatch: Match = {
  id: 1,
  slug: "final-match-2026",
  title: "Grand Tournament Final",
  status: "ONGOING",
  currentRound: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPlayers: Player[] = [
  { id: 101, matchId: 1, name: "Alpha", colorHex: "#3b82f6", slotOrder: 1, totalScore: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 102, matchId: 1, name: "Beta", colorHex: "#ef4444", slotOrder: 2, totalScore: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 103, matchId: 1, name: "Gamma", colorHex: "#10b981", slotOrder: 3, totalScore: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 104, matchId: 1, name: "Delta", colorHex: "#f59e0b", slotOrder: 4, totalScore: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 105, matchId: 1, name: "Epsilon", colorHex: "#8b5cf6", slotOrder: 5, totalScore: 0, createdAt: new Date(), updatedAt: new Date() },
];

describe("ScoreSyncEngine", () => {
  it("applies preset scores (+100, +150, +200, -100, -200) correctly", () => {
    const resPlus100 = ScoreSyncEngine.applyScoreMutation(mockMatch, mockPlayers[0], 100, "PRESET");
    expect(resPlus100.updatedPlayerTotal).toBe(100);
    expect(resPlus100.scoreLog.pointDelta).toBe(100);
    expect(resPlus100.scoreLog.sourceType).toBe("PRESET");

    const resPlus150 = ScoreSyncEngine.applyScoreMutation(mockMatch, mockPlayers[1], 150, "PRESET");
    expect(resPlus150.updatedPlayerTotal).toBe(150);

    const resMinus100 = ScoreSyncEngine.applyScoreMutation(mockMatch, mockPlayers[2], -100, "PRESET");
    expect(resMinus100.updatedPlayerTotal).toBe(-100);
  });

  it("applies manual scores (+35, -15) correctly", () => {
    const resManualPlus = ScoreSyncEngine.applyScoreMutation(mockMatch, mockPlayers[0], 35, "MANUAL");
    expect(resManualPlus.updatedPlayerTotal).toBe(35);
    expect(resManualPlus.scoreLog.sourceType).toBe("MANUAL");

    const resManualMinus = ScoreSyncEngine.applyScoreMutation(mockMatch, mockPlayers[1], -15, "MANUAL");
    expect(resManualMinus.updatedPlayerTotal).toBe(-15);
  });

  it("reverts the last score log on undo", () => {
    const playerWithScore: Player = { ...mockPlayers[0], totalScore: 250 };
    const lastLog: ScoreLog = {
      id: 999,
      matchId: 1,
      playerId: 101,
      roundNumber: 1,
      pointDelta: 150,
      sourceType: "PRESET",
      createdAt: new Date(),
    };

    const undone = ScoreSyncEngine.revertScoreLog(mockMatch, [playerWithScore], lastLog);
    expect(undone.targetPlayerId).toBe(101);
    expect(undone.restoredTotalScore).toBe(100);
  });

  it("throws an error when trying to mutate or undo a FINISHED match", () => {
    const finishedMatch: Match = { ...mockMatch, status: "FINISHED" };
    expect(() => {
      ScoreSyncEngine.applyScoreMutation(finishedMatch, mockPlayers[0], 100);
    }).toThrowError("Cannot mutate scores on a finished match");

    const sampleLog: ScoreLog = {
      id: 1,
      matchId: 1,
      playerId: 101,
      roundNumber: 1,
      pointDelta: 100,
      sourceType: "PRESET",
      createdAt: new Date(),
    };
    expect(() => {
      ScoreSyncEngine.revertScoreLog(finishedMatch, mockPlayers, sampleLog);
    }).toThrowError("Cannot undo scores on a finished match");
  });

  it("calculates rankings accurately with tie-breaking", () => {
    const scoredPlayers: Player[] = [
      { ...mockPlayers[0], totalScore: 350 }, // Rank 2
      { ...mockPlayers[1], totalScore: 500 }, // Rank 1
      { ...mockPlayers[2], totalScore: 350 }, // Rank 2 (Tie with Alpha)
      { ...mockPlayers[3], totalScore: 100 }, // Rank 4
      { ...mockPlayers[4], totalScore: -50 }, // Rank 5
    ];

    const ranked = ScoreSyncEngine.calculateRankings(scoredPlayers);

    expect(ranked[0].name).toBe("Beta");
    expect(ranked[0].rank).toBe(1);

    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(2);

    expect(ranked[3].name).toBe("Delta");
    expect(ranked[3].rank).toBe(4);

    expect(ranked[4].name).toBe("Epsilon");
    expect(ranked[4].rank).toBe(5);
  });

  it("identifies Most Plus and Most Minus player in current round", () => {
    const currentRound = 2;
    const logs: ScoreLog[] = [
      { id: 1, matchId: 1, playerId: 101, roundNumber: 2, pointDelta: 200, sourceType: "PRESET", createdAt: new Date() },
      { id: 2, matchId: 1, playerId: 102, roundNumber: 2, pointDelta: -200, sourceType: "PRESET", createdAt: new Date() },
      { id: 3, matchId: 1, playerId: 103, roundNumber: 2, pointDelta: 100, sourceType: "PRESET", createdAt: new Date() },
      { id: 4, matchId: 1, playerId: 104, roundNumber: 2, pointDelta: -100, sourceType: "PRESET", createdAt: new Date() },
      { id: 5, matchId: 1, playerId: 101, roundNumber: 1, pointDelta: 500, sourceType: "PRESET", createdAt: new Date() }, // Previous round
    ];

    const highlights = ScoreSyncEngine.calculateRoundHighlights(mockPlayers, logs, currentRound);

    expect(highlights.mostPlusPlayer?.player.id).toBe(101);
    expect(highlights.mostPlusPlayer?.points).toBe(200);

    expect(highlights.mostMinusPlayer?.player.id).toBe(102);
    expect(highlights.mostMinusPlayer?.points).toBe(-200);
  });

  it("computes round summaries matrix for detail table view", () => {
    const logs: ScoreLog[] = [
      { id: 1, matchId: 1, playerId: 101, roundNumber: 1, pointDelta: 100, sourceType: "PRESET", createdAt: new Date() },
      { id: 2, matchId: 1, playerId: 102, roundNumber: 1, pointDelta: 150, sourceType: "PRESET", createdAt: new Date() },
      { id: 3, matchId: 1, playerId: 101, roundNumber: 2, pointDelta: 200, sourceType: "PRESET", createdAt: new Date() },
    ];

    const summaries = ScoreSyncEngine.computeRoundSummaries(mockPlayers.slice(0, 2), logs);
    expect(summaries.length).toBe(2);

    // Round 2
    expect(summaries[0].roundNumber).toBe(2);
    const r2p1 = summaries[0].playerScores.find((p) => p.playerId === 101);
    expect(r2p1?.roundDelta).toBe(200);

    // Round 1
    expect(summaries[1].roundNumber).toBe(1);
    const r1p2 = summaries[1].playerScores.find((p) => p.playerId === 102);
    expect(r1p2?.roundDelta).toBe(150);
  });
});
