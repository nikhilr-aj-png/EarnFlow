
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    console.log("[Cleanup] Starting Database Cleanup...");
    let deletedGames = 0;
    let deletedEntries = 0;
    const batch = db.batch();
    let batchCount = 0;

    const now = Timestamp.now();
    const TWO_HOURS_AGO = now.seconds - (2 * 3600);

    // 1. Delete Old Expired Games (e.g., status != active OR expiry passed long ago)
    const gamesSnap = await db.collection("cardGames").get();
    const activeGameIds = new Set<string>();

    gamesSnap.docs.forEach(doc => {
      const g = doc.data();
      const expiryTime = (g.startTime?.seconds || 0) + (g.duration || 0);

      // Usage Condition: Delete if (Status is Expired) OR (Time passed > 2 hours)
      // We keep 'Active' games unless they are ridiculously old (broken state)
      if (g.status === 'expired' || (expiryTime < TWO_HOURS_AGO && g.status !== 'active')) {
        batch.delete(doc.ref);
        deletedGames++;
        batchCount++;
      } else {
        activeGameIds.add(doc.id);
      }
    });

    // 2. Delete Orphaned Entries (Bets for games that don't exist/are deleted)
    const entriesSnap = await db.collection("cardGameEntries").get();
    entriesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (!activeGameIds.has(data.gameId)) {
        batch.delete(doc.ref);
        deletedEntries++;
        batchCount++;
      }
    });

    // 3. Delete Expired Tasks (Admin & Auto Generated)
    // 3. Delete Expired Tasks (Admin & Auto Generated)
    const taskSnap = await db.collection("tasks").get();
    let deletedTasks = 0;
    const activeTaskIds = new Set<string>();

    taskSnap.docs.forEach(doc => {
      const t = doc.data();
      // If expiresAt exists AND is past, delete. 
      // If expiresAt is null/undefined, it's Permanent -> Keep it.
      if (t.expiresAt && t.expiresAt.seconds < now.seconds) {
        batch.delete(doc.ref);
        deletedTasks++;
        batchCount++;
      } else {
        activeTaskIds.add(doc.id);
      }
    });

    // 4. Delete Orphaned Task Submissions
    const subSnap = await db.collection("taskSubmissions").get();
    let deletedSubs = 0;

    subSnap.docs.forEach(doc => {
      const data = doc.data();
      if (!activeTaskIds.has(data.taskId)) {
        batch.delete(doc.ref);
        deletedSubs++;
        batchCount++;
      }
    });


    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      deletedGames,
      deletedEntries,
      deletedTasks,
      deletedTasks,
      deletedSubs,
      message: `Cleanup Complete. Deleted ${deletedGames} games, ${deletedEntries} bets, ${deletedTasks} tasks, and ${deletedSubs} submissions.`
    });

  } catch (error: any) {
    console.error("[Cleanup] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
