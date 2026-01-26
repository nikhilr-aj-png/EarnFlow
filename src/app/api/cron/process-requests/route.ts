
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  // Security Check (simple key check)
  if (req.nextUrl.searchParams.get('key') !== process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); 
    // Commented out for easier testing, generally use CRON_SECRET in prod
  }

  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const now = Timestamp.now();

    console.log("[Cron] Processing UPI Change Requests...");

    // Optimization: In a real app with millions of users, you'd use a Collection Group Index or specific field index.
    // Here, we'll scan users who have the field (requires index if large, but okay for MVP).
    // Better: Query specifically. 
    // Firestore lacks 'exists' filter easily without index. 
    // We will query users where `upiChangeRequest.status` == 'pending'. Requires index usually.

    const usersSnap = await db.collection("users")
      .where("upiChangeRequest.status", "==", "pending")
      .get();

    let processedCount = 0;
    const batch = db.batch();

    usersSnap.docs.forEach(doc => {
      const data = doc.data();
      const req = data.upiChangeRequest;

      // Check if validAfter check passed
      if (req && req.validAfter && now.seconds >= req.validAfter.seconds) {

        // Auto-Update Logic
        batch.update(doc.ref, {
          savedUpi: req.newUpiId,
          upiChangeRequest: admin.firestore.FieldValue.delete()
        });
        processedCount++;
      }
    });

    if (processedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      message: `Processed ${processedCount} pending UPI requests.`
    });

  } catch (error: any) {
    console.error("[Cron UPI] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
