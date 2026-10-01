# DOMAIN-DRIVEN DESIGN (DDD): SCORESYNC REAL-TIME SCOREBOARD ENGINE
Document Version: 1.0.0
Design Paradigm: Pure Domain Modeling with Drizzle ORM Mapping & Decoupled Real-Time Architecture

---

## 1. Ubiquitous Language (Bahasa Domain Standar)

- **Match (Pertandingan):** Sesi permainan yang sedang berjalan, bertindak sebagai *Aggregate Root*.
- **Player (Pemain):** Peserta pertandingan (minimal 4–5 entitas per match, dapat ditambah).
- **Round (Ronde):** Tahapan permainan tempat mutasi poin dicatat.
- **Score Log (Catatan Poin):** Entitas rekaman mutasi poin (+/-) beserta asal input (*source type*).
- **Display View State:** Keadaan proyeksi visual pada layar Laptop yang dikontrol secara remote oleh Admin HP.
- **Quick Point Preset:** Nilai poin rekomendasi cepat siap pakai (`-200`, `-100`, `+100`, `+150`, `+200`).
- **Audio Trigger:** Sinyal efek suara yang dikirimkan dari HP untuk dibunyikan di speaker laptop.

---

## 2. Bounded Context & Arsitektur Domain

```text
+-------------------------------------------------------------------+
|                        MATCH BOUNDED CONTEXT                      |
|  +-------------------+      +-----------------------------------+ |
|  |  Match Aggregate  | ---> |  Scoring & Evaluation Sub-Domain  | |
|  +-------------------+      +-----------------------------------+ |
+-------------------------------------------------------------------+
                                  |
                        (Domain Event Emission)
                                  v
+-------------------------------------------------------------------+
|                     DISPLAY CONTROL BOUNDED CONTEXT               |
|  +---------------------+        +-------------------------------+ |
|  | Display State Engine | -----> | Real-time Broadcast Adapter   | |
|  +---------------------+        +-------------------------------+ |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                   PERSISTENCE & CLOUD CONTEXT                     |
|  +-------------------+                                            |
|  | Cloud Database DB |                                            |
|  +-------------------+                                            |
+-------------------------------------------------------------------+
```

---

## 3. Entities, Value Objects & Aggregates

### 3.1. Aggregates

#### `MatchAggregate`
- **Aggregate Root:** `Match`
- **Internal Entities:** `Player`, `ScoreLog`
- **Invariants (Aturan Bisnis Kritis):**
  1. Jumlah `Player` dalam sebuah `Match` minimal 4 pemain.
  2. Skor kumulatif `Player` dihitung secara deterministik dari penjumlahan seluruh `ScoreLog` milik pemain tersebut dalam match berjalan.
  3. Pertandingan berstatus `FINISHED` dibekukan (tidak boleh menerima mutasi `ScoreLog` baru).
  4. Pembatalan skor (*Undo*) membatalkan `ScoreLog` paling akhir dan merevisi skor kumulatif pemain terkait secara atomik.

### 3.2. Entities & Key Attributes

#### `Match` (Aggregate Root)
- `id` (Integer / Serial PK)
- `slug` (String, Unique)
- `title` (String)
- `status` (Enum: `DRAFT`, `ONGOING`, `PAUSED`, `FINISHED`)
- `currentRound` (Integer, default 1)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

#### `Player` (Entity)
- `id` (Integer / Serial PK)
- `matchId` (FK ke `Match.id`)
- `name` (String)
- `colorCode` (String HEX)
- `slotPosition` (Integer: 1-5+)
- `totalScore` (Integer, hasil agregasi)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

#### `ScoreLog` (Entity)
- `id` (Integer / Serial PK)
- `matchId` (FK ke `Match.id`)
- `playerId` (FK ke `Player.id`)
- `roundNumber` (Integer)
- `pointDelta` (Integer, misal: -100, +150, +200, atau manual)
- `sourceType` (Enum: `PRESET`, `MANUAL`)
- `createdAt` (Timestamp)

#### `DisplayState` (Entity / Projection State)
- `matchId` (PK / FK ke `Match.id`)
- `viewMode` (Enum: `TOTAL_SCORE_ONLY`, `DETAIL_TABLE`, `HIGHLIGHT_MINUS_PLUS`, `LEADERBOARD`, `GAME_OVER`)
- `activeFilter` (Enum: `ALL`, `MOST_MINUS`, `MOST_PLUS`)
- `timerSeconds` (Integer)
- `isTimerRunning` (Boolean)
- `updatedAt` (Timestamp)

### 3.3. Value Objects

- **`ScorePreset`**: Nilai diskrit tombol cepat: `[-200, -100, +100, +150, +200]`.
- **`DisplayMode`**:
  - `TOTAL_SCORE_ONLY`: Tampilan card grid skor total seluruh pemain.
  - `DETAIL_TABLE`: Matriks riwayat skor per ronde per pemain.
  - `HIGHLIGHT_MINUS_PLUS`: Highlight pemain peraih poin minus terbanyak dan plus terbanyak pada ronde berjalan.
  - `LEADERBOARD`: Animasi podium dan peringkat 1 sampai N.
  - `GAME_OVER`: Pop-up selebrasi panggung pemenang akhir.
- **`SoundEffectType`**: `VICTORY`, `MINUS_PENALTY`, `ROUND_BELL`.

---

## 4. Domain Events & Real-time Integration

1. **`MatchStarted`**:
   - *Payload:* `{ matchId, title, players, startedAt }`
   - *Aksi:* Menginisiasi state pertandingan ke status `ONGOING`.
2. **`ScoreInputted`**:
   - *Payload:* `{ matchId, playerId, roundNumber, pointDelta, sourceType, newTotalScore }`
   - *Aksi:* Memperbarui total skor pemain di database dan memancarkan event pembaruan tampilan ke layar laptop.
3. **`ScoreUndone`**:
   - *Payload:* `{ matchId, revertedLogId, playerId, restoredTotalScore }`
   - *Aksi:* Menghapus log terakhir dan memperbarui nilai pemain di display.
4. **`DisplayModeChanged`**:
   - *Payload:* `{ matchId, viewMode, activeFilter }`
   - *Aksi:* Layar laptop seketika beralih mode tampilan secara sinkron tanpa jeda.
5. **`AudioEffectTriggered`**:
   - *Payload:* `{ matchId, effect: 'VICTORY' | 'MINUS_PENALTY' | 'ROUND_BELL' }`
   - *Aksi:* Klien layar laptop memutar audio sintetis Web Audio API secara lokal.
6. **`MatchEnded`**:
   - *Payload:* `{ matchId, finalStandings, endedAt }`
   - *Aksi:* Mengunci data pertandingan, mengubah status menjadi `FINISHED`, dan menampilkan modal podium juara di laptop.

---

## 5. Implementasi Skema Basis Data Relasional (Drizzle ORM Engine)

File skema: `src/db/schema/matches.schema.ts`

```typescript
import { 
  pgTable, 
  serial, 
  text, 
  integer, 
  boolean, 
  timestamp, 
  jsonb, 
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
  pointDelta: integer("point_delta").notNull(), // -200, -100, +100, +150, +200, manual
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
```