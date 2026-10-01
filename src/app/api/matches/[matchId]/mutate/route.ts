import { NextResponse } from "next/server";
import { mutateScore } from "@/app/actions/mutate-score";

interface Context {
  params: { matchId: string };
}

export async function POST(req: Request, { params }: Context) {
  try {
    const matchId = parseInt(params.matchId, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const body = await req.json();
    const result = await mutateScore({ ...body, matchId });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to process mutation" }, { status: 500 });
  }
}
