
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

    // 3. Generate Free Tasks
    for (let i = 0; i < freeCount; i++) {
      try {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const questions = await generateQuizQuestions(topic, 2); // 2 Questions for Free

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
        tasksCreated.push({ id: ref.id, type: "free", topic });
        console.log(`[Cron] Created Free Task: ${ref.id}`);
      } catch (e: any) {
        console.error(`[Cron] Failed to create free task ${i}:`, e);
      }
    }

    // 4. Generate Premium Tasks
    for (let i = 0; i < premiumCount; i++) {
      try {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const questions = await generateQuizQuestions(topic, 5); // 5 Questions for Premium

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
        tasksCreated.push({ id: ref.id, type: "premium", topic });
        console.log(`[Cron] Created Premium Task: ${ref.id}`);
      } catch (e: any) {
        console.error(`[Cron] Failed to create premium task ${i}:`, e);
      }
    }

    return NextResponse.json({ success: true, results: tasksCreated });

  } catch (error: any) {
    console.error("[Cron] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
