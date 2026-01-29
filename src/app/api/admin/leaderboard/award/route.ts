import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const now = Timestamp.now();

    // 1. Fetch Admin Settings
    const settingsSnap = await db.collection("settings").doc("hallOfFame").get();
    const settings = settingsSnap.exists ? settingsSnap.data()! : {
      rank1Reward: 1000,
      rank2Reward: 500,
      rank3Reward: 250,
      awardMode: "manual"
    };

    // 2. Fetch Current Leaderboard Data (Top 3)
    // Using the same logic as the leaderboard API to ensure consistency
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startTimestamp = Timestamp.fromDate(sevenDaysAgo);

    const earningTypes = ['game_win', 'task', 'referral_bonus', 'referral_commission'];

    let activitiesSnap = await db.collection("activities")
      .where("createdAt", ">=", startTimestamp)
      .get();

    if (activitiesSnap.empty) {
      activitiesSnap = await db.collection("activities").limit(500).get();
    }

    const earningsMap: Record<string, number> = {};
    activitiesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (!earningTypes.includes(data.type)) return;
      const userId = data.userId;
      const amount = Number(data.amount || 0);
      if (userId) earningsMap[userId] = (earningsMap[userId] || 0) + amount;
    });

    const sortedUserIds = Object.keys(earningsMap)
      .sort((a, b) => (earningsMap[b] - earningsMap[a]) || a.localeCompare(b))
      .slice(0, 3);

    if (sortedUserIds.length === 0) {
      return NextResponse.json({ success: false, message: "No users found on leaderboard" });
    }

    // 3. Process Rewards in a Transaction
    const results: any[] = [];

    await db.runTransaction(async (t) => {
      for (let i = 0; i < sortedUserIds.length; i++) {
        const userId = sortedUserIds[i];
        const rank = i + 1;
        const rewardAmount = rank === 1 ? settings.rank1Reward : rank === 2 ? settings.rank2Reward : settings.rank3Reward;

        if (rewardAmount <= 0) continue;

        const userRef = db.collection("users").doc(userId);
        const userSnap = await t.get(userRef);

        if (userSnap.exists) {
          const currentCoins = userSnap.data()?.coins || 0;
          t.update(userRef, {
            coins: currentCoins + rewardAmount,
            updatedAt: now
          });

          // Create Activity Record
          const activityId = `leaderboard_prize_${userId}_${now.seconds}`;
          const activityRef = db.collection("activities").doc(activityId);
          t.set(activityRef, {
            userId,
            type: "leaderboard_prize",
            amount: rewardAmount,
            title: `Leaderboard Rank #${rank} Prize`,
            description: `Congratulations! You placed #${rank} in the Hall of Fame.`,
            createdAt: now,
            status: "completed"
          });

          results.push({ userId, rank, rewardAmount });
        }
      }

      // Update last awarded timestamp in settings
      t.update(db.collection("settings").doc("hallOfFame"), {
        lastAwardedAt: now,
        lastAwardCount: results.length
      });
    });

    return NextResponse.json({
      success: true,
      awarded: results,
      timestamp: now.toMillis()
    });

  } catch (error: any) {
    console.error("Leaderboard Award Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
