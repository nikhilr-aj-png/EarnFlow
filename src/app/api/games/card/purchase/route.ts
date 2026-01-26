import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { userId, gameId, cardIndex, gameStartTime, price } = await req.json();

    if (!userId || !gameId || cardIndex === undefined || !gameStartTime || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    const result = await db.runTransaction(async (transaction: any) => {
      // 1. Get User Data for Balance Check
      const userRef = db.collection("users").doc(userId);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists) throw new Error("User not found");
      const userData = userSnap.data();

      if ((userData.coins || 0) < price) {
        throw new Error("Insufficient coins");
      }

      // 2. Check Game Entry
      const gameSessionId = `${userId}_${gameId}_${gameStartTime}`;
      const entryRef = db.collection("cardGameEntries").doc(gameSessionId);
      const entrySnap = await transaction.get(entryRef);

      let currentSelected: number[] = [];
      if (entrySnap.exists) {
        currentSelected = entrySnap.data().selectedCards || [];
      }

      if (currentSelected.includes(cardIndex)) {
        throw new Error("Card already purchased");
      }

      // 3. Deduct Coins
      transaction.update(userRef, {
        coins: FieldValue.increment(-price)
      });

      // 4. Update/Create Entry
      const newSelected = [...currentSelected, cardIndex];
      transaction.set(entryRef, {
        userId,
        gameId,
        selectedCards: newSelected,
        gameStartTime,
        rewardProcessed: entrySnap.exists ? entrySnap.data().rewardProcessed : false,
        updatedAt: Timestamp.now()
      }, { merge: true });

      return { success: true, newBalance: (userData.coins || 0) - price };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Card Purchase Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
