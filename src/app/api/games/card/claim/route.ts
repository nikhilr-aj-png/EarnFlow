import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { userId, gameId, gameStartTime, winnerIndex, reward } = await req.json();

    if (!userId || !gameId || !gameStartTime || winnerIndex === undefined || !reward) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    const result = await db.runTransaction(async (transaction: any) => {
      const gameSessionId = `${userId}_${gameId}_${gameStartTime}`;
      const entryRef = db.collection("cardGameEntries").doc(gameSessionId);
      const entrySnap = await transaction.get(entryRef);

      if (!entrySnap.exists) throw new Error("Entry not found");
      const entryData = entrySnap.data();

      if (entryData.rewardProcessed) {
        throw new Error("Reward already processed");
      }

      // Verify Winner Logic Server Side
      if (!entryData.selectedCards.includes(winnerIndex)) {
        // User didn't win, but we mark as processed so they can't try again? 
        // Or just let client handle the "Lost" message. 
        // But to be safe, let's mark processed.
        transaction.update(entryRef, { rewardProcessed: true });
        return { success: true, won: false };
      }

      // User Won
      const userRef = db.collection("users").doc(userId);
      transaction.update(userRef, {
        coins: FieldValue.increment(reward),
        totalEarned: FieldValue.increment(reward)
      });

      transaction.update(entryRef, { rewardProcessed: true });

      return { success: true, won: true, reward };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    if (error.message === "Reward already processed") {
      return NextResponse.json({ error: "Reward already processed" }, { status: 400 });
    }
    console.error("Card Claim Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
