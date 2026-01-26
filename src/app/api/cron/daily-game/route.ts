
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop"
];

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

    console.log("[Cron] Starting Daily Game Generation...");

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
    const gamesCreated = [];

    // Helper to create game
    const createGame = async (durationLabel: string, coinValue: number, isPremium: boolean) => {
      const durationSeconds = DURATIONS_MAP[durationLabel];
      if (!durationSeconds || coinValue <= 0) return;

      const gameData = {
        question: `Lucky Winner (${durationLabel})`,
        price: coinValue, // Using 'price' to store the reward/value as per existing model
        duration: durationSeconds,
        winnerIndex: Math.floor(Math.random() * 4),
        status: "active",
        isPremium,
        cardImages: DEFAULT_IMAGES,
        startTime: now, // Start immediately
        createdAt: now,
        updatedAt: now,
        generatedBy: "AI_CRON",
        expiryLabel: durationLabel
      };

      const ref = await db.collection("cardGames").add(gameData);
      gamesCreated.push(ref.id);
    };

    // Generate Free Games
    for (const [dur, val] of Object.entries(free)) {
      await createGame(dur, Number(val), false);
    }

    // Generate Premium Games
    for (const [dur, val] of Object.entries(premium)) {
      await createGame(dur, Number(val), true);
    }

    return NextResponse.json({
      success: true,
      count: gamesCreated.length,
      games: gamesCreated
    });

  } catch (error: any) {
    console.error("[Cron] Game Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
