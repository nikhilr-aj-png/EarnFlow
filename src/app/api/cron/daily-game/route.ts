import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { calculateSmartWinner, awardGameRewards } from "@/lib/cardGameUtils";
import { getRandomTheme } from "@/lib/gameThemes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1. Security Check
  const authHeader = req.headers.get('authorization');
  const queryKey = req.nextUrl.searchParams.get('key');

  console.log("[CRON-GAME] Init. Security Check...");

  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    queryKey !== process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ) {
    console.warn("[CRON-GAME] Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("[CRON-GAME] Initializing Firebase Admin...");
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const now = Timestamp.now();

    // 0. Cleanup
    console.log("[CRON-GAME] Running cleanup for old manual games...");
    const thirtyMinsAgo = new Timestamp(now.seconds - 1800, now.nanoseconds);
    const oldGamesSnap = await db.collection("cardGames")
      .where("status", "==", "expired")
      .where("updatedAt", "<", thirtyMinsAgo)
      .where("winnerSelection", "==", "manual")
      .limit(10)
      .get();

    for (const oldDoc of oldGamesSnap.docs) {
      try {
        const batch = db.batch();
        const oldEntries = await db.collection("cardGameEntries").where("gameId", "==", oldDoc.id).get();
        oldEntries.forEach(ed => batch.delete(ed.ref));
        batch.delete(oldDoc.ref);
        await batch.commit();
      } catch (e) { console.error(`[CRON-GAME] Cleanup failed for ${oldDoc.id}`, e); }
    }

    // 1. Fetch
    console.log("[CRON-GAME] Fetching games to process...");
    const gamesSnap = await db.collection("cardGames")
      .where("status", "in", ["active", "expired", "inactive"])
      .get();

    console.log(`[CRON-GAME] Found ${gamesSnap.size} candidates.`);

    const tasksProcessed: any[] = [];
    let processedCount = 0;

    for (const gameDoc of gamesSnap.docs) {
      try {
        const gameData = gameDoc.data();
        const status = gameData.status;
        const winnerSelection = gameData.winnerSelection || 'manual';
        const startTime = gameData.startTime?.seconds || 0;
        const duration = gameData.duration || 0;
        const isExpired = now.seconds >= (startTime + duration - 2);

        const needsAction = (winnerSelection === 'auto' && (status !== 'active' || isExpired || (gameData.winnerIndex !== -1 && gameData.winnerIndex !== undefined))) ||
          (winnerSelection === 'manual' && status === 'active' && isExpired);

        if (needsAction) {
          console.log(`[CRON-GAME] Processing Game ${gameDoc.id} (${winnerSelection})`);
          const gameId = gameDoc.id;

          let winnerIndex = gameData.winnerIndex;
          if (winnerIndex === -1 || winnerIndex === undefined) {
            const { winnerIndex: calculatedIdx } = await calculateSmartWinner(db, gameId, startTime);
            winnerIndex = calculatedIdx;
          }

          if (winnerSelection === 'auto') {
            const theme = getRandomTheme();
            const expiryLabel = gameData.expiryLabel || "1h";
            const price = gameData.price || 10;
            const isPremium = gameData.isPremium ?? false;

            await db.runTransaction(async (t) => {
              const historyId = `hist_${gameId}_${startTime}`;
              const historyRef = db.collection("cardGameHistory").doc(historyId);
              t.set(historyRef, {
                gameId, winnerIndex, winnerSelection,
                price: gameData.price, question: gameData.question,
                startTime: gameData.startTime, endTime: now, createdAt: now
              });

              t.update(gameDoc.ref, {
                question: `${theme.questionTemplates[0]} (${expiryLabel})`,
                price, duration, winnerIndex: -1, winnerSelection: "auto",
                status: "active", cardImages: theme.cards.slice(0, 2),
                themeId: theme.id, startTime: now, updatedAt: now,
                generatedBy: "Cron_Stable_Recycle_V3",
                expiryLabel, isPremium
              });
            });
          } else {
            await gameDoc.ref.update({ status: 'inactive', winnerIndex, updatedAt: now });
          }

          tasksProcessed.push({ gameId, winnerIndex, startTime, price: gameData.price, question: gameData.question });
          processedCount++;
        }
      } catch (gameErr: any) {
        console.error(`[CRON-GAME] Error processing game ${gameDoc.id}:`, gameErr.message);
      }
    }

    console.log("[CRON-GAME] Processing payouts...");
    for (const task of tasksProcessed) {
      awardGameRewards(db, task.gameId, task.winnerIndex, task.startTime, task.price, task.question)
        .catch(err => console.error(`[POST-AWARD] Error for ${task.gameId}:`, err));
    }

    console.log("[CRON-GAME] Finished successfully.");
    return NextResponse.json({ success: true, processed: processedCount, awarded: tasksProcessed.length });

  } catch (error: any) {
    console.error("[CRON-GAME] FATAL ERROR:", error);
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
