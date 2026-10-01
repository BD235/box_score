import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { scoreLogs } from "@/db/schema/matches.schema";
import { eq, desc } from "drizzle-orm";

interface Context {
  params: { matchId: string };
}

export async function GET(req: Request, { params }: Context) {
  try {
    const matchId = parseInt(params.matchId, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const { db } = await getDatabase();
    const logs = await db
      .select()
      .from(scoreLogs)
      .where(eq(scoreLogs.matchId, matchId))
      .orderBy(desc(scoreLogs.createdAt));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/matches/[matchId]/logs error:", error);
    return NextResponse.json({ error: "Failed to fetch score logs" }, { status: 500 });
  }
}
