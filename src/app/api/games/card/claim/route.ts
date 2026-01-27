import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { userId, gameId, gameStartTime } = await req.json();

    if (!userId || !gameId || !gameStartTime) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    const result = await db.runTransaction(async (transaction: any) => {
      // 0. Verify Game State & Winner
      const gameRef = db.collection("cardGames").doc(gameId);
      const gameSnap = await transaction.get(gameRef);
      if (!gameSnap.exists) throw new Error("Game not found");
      const gameData = gameSnap.data();

      // Ensure Winner is set (Server Authority)
      if (gameData.winnerIndex === -1 || gameData.winnerIndex === undefined) {
        throw new Error("Game winner not yet declared");
      }

      const actualWinnerIndex = gameData.winnerIndex;
      const gamePrice = Number(gameData.price || 0);
      let calculatedReward = gamePrice * 2; // SECURE: Price * 2 calculation on server

      console.log(`[CLAIM] Request for User: ${userId}, Game: ${gameId}, Price: ${gamePrice}`);

      // 1. Get Entry Data
      const gameSessionId = `${userId}_${gameId}_${gameStartTime}`;
      const entryRef = db.collection("cardGameEntries").doc(gameSessionId);
      const entrySnap = await transaction.get(entryRef);

      if (!entrySnap.exists) throw new Error("Entry not found");
      const entryData = entrySnap.data();

      if (entryData.rewardProcessed) {
        throw new Error("Reward already processed");
      }

      // Verify Selection against Actual Winner
      if (!entryData.selectedCards || !entryData.selectedCards.includes(actualWinnerIndex)) {
        transaction.update(entryRef, { rewardProcessed: true });
        return { success: true, won: false };
      }

      // User Won - Apply 2x Reward (STRICT CASTING)
      calculatedReward = Number(gameData.price) * 2;
      const userRef = db.collection("users").doc(userId);

      transaction.update(userRef, {
        coins: admin.firestore.FieldValue.increment(calculatedReward),
        totalEarned: admin.firestore.FieldValue.increment(calculatedReward),
        gameEarnings: admin.firestore.FieldValue.increment(calculatedReward)
      });

      transaction.update(entryRef, {
        rewardProcessed: true,
        rewardAmount: calculatedReward,
        updatedAt: admin.firestore.Timestamp.now()
      });

      // 3. Record Activity (Unified History)
      const activityRef = db.collection("activities").doc();
      transaction.set(activityRef, {
        userId,
        type: 'game_win',
        amount: calculatedReward,
        title: "Card Game Win 🏆",
        metadata: { gameId, manuallyClaimed: true },
        createdAt: admin.firestore.Timestamp.now()
      });

      console.log(`[CLAIM] Success for User ${userId}, Won: ${calculatedReward}`);
      return { success: true, won: true, reward: calculatedReward };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    if (error.message === "Reward already processed") {
      return NextResponse.json({ error: "Reward already processed" }, { status: 400 });
    }
    console.error("Card Claim Error Check:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
