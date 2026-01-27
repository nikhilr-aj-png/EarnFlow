import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { calculateSmartWinner, awardGameRewards } from "@/lib/cardGameUtils";
import { getRandomTheme } from "@/lib/gameThemes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const now = Timestamp.now();

    // 1. Fetch all active games
    const gamesSnap = await db.collection("cardGames")
      .where("status", "==", "active")
      .get();

    let processedCount = 0;

    for (const gameDoc of gamesSnap.docs) {
      const gameData = gameDoc.data();
      const startTime = gameData.startTime?.seconds || 0;
      const duration = gameData.duration || 0;

      // Check if expired
      if (now.seconds >= startTime + duration) {
        // --- CYCLE & AWARD LOGIC ---
        const gameId = gameDoc.id;

        // A. Calculate Winner
        const { winnerIndex } = await calculateSmartWinner(db, gameId, startTime);

        // B. Automatically Award Rewards (The "Missing" Piece)
        await awardGameRewards(db, gameId, winnerIndex, startTime);

        // C. Transition to Next Game (Atomically)
        if (gameData.winnerSelection === 'auto') {
          const theme = getRandomTheme();
          const expiryLabel = gameData.expiryLabel || "1h";
          const price = gameData.price || 10;

          const newGameData = {
            question: `${theme.questionTemplates[0]} (${expiryLabel})`,
            price: price,
            duration: duration,
            winnerIndex: -1,
            winnerSelection: "auto",
            status: "active",
            cardImages: theme.cards,
            startTime: now,
            createdAt: now,
            updatedAt: now,
            generatedBy: "Cron_Cycle",
            expiryLabel: expiryLabel,
            themeId: theme.id,
            isPremium: gameData.isPremium ?? false
          };

          await db.runTransaction(async (t) => {
            t.delete(gameDoc.ref);
            t.set(db.collection("cardGames").doc(), newGameData);
          });
        } else {
          // Manual games just become inactive
          await gameDoc.ref.update({ status: 'inactive', winnerIndex });
        }

        // D. Cleanup old entries
        const entriesSnap = await db.collection("cardGameEntries")
          .where("gameId", "==", gameId)
          .get();
        if (!entriesSnap.empty) {
          const batch = db.batch();
          entriesSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }

        processedCount++;
      }
    }

    return NextResponse.json({ success: true, processed: processedCount });

  } catch (error: any) {
    console.error("Cron Daily Game Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
