import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    // 1. Calculate the timestamp for 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startTimestamp = Timestamp.fromDate(sevenDaysAgo);

    // 2. Define earning types
    const earningTypes = ['game_win', 'task', 'referral_bonus', 'referral_commission'];

    // 3. Query activities within the last 7 days
    let activitiesSnap = await db.collection("activities")
      .where("createdAt", ">=", startTimestamp)
      .get();

    console.log(`[LEADERBOARD] Found ${activitiesSnap.size} activities in last 7 days.`);

    // Fallback: If no activity in 7 days, try to fetch at least some data for a better UX
    if (activitiesSnap.empty) {
      console.log(`[LEADERBOARD] 7-day list is empty, falling back to all-time.`);
      activitiesSnap = await db.collection("activities").limit(500).get();
    }

    // 4. Aggregate earnings by userId (Filter types in memory)
    const earningsMap: Record<string, number> = {};
    activitiesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (!earningTypes.includes(data.type)) return; // Skip non-earning activities

      const userId = data.userId;
      const amount = Number(data.amount || 0);
      if (userId) {
        earningsMap[userId] = (earningsMap[userId] || 0) + amount;
      }
    });

    // 5. Sort by earnings and take top 20 (Stable sort: secondary sort by userId)
    const sortedUserIds = Object.keys(earningsMap)
      .sort((a, b) => {
        if (earningsMap[b] !== earningsMap[a]) {
          return earningsMap[b] - earningsMap[a];
        }
        return a.localeCompare(b); // Alphabetical fallback for ties
      })
      .slice(0, 20);

    // 6. Fetch user details for the top earners
    const leaderboard = await Promise.all(sortedUserIds.map(async (userId, index) => {
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();
      return {
        rank: index + 1,
        userId: userId,
        name: userData?.name || "Anonymous",
        coins: earningsMap[userId],
        isPremium: userData?.isPremium || false
      };
    }));

    return NextResponse.json({ leaderboard });

  } catch (error: any) {
    console.error("Leaderboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
