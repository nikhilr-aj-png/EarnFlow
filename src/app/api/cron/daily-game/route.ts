import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { calculateSmartWinner, awardGameRewards } from "@/lib/cardGameUtils";
import { getRandomTheme } from "@/lib/gameThemes";

export const dynamic = "force-dynamic";

export async function GET(req: any) {
  // 1. Security Check (Allow Vercel Cron OR Client Pulse with Key)
  const authHeader = req.headers.get('authorization');
  const queryKey = new URL(req.url).searchParams.get('key');

  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    queryKey !== process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    // 1. Fetch all games that need processing (Active, Expired, or accidentally Inactive auto-slots)
    const gamesSnap = await db.collection("cardGames")
      .where("status", "in", ["active", "expired", "inactive"])
      .get();

    const tasksProcessed: any[] = [];
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
      // C. If Inactive & Auto Mode -> Force revive (Slot Recovery)

      const needsProcessing = (status === 'active' && isExpired);
      const needsRecycling = (winnerSelection === 'auto' && (status === 'expired' || status === 'inactive' || isExpired));

      console.log(`[CRON] Checking Game ${gameDoc.id}: status=${status}, isExpired=${isExpired}, needsProc=${needsProcessing}, needsRecycle=${needsRecycling}`);

      if (needsProcessing || needsRecycling) {
        const gameId = gameDoc.id;

        // --- 1. HANDLE OUTCOME (Calculate Result inside Transaction) ---
        let winnerIndex = gameData.winnerIndex;
        if (winnerIndex === -1 || winnerIndex === undefined) {
          const { winnerIndex: calculatedIdx } = await calculateSmartWinner(db, gameId, startTime);
          winnerIndex = calculatedIdx;
        }

        // --- 2. ATOMIC TRANSITION (Recycle FIRST) ---
        if (winnerSelection === 'auto') {
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
              generatedBy: "Cron_Stable_Recycle_V2", // Prioritize recycling
              expiryLabel: expiryLabel,
              isPremium: isPremium
            });
          });
        } else {
          // INACTIVATE MANUAL GAME
          await gameDoc.ref.update({ status: 'inactive', winnerIndex, updatedAt: now });
        }

        // Save for post-cycle awarding
        tasksProcessed.push({
          gameId,
          winnerIndex,
          startTime,
          price: gameData.price,
          question: gameData.question
        });
        processedCount++;
      }
    }

    // --- 3. POST-CYCLE AWARDING (Non-blocking) ---
    // We award rewards AFTER the next rounds have already been created/started
    for (const task of tasksProcessed) {
      awardGameRewards(db, task.gameId, task.winnerIndex, task.startTime, task.price, task.question)
        .catch(err => console.error(`[POST-AWARD] Error for ${task.gameId}:`, err));
    }

    return NextResponse.json({ success: true, processed: processedCount, awarded: tasksProcessed.length });

  } catch (error: any) {
    console.error("Cron Daily Game Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
