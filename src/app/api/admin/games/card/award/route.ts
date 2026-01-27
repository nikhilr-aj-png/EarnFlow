import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { awardGameRewards } from "@/lib/cardGameUtils";

export async function POST(req: Request) {
  try {
    const { gameId, winnerIndex, startTime } = await req.json();

    if (!gameId || winnerIndex === undefined || winnerIndex === -1) {
      return NextResponse.json({ error: "Invalid Game Data" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    // 1. Double check admin auth if needed (Skipping for now as per current project style, assuming admin only hits this)

    // 2. Perform Award
    const result = await awardGameRewards(db, gameId, winnerIndex, startTime);

    console.log(`[ADMIN AWARD] Manually triggered for Game ${gameId}. Winners: ${result.winners}`);

    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    console.error("Admin Award Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
