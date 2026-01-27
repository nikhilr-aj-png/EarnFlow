
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { getRandomTheme } from "@/lib/gameThemes";
import { generateCardQuestion } from "@/lib/gemini";

export const maxDuration = 60;

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


export async function GET(req: NextRequest) {
  // Security Check
  const authHeader = req.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    req.nextUrl.searchParams.get('key') !== process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ) {
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    console.log("[Cron] Starting Game Maintenance...");

    const settingsSnap = await db.collection("settings").doc("gameAutomation").get();
    if (!settingsSnap.exists) {
      return NextResponse.json({ skipped: true, reason: "No Settings" });
    }

    const data = settingsSnap.data()!;
    if (!data.isEnabled) {
      return NextResponse.json({ skipped: true, reason: "Disabled" });
    }

    const { free, premium } = data.settings || { free: {}, premium: {} };
    const now = Timestamp.now();
    let expiredCount = 0;
    const gamesCreated: string[] = [];  // Explicit typing

    // 1. Cleanup & Status Update
    const activeGamesSnap = await db.collection("cardGames").where("status", "==", "active").get();
    const expiredGamesSnap = await db.collection("cardGames").where("status", "==", "expired").get();

    // Map to track what we currently have (Active OR recently Expired)
    const activeTypes = new Set<string>();

    const batch = db.batch();
    let batchCount = 0;

    // Helper to process game state
    const processGame = async (docSnap: any, isActive: boolean) => {
      const g = docSnap.data();
      const start = g.startTime?.seconds || 0;
      const duration = g.duration;
      if (!g.expiryLabel) return;

      const bucketKey = `${g.isPremium ? 'premium' : 'free'}-${g.expiryLabel}`;

      // Calculate times
      const isExpired = now.seconds > start + duration;
      const isHardExpired = now.seconds > start + duration + 5; // 5s buffer (effectively next cron run)

      if (!isActive && isHardExpired) {
        // DELETE: Expired and passed buffer. Remove.
        batch.delete(docSnap.ref);
        expiredCount++;
        batchCount++;
        // Do NOT add to activeTypes -> Allows Refill!
      } else if (isActive && isExpired) {
        // EXPIRE: Status Active -> Expired.
        // Calculate Winner...
        if (g.winnerSelection === 'auto' || g.winnerIndex === -1) {
          console.log(`[Cron] Calculating Winner for ${docSnap.id}...`);
          let finalWinnerIndex = 0;
          try {
            const entriesQ = await db.collection("cardGameEntries")
              .where("gameId", "==", docSnap.id)
              .where("gameStartTime", "==", start)
              .get();

            const cardCounts = [0, 0, 0, 0];
            entriesQ.docs.forEach(e => {
              const selected = e.data().selectedCards || [];
              selected.forEach((idx: number) => { if (idx >= 0 && idx < 4) cardCounts[idx]++; });
            });

            let minVal = Infinity;
            let candidates: number[] = [];
            cardCounts.forEach((count, idx) => {
              if (count < minVal) { minVal = count; candidates = [idx]; }
              else if (count === minVal) { candidates.push(idx); }
            });
            finalWinnerIndex = candidates[Math.floor(Math.random() * candidates.length)];
          } catch (err) { console.error(err); }

          batch.update(docSnap.ref, {
            status: "expired",
            winnerIndex: finalWinnerIndex, // or val
            updatedAt: now
          });
          batchCount++;
        } else {
          batch.update(docSnap.ref, { status: "expired", updatedAt: now });
          batchCount++;
        }
        activeTypes.add(bucketKey); // Slot still occupied (by the now-expired game)
      } else {
        // Still Active or recently expired (waiting for 10m)
        activeTypes.add(bucketKey);
      }
    };

    // Process all docs
    for (const doc of activeGamesSnap.docs) await processGame(doc, true);
    for (const doc of expiredGamesSnap.docs) await processGame(doc, false);


    if (batchCount > 0) await batch.commit();

    // 2. Refill Missing Games (Helper)
    const createGame = async (durationLabel: string, coinValue: number, isPremium: boolean) => {
      const bucketKey = `${isPremium ? 'premium' : 'free'}-${durationLabel}`;

      // If we already have an active game for this slot, skip (prevent duplicates)
      if (activeTypes.has(bucketKey)) return;

      const durationSeconds = DURATIONS_MAP[durationLabel];
      if (!durationSeconds || coinValue <= 0) return;

      // Logic Block:
      const theme = getRandomTheme();
      // Try AI Generation with new Key
      let questionText = theme.questionTemplates[Math.floor(Math.random() * theme.questionTemplates.length)];

      try {
        const aiQ = await generateCardQuestion(theme.name); // Need to import this
        if (aiQ) questionText = `${aiQ}`;
      } catch (e) { }

      const gameData = {
        question: `${questionText} (${durationLabel})`,
        price: coinValue,
        duration: durationSeconds,
        winnerIndex: -1, // Pending calc
        winnerSelection: "auto", // Default for auto-gen games
        status: "active",
        isPremium,
        cardImages: theme.cards,
        startTime: now,
        createdAt: now,
        updatedAt: now,
        generatedBy: "AI_CRON_REFILL",
        expiryLabel: durationLabel,
        themeId: theme.id
      };

      const ref = await db.collection("cardGames").add(gameData);
      gamesCreated.push(ref.id);
      activeTypes.add(bucketKey); // Mark as filled
    };

    // Check Free Slots
    for (const [dur, val] of Object.entries(free)) {
      await createGame(dur, Number(val), false);
    }

    // Check Premium Slots
    for (const [dur, val] of Object.entries(premium)) {
      await createGame(dur, Number(val), true);
    }

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      created: gamesCreated.length,
      games: gamesCreated
    });

  } catch (error: any) {
    console.error("[Cron] Game Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
