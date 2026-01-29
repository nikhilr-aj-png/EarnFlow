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
    // CRITICAL: ONLY delete manual games. Auto-slots must be recycled, never deleted.
    const thirtyMinsAgo = new Timestamp(now.seconds - 1800, now.nanoseconds);
    const oldGamesSnap = await db.collection("cardGames")
      .where("status", "==", "expired")
      .where("updatedAt", "<", thirtyMinsAgo)
      .where("winnerSelection", "==", "manual") // Safety: Never delete auto-slots
      .limit(10)
      .get();

    for (const oldDoc of oldGamesSnap.docs) {
      const batch = db.batch();
      const oldEntries = await db.collection("cardGameEntries").where("gameId", "==", oldDoc.id).get();
      oldEntries.forEach(ed => batch.delete(ed.ref));
      batch.delete(oldDoc.ref);
      await batch.commit().catch(console.error);
    }

    // 1. Fetch all games that need processing (Active OR Expired)
    const gamesSnap = await db.collection("cardGames")
      .where("status", "in", ["active", "expired"])
      .get();

    let processedCount = 0;

    for (const gameDoc of gamesSnap.docs) {
      const gameData = gameDoc.data();
      const status = gameData.status;
      const winnerSelection = gameData.winnerSelection || 'manual';
      const startTime = gameData.startTime?.seconds || 0;
      const duration = gameData.duration || 0;
      const isExpired = now.seconds >= startTime + duration;

      // Logic:
      // A. If Active & Time is Up -> Process Outcome
      // B. If Expired & Auto Mode -> Recycle immediately (Recovery)

      if ((status === 'active' && isExpired) || (status === 'expired' && winnerSelection === 'auto')) {
        const gameId = gameDoc.id;

        // --- 1. HANDLE OUTCOME (Calculate & Save Result) ---
        let winnerIndex = gameData.winnerIndex;
        if (winnerIndex === -1 || winnerIndex === undefined) {
          const { winnerIndex: calculatedIdx } = await calculateSmartWinner(db, gameId, startTime);
          winnerIndex = calculatedIdx;
        }

        // Award Rewards (Idempotent)
        await awardGameRewards(db, gameId, winnerIndex, startTime, gameData.price, gameData.question)
          .catch(console.error);

        // --- 2. TRANSITION ---
        if (winnerSelection === 'auto') {
          // RECYCLE INDEFINITELY
          const theme = getRandomTheme();
          const expiryLabel = gameData.expiryLabel || "1h";
          const price = gameData.price || 10;
          const isPremium = gameData.isPremium ?? false;

          await db.runTransaction(async (t) => {
            const historyId = `hist_${gameId}_${startTime}`;
            const historyRef = db.collection("cardGameHistory").doc(historyId);
            t.set(historyRef, {
              gameId: gameId,
              winnerIndex: winnerIndex,
              winnerSelection: "auto",
              price: gameData.price,
              question: gameData.question,
              startTime: gameData.startTime,
              endTime: now,
              createdAt: now
            });

            t.update(gameDoc.ref, {
              question: `${theme.questionTemplates[0]} (${expiryLabel})`,
              price: price,
              duration: duration,
              winnerIndex: -1,
              winnerSelection: "auto",
              status: "active",
              cardImages: (gameData.cardImages && gameData.cardImages.length === 2)
                ? gameData.cardImages
                : theme.cards.slice(0, 2),
              themeId: theme.id,
              startTime: now,
              updatedAt: now,
              generatedBy: "Cron_Stable_Recycle",
              expiryLabel: expiryLabel,
              isPremium: isPremium
            });
          });
        } else {
          // INACTIVATE MANUAL GAME
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
