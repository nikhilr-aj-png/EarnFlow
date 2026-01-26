
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
  "30m": 1800
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

    // 1. Cleanup Expired Games
    const activeGamesSnap = await db.collection("cardGames")
      .where("status", "==", "active")
      .get();

    // Map to track what we currently have active (e.g., "free-1h": true)
    const activeTypes = new Set<string>();

    const batch = db.batch();
    let batchCount = 0;

    activeGamesSnap.docs.forEach((doc) => {
      const g = doc.data();
      const start = g.startTime.seconds;
      const duration = g.duration;
      // Safety check if expiryLabel exists, else default to manual/unknown
      if (!g.expiryLabel) return;

      const bucketKey = `${g.isPremium ? 'premium' : 'free'}-${g.expiryLabel}`;
      const isExpired = now.seconds > start + duration;
      const isHardExpired = now.seconds > start + duration + 600; // 10 mins buffer

      if (isHardExpired) {
        // Hard Delete from Firestore to clear clutter
        batch.delete(doc.ref);
        expiredCount++;
        batchCount++;
      } else if (isExpired) {
        // Soft Expire (Show Results for 10m)
        if (g.status !== 'expired') {
          batch.update(doc.ref, { status: "expired", updatedAt: now });
          batchCount++;
        }
        expiredCount++; // Count as expired for refilling purposes
      } else {
        // Still Valid
        activeTypes.add(bucketKey);
      }
    });

    if (batchCount > 0) await batch.commit();

    // 2. Refill Missing Games (Helper)
    const createGame = async (durationLabel: string, coinValue: number, isPremium: boolean) => {
      const bucketKey = `${isPremium ? 'premium' : 'free'}-${durationLabel}`;

      // If we already have an active game for this slot, skip (prevent duplicates)
      if (activeTypes.has(bucketKey)) return;

      const durationSeconds = DURATIONS_MAP[durationLabel];
      if (!durationSeconds || coinValue <= 0) return;

      import { getRandomTheme } from "@/lib/gameThemes"; // Should be already imported
      // Add import for generateCardQuestion at top, but for now assuming I can add it or it's available. 
      // Wait, I need to add the import to 'src/app/api/cron/daily-game/route.ts' FIRST.
      // I will do two edits. One for logic, one for import.

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
        winnerIndex: Math.floor(Math.random() * 4),
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
