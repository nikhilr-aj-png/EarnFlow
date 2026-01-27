import { Firestore, Timestamp, FieldValue } from "firebase-admin/firestore";

export type ActivityType = 'task' | 'game_win' | 'referral' | 'deposit' | 'withdrawal';

export async function recordActivity(
  db: Firestore,
  userId: string,
  type: ActivityType,
  amount: number,
  title: string,
  metadata: any = {}
) {
  try {
    const activityRef = db.collection("activities").doc();
    await activityRef.set({
      userId,
      type,
      amount,
      title,
      metadata,
      createdAt: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error("Error recording activity:", error);
    return false;
  }
}
