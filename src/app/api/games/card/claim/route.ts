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

      // 1. Get ALL Winning Entries for this user/round
      const entriesSnap = await db.collection("cardGameEntries")
        .where("userId", "==", userId)
        .where("gameId", "==", gameId)
        .where("gameStartTime", "==", gameStartTime)
        .where("rewardProcessed", "==", false)
        .get();

      if (entriesSnap.empty) throw new Error("No pending entries found");

      let totalReward = 0;
      let winningDocs: any[] = [];

      entriesSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.selectedCards?.includes(actualWinnerIndex)) {
          // Calculate reward based on THIS entry's price (or global if missing)
          const entryPrice = data.price || gamePrice;
          totalReward += (entryPrice * 2);
          winningDocs.push(doc.ref);
        } else {
          // Mark losing entry as processed
          transaction.update(doc.ref, { rewardProcessed: true, won: false, updatedAt: admin.firestore.Timestamp.now() });
        }
      });

      if (totalReward === 0) {
        return { success: true, won: false, note: "No winning cards in this selection" };
      }

      // User Won - Apply Summed Rewards
      const userRef = db.collection("users").doc(userId);
      transaction.update(userRef, {
        coins: admin.firestore.FieldValue.increment(totalReward),
        totalEarned: admin.firestore.FieldValue.increment(totalReward),
        gameEarnings: admin.firestore.FieldValue.increment(totalReward)
      });

      // Mark all winning entries as processed
      winningDocs.forEach(ref => {
        transaction.update(ref, {
          rewardProcessed: true,
          won: true,
          rewardAmount: totalReward / winningDocs.length, // Split for record
          updatedAt: admin.firestore.Timestamp.now()
        });
      });

      // 3. Record Activity (Unified History)
      const activityRef = db.collection("activities").doc();
      transaction.set(activityRef, {
        userId,
        type: 'game_win',
        amount: totalReward,
        title: "Card Game Win 🏆",
        metadata: {
          gameId,
          winningCards: winningDocs.length,
          manuallyClaimed: true,
          gameTitle: gameData.question
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      });

      console.log(`[CLAIM] Success for User ${userId}, Won: ${calculatedReward}`);

      // 4. Award Referral Commission (Post-transaction, non-blocking for user)
      import("@/lib/referralUtils").then(mod => {
        mod.awardReferralCommission(db, userId, calculatedReward, `Card Game Win (${gameData.question || 'Arena'})`)
          .catch(err => console.error("Game Commission Error:", err));
      });

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
