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

      // 3. Record to History (Aviator Strip) - IDEMPOTENT ID
      const historyId = `hist_${gameId}_${winningTime}`;
      const historyRef = db.collection("cardGameHistory").doc(historyId);
      t.set(historyRef, {
        gameId: gameId,
        winnerIndex: winnerIndex,
        winnerSelection: gameData.winnerSelection,
        price: gameData.price,
        question: gameData.question,
        startTime: gameData.startTime,
        endTime: Timestamp.now(),
        createdAt: Timestamp.now()
      });

      // 4. Update Game State to EXPIRED (Don't Delete)
      t.update(gameRef, {
        winnerIndex: winnerIndex,
        status: 'expired',
        updatedAt: Timestamp.now()
      });
    });

    // Award Rewards OUTSIDE transaction
    // We fetch one more time to get the titles/price safely if needed, or pass them
    const gSnap = await gameRef.get();
    const gData = gSnap.data();
    const finalResult = await awardGameRewards(
      db,
      gameId,
      resultWinnerIndex,
      gameStartTime,
      gData?.price,
      gData?.question
    );

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
