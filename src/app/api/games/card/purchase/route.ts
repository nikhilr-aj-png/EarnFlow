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

      // 2. Get Game Data
      const gameRef = db.collection("cardGames").doc(gameId);
      const gameSnap = await transaction.get(gameRef);
      if (!gameSnap.exists) throw new Error("Game not found");
      const gameData = gameSnap.data();

      // 2b. STRICT PREMIUM CHECK
      if (gameData.isPremium && !userData.isPremium) {
        throw new Error("This is a Premium Game. Upgrade your plan to participate!");
      }

      // Validate Price vs Bet Mode
      if (gameData.betMode === 'fixed') {
        if (price !== gameData.price) throw new Error("Price mismatch for fixed mode");
      } else if (gameData.betMode === 'quick') {
        if (price < gameData.price) throw new Error(`Minimum bet is ${gameData.price}`);
      }

      // 3. Check Game Entry (Unique per User + Game + StartTime + Card)
      const betId = `${userId}_${gameId}_${gameStartTime}_${cardIndex}`;
      const entryRef = db.collection("cardGameEntries").doc(betId);
      const entrySnap = await transaction.get(entryRef);

      if (entrySnap.exists) {
        throw new Error("You already bet on this card in this round");
      }

      // 4. Deduct Coins
      transaction.update(userRef, {
        coins: FieldValue.increment(-price)
      });

      // 5. Create Entry (Each card selection is a unique document)
      transaction.set(entryRef, {
        userId,
        userEmail: userData.email || "Anonymous",
        userName: userData.name || "User",
        gameId,
        cardIndex,
        selectedCards: [cardIndex],
        gameStartTime,
        price: price,
        rewardProcessed: false,
        updatedAt: Timestamp.now()
      });

      // 6. Record Activity (Immediate Deduction)
      const activityRef = db.collection("activities").doc();
      transaction.set(activityRef, {
        userId,
        type: 'bet',
        amount: price,
        title: "Bet Placed 🎰",
        metadata: {
          gameId,
          cardIndex,
          gameStartTime
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      return { success: true, newBalance: (userData.coins || 0) - price };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Card Purchase Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
