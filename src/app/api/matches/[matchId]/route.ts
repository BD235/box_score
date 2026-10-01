import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { matches } from "@/db/schema/matches.schema";
import { eq } from "drizzle-orm";
import { fetchFullMatch } from "@/app/actions/mutate-score";

interface Context {
  params: { matchId: string };
}

export async function GET(req: Request, { params }: Context) {
  try {
    const matchId = parseInt(params.matchId, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const fullMatch = await fetchFullMatch(matchId);
    if (!fullMatch) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({ match: fullMatch });
  } catch (error) {
    console.error("GET /api/matches/[matchId] error:", error);
    return NextResponse.json({ error: "Failed to fetch match details" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Context) {
  try {
    const matchId = parseInt(params.matchId, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const { db } = await getDatabase();
    await db.delete(matches).where(eq(matches.id, matchId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/matches/[matchId] error:", error);
    return NextResponse.json({ error: "Failed to delete match" }, { status: 500 });
  }
}
