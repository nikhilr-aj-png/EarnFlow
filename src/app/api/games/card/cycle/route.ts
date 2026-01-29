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

    try {
      await db.runTransaction(async (t) => {
        const gameSnap = await t.get(gameRef);

        if (!gameSnap.exists) {
          throw new Error("GAME_NOT_FOUND");
        }

        const gameData = gameSnap.data()!;
        const startTime = gameData.startTime?.seconds || 0;
        const duration = gameData.duration || 0;
        const isTimeExpired = now.seconds >= (startTime + duration);
        const isStatusExpired = gameData.status === 'expired';

        if (!isTimeExpired && !isStatusExpired) {
          throw new Error("EARLY_CYCLE_ATTEMPT");
        }

        let expiryLabel = gameData.expiryLabel;
        const isPremium = gameData.isPremium ?? false;
        const price = gameData.price;

        if (!expiryLabel) {
          const entry = Object.entries(DURATIONS_MAP).find(([_, v]) => v === duration);
          if (entry) expiryLabel = entry[0];
        }

        // --- 1. HANDLE ROUND OUTCOME (AUTHORITATIVE) ---
        let finalWinnerIndex = gameData.winnerIndex;

        // If auto game and no winner set, calculate it NOW inside transaction
        if (gameData.winnerSelection === 'auto' && (finalWinnerIndex === -1 || finalWinnerIndex === undefined)) {
          // Note: We can't await complex external logic easily here, but we can do volume checks.
          // For simplicity and to avoid transaction timeouts, we use the pre-calculated calculation 
          // or a quick volume-based calculation.
          const entriesSnap = await t.get(db.collection("cardGameEntries")
            .where("gameId", "==", gameId)
            .where("gameStartTime", "==", startTime));

          const volumes = [0, 0];
          entriesSnap.forEach(e => {
            const d = e.data();
            if (d.cardIndex !== undefined) volumes[d.cardIndex] += (d.price || 0);
          });

          finalWinnerIndex = volumes[0] <= volumes[1] ? 0 : 1;
        }

        // 2. RECORD TO HISTORY (DETERMINISTIC ID)
        if (finalWinnerIndex !== -1 && finalWinnerIndex !== undefined) {
          const historyId = `hist_${gameId}_${startTime}`;
          const historyRef = db.collection("cardGameHistory").doc(historyId);
          t.set(historyRef, {
            gameId: gameId,
            winnerIndex: finalWinnerIndex,
            winnerSelection: gameData.winnerSelection,
            price: gameData.price,
            question: gameData.question,
            startTime: gameData.startTime,
            endTime: now,
            createdAt: now
          });
        }

        // 3. ARCHIVE OR CYCLE
        if (gameData.winnerSelection === 'manual') {
          t.update(gameRef, { status: 'inactive', winnerIndex: finalWinnerIndex });
          isArchived = true;
          return;
        }

        if (!expiryLabel || !price) {
          t.delete(gameRef);
          return;
        }

        // Generate New Round
        const theme = getRandomTheme();
        const questionText = theme.questionTemplates[Math.floor(Math.random() * theme.questionTemplates.length)];

        t.update(gameRef, {
          question: `${questionText} (${expiryLabel})`,
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
          generatedBy: "Atomic_Cycle",
          expiryLabel: expiryLabel,
          isPremium: isPremium
        });

        newGameId = gameId;
      });

      // 4. AWARD REWARDS (Non-blocking outside transaction)
      if (newGameId || isArchived) {
        const gameSnap = await gameRef.get();
        const gd = gameSnap.data();
        if (gd?.winnerIndex !== -1 && gd?.winnerIndex !== undefined) {
          awardGameRewards(db, gameId, gd.winnerIndex, gd.startTime?.seconds || 0)
            .catch(err => console.error("[CYCLE] Reward Error:", err));
        }
      }

    } catch (e: any) {
      if (e.message === "GAME_NOT_FOUND") {
        recoveryNeeded = true;
      } else if (e.message === "EARLY_CYCLE_ATTEMPT") {
        return NextResponse.json({ error: "Game is not yet expired" }, { status: 400 });
      } else {
        console.error("[CYCLE] Transaction Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
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
