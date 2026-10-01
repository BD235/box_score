"use server";

import { z } from "zod";
import { getDatabase } from "@/db";
import { 
  matches, 
  players, 
  scoreLogs, 
  displayStates, 
  type FullMatchData 
} from "@/db/schema/matches.schema";
import { eq, desc, asc } from "drizzle-orm";
import { ScoreSyncEngine } from "@/domain/match-engine";
import { broadcastMatchUpdate } from "@/lib/realtime/events";

const mutateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("INPUT_SCORE"),
    matchId: z.number().int().positive(),
    playerId: z.number().int().positive(),
    pointDelta: z.number().int(),
    sourceType: z.enum(["PRESET", "MANUAL"]).default("PRESET"),
  }),
  z.object({
    action: z.literal("UNDO_LAST_SCORE"),
    matchId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("SWITCH_DISPLAY_MODE"),
    matchId: z.number().int().positive(),
    viewMode: z.enum([
      "TOTAL_SCORE_ONLY",
      "DETAIL_TABLE",
      "HIGHLIGHT_MINUS_PLUS",
      "LEADERBOARD",
      "GAME_OVER",
    ]),
    activeFilter: z.enum(["ALL", "MOST_MINUS", "MOST_PLUS"]).optional(),
  }),
  z.object({
    action: z.literal("TRIGGER_AUDIO"),
    matchId: z.number().int().positive(),
    effect: z.enum(["VICTORY", "MINUS_PENALTY", "ROUND_BELL"]),
  }),
  z.object({
    action: z.literal("CONTROL_TIMER"),
    matchId: z.number().int().positive(),
    operation: z.enum(["START", "PAUSE", "RESET", "SET"]),
    seconds: z.number().int().min(0).optional(),
  }),
  z.object({
    action: z.literal("ADVANCE_ROUND"),
    matchId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("FINISH_MATCH"),
    matchId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("RESET_MATCH"),
    matchId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("UPDATE_PLAYER"),
    matchId: z.number().int().positive(),
    playerId: z.number().int().positive(),
    name: z.string().min(1).max(30).optional(),
    colorHex: z.string().optional(),
  }),
]);

export async function fetchFullMatch(matchId: number): Promise<FullMatchData | null> {
  const { db } = await getDatabase();

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!match) return null;

  const playersList = await db
    .select()
    .from(players)
    .where(eq(players.matchId, matchId))
    .orderBy(asc(players.slotOrder));

  const logsList = await db
    .select()
    .from(scoreLogs)
    .where(eq(scoreLogs.matchId, matchId))
    .orderBy(desc(scoreLogs.createdAt));

  let [dState] = await db
    .select()
    .from(displayStates)
    .where(eq(displayStates.matchId, matchId))
    .limit(1);

  if (!dState) {
    const [createdState] = await db
      .insert(displayStates)
      .values({
        matchId,
        viewMode: "TOTAL_SCORE_ONLY",
        activeFilter: "ALL",
        timerSeconds: 0,
        isTimerRunning: false,
      })
      .returning();
    dState = createdState;
  }

  const rankedPlayers = ScoreSyncEngine.calculateRankings(playersList);
  const roundSummaries = ScoreSyncEngine.computeRoundSummaries(playersList, logsList);
  const currentHighlight = ScoreSyncEngine.calculateRoundHighlights(
    playersList,
    logsList,
    match.currentRound
  );

  return {
    ...match,
    players: rankedPlayers,
    scoreLogs: logsList,
    displayState: dState,
    roundSummaries,
    currentHighlight,
  };
}

