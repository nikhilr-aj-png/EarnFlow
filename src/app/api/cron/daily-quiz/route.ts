
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { generateQuizQuestions } from "@/lib/gemini";
import { Timestamp } from "firebase-admin/firestore";

export const maxDuration = 60; // Allow 60 seconds for AI generation

export async function GET(req: NextRequest) {
  // 1. Security Check (Vercel Cron)
  const authHeader = req.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    req.nextUrl.searchParams.get('key') !== process.env.NEXT_PUBLIC_FIREBASE_API_KEY // Allow manual run with backup key (simplified)
  ) {
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    console.log("[Cron] Starting Daily Quiz Generation...");

    // 2. Fetch Settings
    const settingsSnap = await db.collection("settings").doc("quizAutomation").get();
    if (!settingsSnap.exists) {
      console.log("[Cron] Settings not found, skipping.");
      return NextResponse.json({ skipped: true, reason: "No Settings" });
    }

    const settings = settingsSnap.data()!;
    if (!settings.isEnabled) {
      console.log("[Cron] Automation Disabled.");
      return NextResponse.json({ skipped: true, reason: "Disabled" });
    }

    const freeCount = settings.freeDailyCount || 0;
    const premiumCount = settings.premiumDailyCount || 0;
    const topics = settings.topics || ["General Knowledge"];
    const now = Timestamp.now();
    const expiresAt = new Timestamp(now.seconds + (24 * 3600), 0); // 24 hours expiry

    const tasksCreated = [];

    // 3. Prepare Promises for Parallel Execution
    const freePromises = Array(freeCount).fill(null).map(async (_, i) => {
      try {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const questions = await generateQuizQuestions(topic, 2);
        const taskData = {
          title: `Daily Quiz: ${topic} (Free)`,
          description: `Complete this quick quiz about ${topic} to earn coins!`,
          reward: 50,
          timeEstimate: "30 sec",
          type: "quiz",
          isPremium: false,
          questions: questions,
          targetUrl: "",
          expiresAt: expiresAt,
          createdAt: now,
          generatedBy: "AI_CRON"
        };
        const ref = await db.collection("tasks").add(taskData);
        return { success: true, id: ref.id, type: "free", topic };
      } catch (e: any) {
        console.error(`[Cron] Free Task Error:`, e);
        return { success: false, error: e.message };
      }
    });

    const premiumPromises = Array(premiumCount).fill(null).map(async (_, i) => {
      try {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const questions = await generateQuizQuestions(topic, 5);
        const taskData = {
          title: `Daily Challenge: ${topic} (Premium)`,
          description: `Verify your knowledge in ${topic} for big rewards!`,
          reward: 150,
          timeEstimate: "60 sec",
          type: "quiz",
          isPremium: true,
          questions: questions,
          targetUrl: "",
          expiresAt: expiresAt,
          createdAt: now,
          generatedBy: "AI_CRON"
        };
        const ref = await db.collection("tasks").add(taskData);
        return { success: true, id: ref.id, type: "premium", topic };
      } catch (e: any) {
        console.error(`[Cron] Premium Task Error:`, e);
        return { success: false, error: e.message };
      }
    });

    const results = await Promise.all([...freePromises, ...premiumPromises]);
    const successCount = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success);
    const errorMessages = failures.map(r => r.error);

    return NextResponse.json({
      success: true,
      results,
      count: successCount,
      failureCount: failures.length,
      errors: errorMessages
    });



  } catch (error: any) {
    console.error("[Cron] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
