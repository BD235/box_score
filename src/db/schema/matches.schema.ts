import { 
  pgTable, 
  serial, 
  text, 
  integer, 
  boolean, 
  timestamp, 
  index 
} from "drizzle-orm/pg-core";

// AGGREGATE ROOT: matches
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").default("ONGOING").notNull(), // DRAFT | ONGOING | PAUSED | FINISHED
  currentRound: integer("current_round").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("matches_slug_idx").on(table.slug),
  statusIdx: index("matches_status_idx").on(table.status),
}));

// ENTITY: players (minimal 4 - 5 pemain)
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  colorHex: text("color_hex").default("#3b82f6").notNull(),
  slotOrder: integer("slot_order").notNull(), // 1, 2, 3, 4, 5+
  totalScore: integer("total_score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  playerMatchIdx: index("players_match_idx").on(table.matchId, table.slotOrder),
}));

// ENTITY: score_logs (per-point mutation log)
export const scoreLogs = pgTable("score_logs", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }).notNull(),
  playerId: integer("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  roundNumber: integer("round_number").notNull(),
  pointDelta: integer("point_delta").notNull(), // -200, -100, +100, +150, +200, manual (+35, -15)
  sourceType: text("source_type").default("PRESET").notNull(), // PRESET | MANUAL
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  scoreLogMatchIdx: index("score_logs_match_idx").on(table.matchId, table.createdAt),
}));

// ENTITY: display_states (remote view switcher & timer sync)
export const displayStates = pgTable("display_states", {
  matchId: integer("match_id").primaryKey().references(() => matches.id, { onDelete: "cascade" }),
  viewMode: text("view_mode").default("TOTAL_SCORE_ONLY").notNull(), // TOTAL_SCORE_ONLY | DETAIL_TABLE | HIGHLIGHT_MINUS_PLUS | LEADERBOARD | GAME_OVER
  activeFilter: text("active_filter").default("ALL").notNull(), // ALL | MOST_MINUS | MOST_PLUS
  timerSeconds: integer("timer_seconds").default(0).notNull(),
  isTimerRunning: boolean("is_timer_running").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type ScoreLog = typeof scoreLogs.$inferSelect;
export type NewScoreLog = typeof scoreLogs.$inferInsert;
export type DisplayState = typeof displayStates.$inferSelect;
export type NewDisplayState = typeof displayStates.$inferInsert;

export interface RankedPlayer extends Player {
  rank: number;
}

export interface RoundSummary {
  roundNumber: number;
  playerScores: {
    playerId: number;
    playerName: string;
    roundDelta: number;
  }[];
}

export interface RoundHighlight {
  roundNumber: number;
  mostPlusPlayer: {
    player: Player;
    points: number;
  } | null;
  mostMinusPlayer: {
    player: Player;
    points: number;
  } | null;
}

export interface FullMatchData extends Match {
  players: RankedPlayer[];
  scoreLogs: ScoreLog[];
  displayState: DisplayState;
  roundSummaries: RoundSummary[];
  currentHighlight: RoundHighlight;
}

// Aliases for compatibility
export type FullGameData = FullMatchData;
export type CardGame = Match;
export type GamePlayer = Player;
