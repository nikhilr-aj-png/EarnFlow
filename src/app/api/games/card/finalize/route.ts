import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { calculateSmartWinner, awardGameRewards } from "@/lib/cardGameUtils";

export async function POST(req: Request) {
  try {
    const { gameId, gameStartTime } = await req.json();

    if (!gameId) {
      return NextResponse.json({ error: "Missing Game ID" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    const gameRef = db.collection("cardGames").doc(gameId);

    let resultWinnerIndex = -1;
    let alreadySet = false;

    console.log(`Starting transaction for gameId: ${gameId}`);
    await db.runTransaction(async (t) => {
      const gameSnap = await t.get(gameRef);
      if (!gameSnap.exists) throw new Error("GAME_NOT_FOUND");

      const gameData = gameSnap.data()!;

      // 1. Idempotent check
      if (gameData.winnerIndex !== undefined && gameData.winnerIndex !== -1) {
        resultWinnerIndex = gameData.winnerIndex;
        alreadySet = true;
        return;
      }

      // 2. Calculate Winner
      const winningTime = gameStartTime || gameData.startTime?.seconds;
      const { winnerIndex } = await calculateSmartWinner(db, gameId, winningTime);
      resultWinnerIndex = winnerIndex;

      // 3. Update Game State
      t.update(gameRef, {
        winnerIndex: winnerIndex,
        status: 'expired',
        updatedAt: Timestamp.now()
      });
    });

    // Award Rewards OUTSIDE transaction to avoid contention, but ONLY if we were the one who set it (or just always call it as it's idempotent for each entry)
    const finalResult = await awardGameRewards(db, gameId, resultWinnerIndex, gameStartTime);

    return NextResponse.json({
      winnerIndex: resultWinnerIndex,
      alreadySet,
      winnersPaid: finalResult.winners
    });

  } catch (error: any) {
    console.error("Finalize Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
