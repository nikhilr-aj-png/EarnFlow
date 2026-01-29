import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { calculateSmartWinner, awardGameRewards } from "@/lib/cardGameUtils";
import { getRandomTheme } from "@/lib/gameThemes";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  console.log("[CRON-GAME] Request received at:", new Date().toISOString());

  try {
    // 1. Robust URL Parsing
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const fullUrl = new URL(req.url, `${protocol}://${host}`);
    const queryKey = fullUrl.searchParams.get('key');
    const authHeader = req.headers.get('authorization');

    console.log("[CRON-GAME] Security Check...");
    if (
      process.env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      queryKey !== process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    ) {
      console.warn("[CRON-GAME] Unauthorized attempt.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("[CRON-GAME] Connecting to Firestore...");
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const now = Timestamp.now();

    // 0. Cleanup (Optimized: Memory filter to avoid index)
    console.log("[CRON-GAME] Cleaning up old manual games...");
    const thirtyMinsAgo = (now.seconds - 1800);
    const oldGamesSnap = await db.collection("cardGames")
      .where("status", "==", "expired")
      .limit(20)
      .get();

    for (const oldDoc of oldGamesSnap.docs) {
      try {
        const d = oldDoc.data();
        const updatedAt = d.updatedAt?.seconds || 0;
        const winnerSelection = d.winnerSelection || 'manual';

        if (updatedAt < thirtyMinsAgo && winnerSelection === 'manual') {
          const batch = db.batch();
          const oldEntries = await db.collection("cardGameEntries").where("gameId", "==", oldDoc.id).get();
          oldEntries.forEach(ed => batch.delete(ed.ref));
          batch.delete(oldDoc.ref);
          await batch.commit();
        }
      } catch (cleanErr) { console.error(`[CRON-GAME] Cleanup error for ${oldDoc.id}`, cleanErr); }
    }

    // 1. Fetch Candidates
    console.log("[CRON-GAME] Fetching games...");
    const gamesSnap = await db.collection("cardGames")
      .where("status", "in", ["active", "expired", "inactive"])
      .get();

    console.log(`[CRON-GAME] Found ${gamesSnap.size} games to check.`);

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
          console.log(`[CRON-GAME] Processing ${gameDoc.id} (${winnerSelection})...`);
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
                price: gameData.price || 10, question: gameData.question || "Card Game",
                startTime: gameData.startTime || now, endTime: now, createdAt: now
              });

              t.update(gameDoc.ref, {
                question: `${theme.questionTemplates[0]} (${expiryLabel})`,
                price, duration, winnerIndex: -1, winnerSelection: "auto",
                status: "active", cardImages: theme.cards.slice(0, 2),
                themeId: theme.id, startTime: now, updatedAt: now,
                generatedBy: "Cron_Stable_Recycle_V4",
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
        console.error(`[CRON-GAME] Error on game ${gameDoc.id}:`, gameErr.message);
      }
    }

    // 3. Payouts
    console.log(`[CRON-GAME] Awarding ${tasksProcessed.length} winners...`);
    for (const task of tasksProcessed) {
      awardGameRewards(db, task.gameId, task.winnerIndex, task.startTime, task.price, task.question)
        .catch(err => console.error(`[CRON-AWARD] Error for ${task.gameId}:`, err));
    }

    console.log("[CRON-GAME] Completed successfully.");
    return NextResponse.json({ success: true, processed: processedCount, awarded: tasksProcessed.length });

  } catch (error: any) {
    console.error("[CRON-GAME] UNHANDLED ERROR:", error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
      step: "catch_block"
    }, { status: 500 });
  }
}
