import { db } from "./firebase";
import { doc, setDoc, serverTimestamp, getDocs, query, collection, where, updateDoc, increment } from "firebase/firestore";

// Helper to generate a random code
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export async function createUser(uid: string, data: { name: string; email: string; referredBy?: string }) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDocs(query(collection(db, "users"), where("uid", "==", uid))); // Check via query or direct doc get

    // Better: Direct doc check
    const existingDoc = await import("firebase/firestore").then(mod => mod.getDoc(userRef));

    if (existingDoc.exists()) {
      return; // User already exists, do not overwrite
    }

    const myReferralCode = generateCode();

    // 1. Create the new user
    await setDoc(userRef, {
      uid,
      name: data.name,
      email: data.email,
      referralCode: myReferralCode,
      referredBy: data.referredBy || null,
      isPremium: false,
      coins: 0,
      totalEarned: 0,
      isVerified: false,
      status: "active",
      createdAt: serverTimestamp(),
    });


    // 2. Reward the referrer if exists
    if (data.referredBy) {
      console.log(`[REFERRAL] Processing join bonus for referrer code: ${data.referredBy}`);
      const q = query(collection(db, "users"), where("referralCode", "==", data.referredBy));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const referrerDoc = snap.docs[0];
        const referrerData = referrerDoc.data();
        const isPremium = referrerData.isPremium === true;

        // Tiered Reward: 1000 for Premium, 500 for Free
        const bonusAmount = isPremium ? 1000 : 500;

        await updateDoc(referrerDoc.ref, {
          coins: increment(bonusAmount),
          totalEarned: increment(bonusAmount),
          updatedAt: serverTimestamp()
        });

        // Record Activity for Referrer
        const activityRef = doc(collection(db, "activities"));
        await setDoc(activityRef, {
          userId: referrerDoc.id,
          type: 'referral_bonus',
          amount: bonusAmount,
          title: "Referral Bonus 🎁",
          metadata: {
            joinedUser: data.name,
            joinedUid: uid,
            type: 'registration'
          },
          createdAt: serverTimestamp()
        });
        console.log(`[REFERRAL] Success: Awarded ${bonusAmount} to ${referrerDoc.id}`);
      } else {
        console.warn(`[REFERRAL] Referrer not found for code: ${data.referredBy}`);
      }
    }
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}
