import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { userId, taskId, reward } = await req.json();

    if (!userId || !taskId || reward === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    const result = await db.runTransaction(async (transaction: any) => {
      // 1. Check if already completed
      const submissionRef = db.collection("taskSubmissions")
        .where("userId", "==", userId)
        .where("taskId", "==", taskId)
        .limit(1);

      const submissionSnap = await transaction.get(submissionRef);
      if (!submissionSnap.empty) {
        throw new Error("Task already completed");
      }

      // 2. References
      const userRef = db.collection("users").doc(userId);
      const newSubmissionRef = db.collection("taskSubmissions").doc();

      // 3. Update User Balance (STRICT CASTING)
      const rewardNum = Number(reward);
      transaction.update(userRef, {
        coins: admin.firestore.FieldValue.increment(rewardNum),
        totalEarned: admin.firestore.FieldValue.increment(rewardNum),
        taskEarnings: admin.firestore.FieldValue.increment(rewardNum)
      });

      // 4. Create Submission Record
      transaction.set(newSubmissionRef, {
        userId,
        taskId,
        earnedCoins: rewardNum,
        status: "approved",
        completedAt: admin.firestore.Timestamp.now(),
      });

      // 5. Record Activity (Unified History)
      const activityRef = db.collection("activities").doc();
      transaction.set(activityRef, {
        userId,
        type: 'task',
        amount: rewardNum,
        title: "Task Completed ✅",
        metadata: { taskId },
        createdAt: admin.firestore.Timestamp.now()
      });

      console.log(`[TASK] Success for User ${userId}, Task ${taskId}, Earned: ${rewardNum}`);
      return { success: true, newCoins: rewardNum };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    if (error.message === "Task already completed") {
      return NextResponse.json({ error: "Task already completed" }, { status: 400 });
    }
    console.error("Task Completion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
