
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    console.log("[Admin] Batch Deletion: Fetching all tasks...");

    // 1. Fetch all documents from 'tasks' collection
    const snapshot = await db.collection("tasks").select().get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No tasks found to delete.",
        count: 0
      });
    }

    // 2. Perform Batch Deletion
    const batchSize = 500; // Firestore batch limit
    const totalDocs = snapshot.docs.length;
    let deletedCount = 0;

    for (let i = 0; i < totalDocs; i += batchSize) {
      const batch = db.batch();
      const chunk = snapshot.docs.slice(i, i + batchSize);

      chunk.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += chunk.length;
      console.log(`[Admin] Deleted batch: ${deletedCount}/${totalDocs}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} tasks.`,
      count: deletedCount
    });

  } catch (error: any) {
    console.error("[Admin Delete All] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
