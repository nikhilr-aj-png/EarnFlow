import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  // 1. Security Check
  const authHeader = req.headers.get('authorization');
  const queryKey = req.nextUrl.searchParams.get('key');

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

    // 1. Check if Award Mode is set to 'auto'
    const settingsSnap = await db.collection("settings").doc("hallOfFame").get();
    if (!settingsSnap.exists || settingsSnap.data()?.awardMode !== "auto") {
      return NextResponse.json({ success: true, message: "Skipping auto-award: Manual mode active" });
    }

    // 2. Trigger the Awarding Internal API
    // We can't use 'fetch' to our own absolute URL reliably on all environments, 
    // so we reuse the logic here or call it via a internal function.
    // To keep it simple and DRY, we'll re-implement the internal trigger logic.

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const awardRes = await fetch(`${baseUrl}/api/admin/leaderboard/award`, {
      method: "POST",
      headers: {
        "x-cron-secret": process.env.CRON_SECRET || "internal_secret" // Optional security
      }
    });

    const result = await awardRes.json();
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("Cron Leaderboard Prize Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
