import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema/matches.schema";
import path from "path";
import fs from "fs";

interface DbContext {
  db: ReturnType<typeof drizzle<typeof schema>>;
  client: PGlite;
}

const globalForDb = globalThis as unknown as {
  dbPromise: Promise<DbContext> | undefined;
  dbContext: DbContext | undefined;
};

export async function getDatabase(): Promise<DbContext> {
  if (globalForDb.dbContext) {
    return globalForDb.dbContext;
  }

  if (!globalForDb.dbPromise) {
    globalForDb.dbPromise = (async () => {
      try {
        const dataDir = path.resolve(process.cwd(), ".box_score_data");
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        const client = new PGlite(dataDir);
        await client.waitReady;

        // Migrate legacy tables if old basketball structure exists
        try {
          const checkLegacy = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'matches' AND column_name = 'sport_type';
          `);
          if (checkLegacy.rows.length > 0) {
            await client.exec(`
              DROP TABLE IF EXISTS match_logs CASCADE;
              DROP TABLE IF EXISTS matches CASCADE;
            `);
          }
        } catch {
          // Table doesn't exist yet or clean DB
        }

        // Auto-create PostgreSQL tables for ScoreSync Domain
        await client.exec(`
          CREATE TABLE IF NOT EXISTS matches (
            id SERIAL PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ONGOING',
            current_round INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS players (
            id SERIAL PRIMARY KEY,
            match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            color_hex TEXT NOT NULL DEFAULT '#3b82f6',
            slot_order INTEGER NOT NULL,
            total_score INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS score_logs (
            id SERIAL PRIMARY KEY,
            match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            round_number INTEGER NOT NULL,
            point_delta INTEGER NOT NULL,
            source_type TEXT NOT NULL DEFAULT 'PRESET',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS display_states (
            match_id INTEGER PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
            view_mode TEXT NOT NULL DEFAULT 'TOTAL_SCORE_ONLY',
            active_filter TEXT NOT NULL DEFAULT 'ALL',
            timer_seconds INTEGER NOT NULL DEFAULT 0,
            is_timer_running BOOLEAN NOT NULL DEFAULT false,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS matches_slug_idx ON matches(slug);
          CREATE INDEX IF NOT EXISTS matches_status_idx ON matches(status);
          CREATE INDEX IF NOT EXISTS players_match_idx ON players(match_id, slot_order);
          CREATE INDEX IF NOT EXISTS score_logs_match_idx ON score_logs(match_id, created_at);
        `);

        const db = drizzle(client, { schema });
        const context: DbContext = { db, client };
        globalForDb.dbContext = context;
        return context;
      } catch (err) {
        globalForDb.dbPromise = undefined;
        globalForDb.dbContext = undefined;
        throw err;
      }
    })();
  }

  return globalForDb.dbPromise;
}
