import { Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as admin from 'firebase-admin';

/**
 * Awards a tiered commission (5% or 20%) to the referrer when a user earns coins.
 */
export async function awardReferralCommission(
  db: Firestore,
  userId: string,
  earnedAmount: number,
  sourceTitle: string
) {
  try {
    // 1. Get the user to find who referred them
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const referredBy = userData?.referredBy;
    if (!referredBy) return;

    // 2. Find the referrer by their referralCode
    const referrerQ = await db.collection("users").where("referralCode", "==", referredBy).limit(1).get();
    if (referrerQ.empty) return;

    const referrerDoc = referrerQ.docs[0];
    const referrerData = referrerDoc.data();
    const isPremium = referrerData.isPremium === true;

    // 3. Calculate Commission (5% Free, 20% Premium)
    const rate = isPremium ? 0.20 : 0.05;
    const commissionAmount = Math.floor(earnedAmount * rate);

    if (commissionAmount <= 0) return;

    // 4. Award Commission
    const batch = db.batch();

    batch.update(referrerDoc.ref, {
      coins: admin.firestore.FieldValue.increment(commissionAmount),
      totalEarned: admin.firestore.FieldValue.increment(commissionAmount),
      updatedAt: Timestamp.now()
    });

    // 5. Record Activity for Referrer
    const activityRef = db.collection("activities").doc();
    batch.set(activityRef, {
      userId: referrerDoc.id,
      type: 'referral_commission',
      amount: commissionAmount,
      title: `Referral Commission (${Math.round(rate * 100)}%) 💸`,
      metadata: {
        fromUser: userData?.name || "Friend",
        source: sourceTitle,
        originalEarned: earnedAmount
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    await batch.commit();
    console.log(`[REFERRAL] Awarded ${commissionAmount} (${rate * 100}%) to ${referrerDoc.id} from ${userId}`);

  } catch (error) {
    console.error("Error awarding referral commission:", error);
  }
}