export async function mutateScore(rawInput: unknown) {
  const parsed = mutateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const input = parsed.data;
  const { db } = await getDatabase();

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, input.matchId))
    .limit(1);

  if (!match) {
    return { success: false, error: "Match not found" };
  }

  const playersList = await db
    .select()
    .from(players)
    .where(eq(players.matchId, input.matchId))
    .orderBy(asc(players.slotOrder));

  let triggeredAudioEffect: string | undefined;

  switch (input.action) {
    case "INPUT_SCORE": {
      const targetPlayer = playersList.find((p) => p.id === input.playerId);
      if (!targetPlayer) {
        return { success: false, error: "Player not found" };
      }

      const { updatedPlayerTotal, scoreLog } = ScoreSyncEngine.applyScoreMutation(
        match,
        targetPlayer,
        input.pointDelta,
        input.sourceType
      );

      await db
        .update(players)
        .set({
          totalScore: updatedPlayerTotal,
          updatedAt: new Date(),
        })
        .where(eq(players.id, targetPlayer.id));

      await db.insert(scoreLogs).values(scoreLog);

      // Trigger appropriate audio based on point delta
      if (input.pointDelta < 0) {
        triggeredAudioEffect = "MINUS_PENALTY";
      }
      break;
    }

    case "UNDO_LAST_SCORE": {
      const [lastLog] = await db
        .select()
        .from(scoreLogs)
        .where(eq(scoreLogs.matchId, input.matchId))
        .orderBy(desc(scoreLogs.createdAt))
        .limit(1);

      if (!lastLog) {
        return { success: false, error: "No score logs to undo" };
      }

      const { targetPlayerId, restoredTotalScore } = ScoreSyncEngine.revertScoreLog(
        match,
        playersList,
        lastLog
      );

      await db
        .update(players)
        .set({
          totalScore: restoredTotalScore,
          updatedAt: new Date(),
        })
        .where(eq(players.id, targetPlayerId));

      await db.delete(scoreLogs).where(eq(scoreLogs.id, lastLog.id));
      break;
    }

    case "SWITCH_DISPLAY_MODE": {
      await db
        .insert(displayStates)
        .values({
          matchId: input.matchId,
          viewMode: input.viewMode,
          activeFilter: input.activeFilter || "ALL",
          timerSeconds: 0,
          isTimerRunning: false,
        })
        .onConflictDoUpdate({
          target: displayStates.matchId,
          set: {
            viewMode: input.viewMode,
            ...(input.activeFilter ? { activeFilter: input.activeFilter } : {}),
            updatedAt: new Date(),
          },
        });
      break;
    }

    case "TRIGGER_AUDIO": {
      triggeredAudioEffect = input.effect;
      break;
    }

    case "CONTROL_TIMER": {
      let [dState] = await db
        .select()
        .from(displayStates)
        .where(eq(displayStates.matchId, input.matchId))
        .limit(1);

      let newSeconds = dState ? dState.timerSeconds : 0;
      let newRunning = dState ? dState.isTimerRunning : false;

      if (input.operation === "START") {
        newRunning = true;
      } else if (input.operation === "PAUSE") {
        newRunning = false;
      } else if (input.operation === "RESET") {
        newSeconds = 0;
        newRunning = false;
      } else if (input.operation === "SET" && input.seconds !== undefined) {
        newSeconds = input.seconds;
      }

      await db
        .insert(displayStates)
        .values({
          matchId: input.matchId,
          viewMode: dState?.viewMode || "TOTAL_SCORE_ONLY",
          activeFilter: dState?.activeFilter || "ALL",
          timerSeconds: newSeconds,
          isTimerRunning: newRunning,
        })
        .onConflictDoUpdate({
          target: displayStates.matchId,
          set: {
            timerSeconds: newSeconds,
            isTimerRunning: newRunning,
            updatedAt: new Date(),
          },
        });
      break;
    }

    case "ADVANCE_ROUND": {
      await db
        .update(matches)
        .set({
          currentRound: match.currentRound + 1,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, input.matchId));

      triggeredAudioEffect = "ROUND_BELL";
      break;
    }

    case "FINISH_MATCH": {
      await db
        .update(matches)
        .set({
          status: "FINISHED",
          updatedAt: new Date(),
        })
        .where(eq(matches.id, input.matchId));

      await db
        .insert(displayStates)
        .values({
          matchId: input.matchId,
          viewMode: "GAME_OVER",
          activeFilter: "ALL",
        })
        .onConflictDoUpdate({
          target: displayStates.matchId,
          set: {
            viewMode: "GAME_OVER",
            updatedAt: new Date(),
          },
        });

      triggeredAudioEffect = "VICTORY";
      break;
    }

    case "RESET_MATCH": {
      await db
        .update(matches)
        .set({
          status: "ONGOING",
          currentRound: 1,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, input.matchId));

      for (const p of playersList) {
        await db
          .update(players)
          .set({
            totalScore: 0,
            updatedAt: new Date(),
          })
          .where(eq(players.id, p.id));
      }

      await db.delete(scoreLogs).where(eq(scoreLogs.matchId, input.matchId));

      await db
        .insert(displayStates)
        .values({
          matchId: input.matchId,
          viewMode: "TOTAL_SCORE_ONLY",
          activeFilter: "ALL",
          timerSeconds: 0,
          isTimerRunning: false,
        })
        .onConflictDoUpdate({
          target: displayStates.matchId,
          set: {
            viewMode: "TOTAL_SCORE_ONLY",
            activeFilter: "ALL",
            timerSeconds: 0,
            isTimerRunning: false,
            updatedAt: new Date(),
          },
        });
      break;
    }

    case "UPDATE_PLAYER": {
      await db
        .update(players)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.colorHex ? { colorHex: input.colorHex } : {}),
          updatedAt: new Date(),
        })
        .where(eq(players.id, input.playerId));
      break;
    }
  }

  const fullPayload = await fetchFullMatch(input.matchId);
  if (!fullPayload) {
    return { success: false, error: "Failed to reload match state" };
  }

  const broadcastPayload = {
    ...fullPayload,
    ...(triggeredAudioEffect ? { lastAudioEffect: triggeredAudioEffect } : {}),
  };

  broadcastMatchUpdate(broadcastPayload);

  return { success: true, match: fullPayload };
}
