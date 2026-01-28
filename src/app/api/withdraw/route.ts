import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { userId, userEmail, amount, method, details } = await req.json();

    if (!userId || !amount || !method || !details) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount < 100) {
      return NextResponse.json({ error: "Minimum withdrawal is 100" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    const result = await db.runTransaction(async (transaction) => {
      // 1. READS (Must come first)
      const userRef = db.collection("users").doc(userId);
      const settingsRef = db.collection("settings").doc("withdrawals");

      const [userSnap, settingsSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(settingsRef)
      ]);

      if (!userSnap.exists) throw new Error("User not found");
      const userData = userSnap.data();

      // 2. LOGIC CHECKS
      if (!userData || (userData.coins || 0) < (amount * 100)) {
        throw new Error("Insufficient balance");
      }

      // Determine Status
      let initialStatus = "pending";
      if (settingsSnap.exists && settingsSnap.data()?.mode === "auto") {
        initialStatus = "approved";
      }

      // 3. WRITES
      // Deduct Coins & Lock UPI
      const updateData: any = {
        coins: FieldValue.increment(-(amount * 100))
      };
      if (!userData.savedUpi && method === 'UPI') {
        updateData.savedUpi = details;
      }
      transaction.update(userRef, updateData);

      // Create Record
      const withdrawalRef = db.collection("withdrawals").doc();
      transaction.set(withdrawalRef, {
        userId,
        userEmail,
        amount,
        method,
        details,
        status: initialStatus,
        createdAt: Timestamp.now()
      });

      // Record Activity
      const activityRef = db.collection("activities").doc();
      transaction.set(activityRef, {
        userId,
        type: 'withdrawal',
        amount: amount * 100, // Show in coins
        title: "Withdrawal Requested 💸",
        metadata: { withdrawalId: withdrawalRef.id, method },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      return { success: true, id: withdrawalRef.id };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Withdrawal API Error:", error);
    return NextResponse.json({ error: error.message || "Request failed" }, { status: 500 });
  }
}
