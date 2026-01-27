import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { getRandomTheme } from "@/lib/gameThemes";
import { calculateSmartWinner, awardGameRewards } from "@/lib/cardGameUtils";

// Helper for Duration Map (Shared logic)
const DURATIONS_MAP: Record<string, number> = {
  "24h": 24 * 3600,
  "12h": 12 * 3600,
  "6h": 6 * 3600,
  "3h": 3 * 3600,
  "2h": 2 * 3600,
  "1h": 3600,
  "30m": 1800,
  "5m": 300,
  "1m": 60
};

export async function POST(req: Request) {
  try {
    const { gameId, expiryLabel: reqLabel, isPremium: reqPremium } = await req.json();

    if (!gameId) {
      return NextResponse.json({ error: "Missing Game ID" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const now = Timestamp.now();
    const gameRef = db.collection("cardGames").doc(gameId);

    let newGameId: string | null = null;
    let recoveryNeeded = false;
    let isArchived = false;

    // --- GUARANTEED REWARD PROCESSING ---
    const initialGameSnap = await gameRef.get();
    if (initialGameSnap.exists) {
      const gameData = initialGameSnap.data()!;
      const startTime = gameData.startTime?.seconds || 0;

      let winnerIndex = gameData.winnerIndex;

      // If auto game and winner not yet calculated, calculate it now
      if (gameData.winnerSelection === 'auto' && (winnerIndex === -1 || winnerIndex === undefined)) {
        const { winnerIndex: calculatedIdx } = await calculateSmartWinner(db, gameId, startTime);
        winnerIndex = calculatedIdx;
        // Update doc with winnerIndex so awardGameRewards can use it (or just pass it)
        await gameRef.update({ winnerIndex: winnerIndex, status: 'expired' });
      }

      // Award rewards if they haven't been (this is idempotent)
      if (winnerIndex !== -1 && winnerIndex !== undefined) {
        await awardGameRewards(db, gameId, winnerIndex, startTime);
        console.log(`[CYCLE] Automatically awarded rewards for Game ${gameId}`);
      }
    }

    try {
      await db.runTransaction(async (t) => {
        const gameSnap = await t.get(gameRef);

        // Critical Check: If game missing, assume race condition and trigger recovery
        if (!gameSnap.exists) {
          throw new Error("GAME_NOT_FOUND");
        }

        const gameData = gameSnap.data()!;
        const startTime = gameData.startTime?.seconds || 0;
        const duration = gameData.duration || 0;
        const isTimeExpired = now.seconds >= startTime + duration - 5;
        const isStatusExpired = gameData.status === 'expired';

        if (!isTimeExpired && !isStatusExpired) {
          throw new Error("EARLY_CYCLE_ATTEMPT");
        }

        let expiryLabel = gameData.expiryLabel;
        const isPremium = gameData.isPremium ?? false;
        const price = gameData.price;

        // Fallback for missing label
        if (!expiryLabel) {
          const entry = Object.entries(DURATIONS_MAP).find(([_, v]) => v === duration);
          if (entry) expiryLabel = entry[0];
        }

        // MANUAL GAME CHECK: Based on Winner Selection Mode
        // Manual Mode -> Archive (History)
        // Auto Mode -> Cycle (Loop)
        if (gameData.winnerSelection === 'manual') {
          t.update(gameRef, { status: 'inactive' });
          isArchived = true;
          return;
        }

        // If we can't replicate (missing critical data), just delete
        if (!expiryLabel || !price) {
          t.delete(gameRef);
          return;
        }

        // Generate New Game Data
        const theme = getRandomTheme();
        let questionText = theme.questionTemplates[Math.floor(Math.random() * theme.questionTemplates.length)];

        // NO: Move awardGameRewards OUTSIDE or right here?
        // Let's do it right here if it's an auto game
        if (gameData.winnerSelection === 'auto') {
          // We'll let the Cron handle the heavy lifting or do a quick call here.
          // To keep it simple and safe from transaction timeouts, let's just ensure 
          // finalize was called or trigger award here.
        }

        const newGameData = {
          question: `${questionText} (${expiryLabel})`,
          price: price,
          duration: duration,
          winnerIndex: -1,
          winnerSelection: "auto",
          status: "active",
          isPremium: isPremium,
          cardImages: theme.cards,
          startTime: now,
          createdAt: now,
          updatedAt: now,
          generatedBy: "Instant_Cycle",
          expiryLabel: expiryLabel,
          themeId: theme.id
        };

        const newGameRef = db.collection("cardGames").doc();
        newGameId = newGameRef.id;

        // ATOMIC SWAP: Delete Old, Create New
        t.delete(gameRef);
        t.set(newGameRef, newGameData);
      });

    } catch (e: any) {
      if (e.message === "GAME_NOT_FOUND") {
        recoveryNeeded = true;
      } else if (e.message === "EARLY_CYCLE_ATTEMPT") {
        return NextResponse.json({ error: "Game is not yet expired" }, { status: 400 });
      } else {
        throw e; // Rethrow unexpected errors
      }
    }

    // --- RECOVERY LOGIC (Optimized 404 Handler) ---
    if (recoveryNeeded && reqLabel) {
      const replacementSnap = await db.collection("cardGames")
        .where("status", "==", "active")
        .where("expiryLabel", "==", reqLabel)
        .where("isPremium", "==", reqPremium ?? false)
        .get();

      const validReplacements = replacementSnap.docs
        .sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));

      if (validReplacements.length > 0) {
        return NextResponse.json({ success: true, newGameId: validReplacements[0].id, note: "recovered_from_404" });
      }
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // --- ENTRY CLEANUP (Fire & Forget) ---
    if (!isArchived && (newGameId || (!newGameId && !recoveryNeeded))) {
      // Clean up entries related to the deleted game
      // We do this outside transaction to avoid limits, as entries are children of the cycle
      const batch = db.batch();
      const entriesSnap = await db.collection("cardGameEntries").where("gameId", "==", gameId).get();
      if (!entriesSnap.empty) {
        entriesSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit().catch(console.error);
      }
    }

    if (newGameId) {
      // Award Rewards for the OLD game before finishing
      const gameSnap = await db.collection("cardGames").doc(gameId).get(); // Historical ref or deleted?
      // Since it was deleted in transaction, we need the winner index which might be unknown here 
      // if it was an auto-game being cycled.
      // Actually, in Auto Mode, the winnerIndex is set to -1 until finalization.
      // THE CRON handles this now properly. 
      return NextResponse.json({ success: true, newGameId });
    }

    if (isArchived) {
      return NextResponse.json({ success: true, action: "archived" });
    }

    return NextResponse.json({ success: true, action: "deleted_only" });

  } catch (error: any) {
    console.error("Cycle Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
