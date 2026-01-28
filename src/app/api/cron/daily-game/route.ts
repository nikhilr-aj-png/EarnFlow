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

    // 0. Cleanup old 'expired' games and entries (Self-Healing GC)
    const thirtyMinsAgo = new Timestamp(now.seconds - 1800, now.nanoseconds);
    const oldGamesSnap = await db.collection("cardGames")
      .where("status", "==", "expired")
      .where("updatedAt", "<", thirtyMinsAgo)
      .limit(10)
      .get();

    for (const oldDoc of oldGamesSnap.docs) {
      const batch = db.batch();
      // Delete entries
      const oldEntries = await db.collection("cardGameEntries").where("gameId", "==", oldDoc.id).get();
      oldEntries.forEach(ed => batch.delete(ed.ref));
      // Delete game
      batch.delete(oldDoc.ref);
      await batch.commit().catch(console.error);
    }

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
        const gameId = gameDoc.id;

        // A. Calculate Winner
        const { winnerIndex } = await calculateSmartWinner(db, gameId, startTime);

        // B. Automatically Award Rewards (Pass metadata for safety)
        await awardGameRewards(
          db,
          gameId,
          winnerIndex,
          startTime,
          gameData.price,
          gameData.question
        );

        // C. Transition to Next Game (REUSE DOCUMENT)
        if (gameData.winnerSelection === 'auto') {
          const theme = getRandomTheme();
          const expiryLabel = gameData.expiryLabel || "1h";
          const price = gameData.price || 10;
          const isPremium = gameData.isPremium ?? false;

          await db.runTransaction(async (t) => {
            // 1. Archive to History - IDEMPOTENT ID
            const historyId = `hist_${gameId}_${startTime}`;
            const historyRef = db.collection("cardGameHistory").doc(historyId);
            t.set(historyRef, {
              gameId: gameId,
              winnerIndex: winnerIndex,
              winnerSelection: gameData.winnerSelection,
              price: gameData.price,
              question: gameData.question,
              startTime: gameData.startTime,
              endTime: now,
              createdAt: now
            });

            // 2. Update Existing Document
            t.update(gameDoc.ref, {
              question: `${theme.questionTemplates[0]} (${expiryLabel})`,
              price: price,
              duration: duration,
              winnerIndex: -1,
              winnerSelection: "auto",
              status: "active",
              cardImages: (gameData.cardImages && gameData.cardImages.length === 2)
                ? gameData.cardImages
                : theme.cards.slice(0, 2), // Absolute 2-card enforcement
              themeId: theme.id,
              startTime: now,
              updatedAt: now,
              generatedBy: "Cron_Cycle_Reuse",
              expiryLabel: expiryLabel,
              isPremium: isPremium
            });
          });
        }
        else {
          // Manual games just become inactive
          await gameDoc.ref.update({ status: 'inactive', winnerIndex, updatedAt: now });
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
