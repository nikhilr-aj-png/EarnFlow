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
      // 1. Get User Data
      const userRef = db.collection("users").doc(userId);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists) throw new Error("User not found");
      const userData = userSnap.data();

      // 2. Check Balance
      if (!userData || (userData.coins || 0) < (amount * 100)) {
        throw new Error("Insufficient balance");
      }

      // 3. Deduct Coins & Save UPI
      const updateData: any = {
        coins: FieldValue.increment(-(amount * 100))
      };

      // Lock UPI if not set
      if (!userData.savedUpi && method === 'UPI') {
        updateData.savedUpi = details;
      }

      transaction.update(userRef, updateData);

      // 4. Check Auto-Withdraw Settings
      let initialStatus = "pending";
      // Note: In transaction, we can't easily read random other docs efficiently if strict, 
      // but reading settings is fine.
      const settingsRef = db.collection("settings").doc("withdrawals");
      const settingsSnap = await transaction.get(settingsRef);
      if (settingsSnap.exists && settingsSnap.data()?.mode === "auto") {
        initialStatus = "approved"; // Or handled via integration
      }

      // 5. Create Withdrawal Record
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

      return { success: true, id: withdrawalRef.id };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Withdrawal API Error:", error);
    return NextResponse.json({ error: error.message || "Request failed" }, { status: 500 });
  }
}
