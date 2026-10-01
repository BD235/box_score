import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { matches, players, displayStates } from "@/db/schema/matches.schema";
import { desc, asc } from "drizzle-orm";
import { ScoreSyncEngine } from "@/domain/match-engine";
import { fetchFullMatch } from "@/app/actions/mutate-score";

const DEFAULT_PALETTE = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"];

const createMatchSchema = z.object({
  title: z.string().min(1).max(80),
  players: z.array(
    z.object({
      name: z.string().min(1).max(30),
      colorHex: z.string().default("#3b82f6"),
    })
  ).min(4).max(8), // default min 4-5 players
});

export async function GET() {
  try {
    const { db } = await getDatabase();
    const allMatches = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.updatedAt))
      .limit(50);

    const fullList = await Promise.all(
      allMatches.map(async (m) => {
        const full = await fetchFullMatch(m.id);
        return full;
      })
    );

    return NextResponse.json({ matches: fullList.filter(Boolean) });
  } catch (error) {
    console.error("GET /api/matches error:", error);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createMatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`;

    const { db } = await getDatabase();

    const [newMatch] = await db
      .insert(matches)
      .values({
        slug,
        title: data.title,
        status: "ONGOING",
        currentRound: 1,
      })
      .returning();

    const playerInserts = data.players.map((p, idx) => ({
      matchId: newMatch.id,
      name: p.name,
      slotOrder: idx + 1,
      colorHex: p.colorHex || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length],
      totalScore: 0,
    }));

    await db.insert(players).values(playerInserts);

    await db.insert(displayStates).values({
      matchId: newMatch.id,
      viewMode: "TOTAL_SCORE_ONLY",
      activeFilter: "ALL",
      timerSeconds: 0,
      isTimerRunning: false,
    });

    const fullMatch = await fetchFullMatch(newMatch.id);

    return NextResponse.json({ match: fullMatch }, { status: 201 });
  } catch (error) {
    console.error("POST /api/matches error:", error);
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
  }
}
